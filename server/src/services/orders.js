import crypto from "node:crypto";
import { commerce } from "../commerce.config.js";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { availableGateways, GATEWAYS } from "../integrations/payments/index.js";

// Statuses that count as a sale (money received or cash on delivery still to come).
export const SALE_STATUSES = ["pending", "accepted", "shipped", "delivered"];

const NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export async function generateOrderNumber() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const bytes = crypto.randomBytes(6);
    const number = `AZ-${[...bytes].map((b) => NUMBER_ALPHABET[b % NUMBER_ALPHABET.length]).join("")}`;
    if (!(await Order.exists({ number }))) return number;
  }
  throw new Error("Could not allocate an order number.");
}

export const newAccessKey = () => crypto.randomBytes(24).toString("hex");

export function keyMatches(order, key) {
  const a = Buffer.from(String(order.accessKey ?? ""));
  const b = Buffer.from(String(key ?? ""));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** The site's public origin, for payment return links. */
export function siteOrigin(req) {
  if (commerce.store.siteUrl) return commerce.store.siteUrl.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

export function addEvent(order, status, note = "", by = "system") {
  order.history.push({ at: new Date(), status, note, by });
}

/** What the customer's order page and tracking lookup may show. */
export function publicOrderView(order) {
  const shipped = Boolean(order.shipment?.awb) && ["accepted", "shipped", "delivered", "returned"].includes(order.status);
  return {
    number: order.number,
    status: order.status,
    createdAt: order.createdAt,
    customer: order.customer,
    address: order.address,
    lines: order.lines.map(({ productId, slug, name, image, sizeId, sizeLabel, qty, unit, total }) => ({
      productId,
      slug,
      name,
      image,
      sizeId,
      sizeLabel,
      qty,
      unit,
      total,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    couponCode: order.couponCode,
    tax: order.tax,
    shipping: order.shipping,
    codFee: order.codFee,
    total: order.total,
    payment: { method: order.payment.method, status: order.payment.status, paidAt: order.payment.paidAt },
    shipment: shipped
      ? { courierName: order.shipment.courierName, awb: order.shipment.awb, trackingUrl: order.shipment.trackingUrl }
      : null,
    cancelReason: order.status === "cancelled" ? order.cancelReason : "",
    timeline: order.history.filter((e) => e.status).map(({ at, status }) => ({ at, status })),
  };
}

/** Records a payment exactly once (webhook and browser redirect can both arrive). */
export async function markPaid(order, { paymentId, amount, by }) {
  if (order.payment.status === "paid") return order;
  if (Math.abs(Number(amount) - order.total) > 0.01) {
    addEvent(order, "", `Payment amount ₹${amount} did not match the order total ₹${order.total} — left unpaid for review.`, by);
    await order.save();
    return order;
  }
  order.payment.status = "paid";
  order.payment.paymentId = paymentId || order.payment.paymentId;
  order.payment.paidAt = new Date();
  order.status = "pending";
  addEvent(order, "pending", `Payment received via ${GATEWAYS[order.payment.method]?.label ?? order.payment.method}.`, by);
  await order.save();
  if (order.couponCode) await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: 1 } });
  return order;
}

/** Asks the gateway for the payment state of an order still awaiting payment. */
export async function syncPayment(order, by = "system") {
  const gateway = GATEWAYS[order.payment.method];
  if (!gateway || !order.payment.gatewayOrderId || order.payment.status === "paid") return order;
  const result = await gateway.fetchStatus(order.payment.gatewayOrderId);
  if (result.paid) return markPaid(order, { paymentId: result.paymentId, amount: result.amount, by });
  if (result.failed && order.status === "awaiting_payment") {
    order.status = "payment_failed";
    order.payment.status = "failed";
    addEvent(order, "payment_failed", "The payment was not completed.", by);
    await order.save();
  }
  return order;
}

/**
 * Opens a payment with the first gateway that works (Cashfree, then Razorpay by default).
 * Returns the data the browser needs to show that gateway's checkout.
 */
export async function startPayment(order, req) {
  const gateways = availableGateways();
  if (gateways.length === 0) {
    const err = new Error("Online payment isn't available right now. Please choose cash on delivery.");
    err.status = 503;
    throw err;
  }
  const origin = siteOrigin(req);
  const accessKey = order.accessKey;
  let lastError = null;
  for (const gateway of gateways) {
    try {
      const { gatewayOrderId, client } = await gateway.createPayment(order, {
        returnUrl: `${origin}/order/${order.number}?key=${accessKey}&return=${gateway.id}`,
        notifyUrl: `${origin}${commerce.payments[gateway.id].webhookPath}`,
      });
      order.payment.method = gateway.id;
      order.payment.gatewayOrderId = gatewayOrderId;
      order.payment.status = "unpaid";
      if (order.status === "payment_failed") order.status = "awaiting_payment";
      await order.save();
      return client;
    } catch (err) {
      console.error(`Payment start failed with ${gateway.label}:`, err.message);
      lastError = err;
    }
  }
  const err = new Error("We couldn't start the payment. Please try again in a moment.");
  err.status = 502;
  err.cause = lastError;
  throw err;
}
