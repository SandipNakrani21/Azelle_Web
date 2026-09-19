import mongoose from "mongoose";
import { Router } from "express";
import { commerce } from "../commerce.config.js";
import { Order, ORDER_STATUSES } from "../models/Order.js";
import { GATEWAYS } from "../integrations/payments/index.js";
import { defaultParcel, parseParcel, SHIPPERS } from "../integrations/shipping/index.js";
import { addEvent, syncPayment } from "../services/orders.js";

export const adminOrdersRouter = Router();

const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const httpError = (status, message) => Object.assign(new Error(message), { status });

/** Shipping partners the admin can pick when accepting an order. */
function partnerChoices() {
  const partners = ["shiprocket", "delhivery"].map((id) => ({
    id,
    label: commerce.shipping[id].label,
    configured: SHIPPERS[id].isConfigured(),
  }));
  return [...partners, { id: "manual", label: commerce.shipping.manual.label, configured: true }];
}

async function loadOrder(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "Order not found.");
  const order = await Order.findById(req.params.id);
  if (!order) throw httpError(404, "Order not found.");
  return order;
}

const by = (req) => req.admin.email;

// ── List ────────────────────────────────────────────────────────────────────
adminOrdersRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 20));
    const filter = {};
    const status = text(req.query.status, 30);
    if (ORDER_STATUSES.includes(status)) filter.status = status;
    const payment = text(req.query.payment, 20);
    if (payment === "cod") filter["payment.method"] = "cod";
    if (payment === "online") filter["payment.method"] = { $in: ["cashfree", "razorpay"] };
    const q = text(req.query.q, 80);
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ number: rx }, { "customer.name": rx }, { "customer.email": rx }, { "customer.phone": rx }, { "shipment.awb": rx }];
    }
    const email = text(req.query.email, 120).toLowerCase();
    if (email) filter["customer.email"] = email;

    const [orders, total, counts] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(filter),
      Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);
    res.json({
      orders,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    });
  } catch (err) {
    next(err);
  }
});

// ── Detail ──────────────────────────────────────────────────────────────────
adminOrdersRouter.get("/:id", async (req, res, next) => {
  try {
    const order = await loadOrder(req);
    res.json({
      order,
      partners: partnerChoices(),
      defaultPartner: commerce.shipping.defaultPartner,
      defaultParcel: defaultParcel(order),
    });
  } catch (err) {
    next(err);
  }
});

// Couriers and rates from each configured partner, so the admin can choose before accepting.
adminOrdersRouter.post("/:id/shipping-options", async (req, res, next) => {
  try {
    const order = await loadOrder(req);
    const parcel = parseParcel(req.body?.parcel, order);
    const results = await Promise.all(
      ["shiprocket", "delhivery"].map(async (id) => {
        const shipper = SHIPPERS[id];
        if (!shipper.isConfigured()) return { partner: id, configured: false, serviceable: false, couriers: [], message: "Not configured." };
        try {
          return { partner: id, configured: true, ...(await shipper.options(order, parcel)) };
        } catch (err) {
          return { partner: id, configured: true, serviceable: false, couriers: [], message: err.message };
        }
      }),
    );
    res.json({ parcel, options: results });
  } catch (err) {
    next(err);
  }
});

// ── Accept: book the shipment with the chosen partner ───────────────────────
adminOrdersRouter.post("/:id/accept", async (req, res, next) => {
  try {
    const order = await loadOrder(req);
    if (order.status !== "pending") throw httpError(409, "Only pending orders can be accepted.");
    const partner = text(req.body?.partner, 20);
    const parcel = parseParcel(req.body?.parcel, order);

    let shipment;
    if (partner === "manual") {
      const courierName = text(req.body?.manual?.courierName, 60);
      const awb = text(req.body?.manual?.awb, 40);
      if (!courierName) throw httpError(400, "Enter the courier name.");
      shipment = { courierName, awb, trackingUrl: text(req.body?.manual?.trackingUrl, 300), partnerOrderId: "", partnerShipmentId: "", labelUrl: "" };
    } else {
      const shipper = SHIPPERS[partner];
      if (!shipper) throw httpError(400, "Choose a shipping partner.");
      if (!shipper.isConfigured()) throw httpError(400, `${shipper.label} isn't configured yet — add its keys or choose Manual.`);
      shipment = await shipper.createShipment(order, { parcel, courierId: text(req.body?.courierId, 20) });
    }

    order.shipment = { ...shipment, partner, weightKg: parcel.weightKg, lastStatus: "", lastSyncedAt: null };
    order.status = "accepted";
    order.acceptedAt = new Date();
    const label = partner === "manual" ? shipment.courierName : commerce.shipping[partner].label;
    addEvent(order, "accepted", `Accepted — shipping with ${label}${shipment.awb ? ` (AWB ${shipment.awb})` : ""}.`, by(req));
    await order.save();
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// ── Manual status changes ───────────────────────────────────────────────────
const NEXT_STATUS = {
  accepted: ["shipped", "delivered", "returned"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
};

adminOrdersRouter.post("/:id/status", async (req, res, next) => {
  try {
    const order = await loadOrder(req);
    const status = text(req.body?.status, 20);
    if (!(NEXT_STATUS[order.status] ?? []).includes(status)) throw httpError(409, `An order that is ${order.status} can't be marked ${status}.`);
    if (status === "shipped" && !order.shipment.awb) {
      const awb = text(req.body?.awb, 40);
      if (!awb) throw httpError(400, "Enter the AWB / tracking number before marking the order shipped.");
      order.shipment.awb = awb;
    }
    order.status = status;
    if (status === "shipped") order.shippedAt = new Date();
    if (status === "delivered") {
      order.deliveredAt = new Date();
      if (order.payment.method === "cod") order.payment.status = "cod_collected";
    }
    addEvent(order, status, text(req.body?.note, 300), by(req));
    await order.save();
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// Pull the latest tracking status from the shipping partner.
adminOrdersRouter.post("/:id/track", async (req, res, next) => {
  try {
    const order = await loadOrder(req);
    const shipper = SHIPPERS[order.shipment.partner];
    if (!shipper || !order.shipment.awb) throw httpError(409, "This order has no partner shipment to track.");
    const result = await shipper.track(order);
    order.shipment.lastStatus = result.text;
    order.shipment.lastSyncedAt = new Date();
    // Only move forward (accepted → shipped → delivered / returned).
    const rank = { accepted: 0, shipped: 1, delivered: 2, returned: 3 };
    if (result.status && order.status in rank && rank[result.status] > rank[order.status]) {
      order.status = result.status;
      if (result.status === "shipped") order.shippedAt ??= new Date();
      if (result.status === "delivered") {
        order.deliveredAt = new Date();
        if (order.payment.method === "cod") order.payment.status = "cod_collected";
      }
      addEvent(order, result.status, `Tracking update: ${result.text}`, shipper.label);
    }
    await order.save();
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// Re-check an online payment with the gateway.
adminOrdersRouter.post("/:id/sync-payment", async (req, res, next) => {
  try {
    const order = await syncPayment(await loadOrder(req), by(req));
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// ── Cancel (optionally refunding an online payment) ─────────────────────────
adminOrdersRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const order = await loadOrder(req);
    if (["cancelled", "delivered", "returned"].includes(order.status)) throw httpError(409, `A ${order.status} order can't be cancelled.`);
    const reason = text(req.body?.reason, 300);
    if (!reason) throw httpError(400, "Give a reason — the customer sees it on their order page.");

    const warnings = [];
    const shipper = SHIPPERS[order.shipment.partner];
    if (shipper && order.shipment.awb) {
      try {
        await shipper.cancel(order);
      } catch (err) {
        warnings.push(`The ${shipper.label} shipment could not be cancelled automatically (${err.message}). Cancel it in their dashboard.`);
      }
    }

    if (req.body?.refund && order.payment.status === "paid") {
      const gateway = GATEWAYS[order.payment.method];
      order.payment.refundId = await gateway.refund(order, reason);
      order.payment.status = "refunded";
      order.payment.refundedAt = new Date();
      addEvent(order, "", `Refund of ₹${order.total} started via ${gateway.label}.`, by(req));
    }

    order.status = "cancelled";
    order.cancelReason = reason;
    addEvent(order, "cancelled", reason, by(req));
    await order.save();
    res.json({ order, warnings });
  } catch (err) {
    next(err);
  }
});

// Refund a paid online order after cancellation or return.
adminOrdersRouter.post("/:id/refund", async (req, res, next) => {
  try {
    const order = await loadOrder(req);
    if (order.payment.status !== "paid") throw httpError(409, "Only paid online orders can be refunded.");
    if (!["cancelled", "returned"].includes(order.status)) throw httpError(409, "Cancel the order (or mark it returned) before refunding.");
    const gateway = GATEWAYS[order.payment.method];
    order.payment.refundId = await gateway.refund(order, text(req.body?.note, 100));
    order.payment.status = "refunded";
    order.payment.refundedAt = new Date();
    addEvent(order, "", `Refund of ₹${order.total} started via ${gateway.label}.`, by(req));
    await order.save();
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

adminOrdersRouter.put("/:id/note", async (req, res, next) => {
  try {
    const order = await loadOrder(req);
    order.adminNote = text(req.body?.note, 1000);
    await order.save();
    res.json({ order });
  } catch (err) {
    next(err);
  }
});
