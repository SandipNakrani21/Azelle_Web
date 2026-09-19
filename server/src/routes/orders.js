import { Router } from "express";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { availableGateways, codAllowed, GATEWAYS } from "../integrations/payments/index.js";
import { commerce } from "../commerce.config.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { quoteOrder } from "../services/pricing.js";
import {
  addEvent,
  generateOrderNumber,
  keyMatches,
  newAccessKey,
  publicOrderView,
  startPayment,
  syncPayment,
} from "../services/orders.js";

export const ordersRouter = Router();

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const MOBILE = /^[6-9]\d{9}$/;
const PINCODE = /^[1-9]\d{5}$/;
const text = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

function parseCheckout(body = {}) {
  const errors = {};
  const customer = {
    name: text(body.customer?.name, 80),
    email: text(body.customer?.email, 120).toLowerCase(),
    phone: text(body.customer?.phone, 20).replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""),
  };
  const address = {
    line1: text(body.address?.line1, 160),
    line2: text(body.address?.line2, 160),
    city: text(body.address?.city, 60),
    state: text(body.address?.state, 60),
    pincode: text(body.address?.pincode, 10),
    country: "India",
  };
  if (customer.name.length < 2) errors.name = "Enter your full name.";
  if (!EMAIL.test(customer.email)) errors.email = "Enter a valid email address.";
  if (!MOBILE.test(customer.phone)) errors.phone = "Enter a 10-digit Indian mobile number.";
  if (address.line1.length < 3) errors.line1 = "Enter your street address.";
  if (!address.city) errors.city = "Enter your city.";
  if (!address.state) errors.state = "Choose your state.";
  if (!PINCODE.test(address.pincode)) errors.pincode = "Enter a 6-digit PIN code.";
  const paymentMethod = body.paymentMethod === "cod" ? "cod" : "online";
  return { errors, customer, address, paymentMethod };
}

const createLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: "Too many orders from this connection. Please try again shortly." });
const lookupLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many lookups. Please try again in a few minutes." });

// Place an order. Online orders start as "awaiting_payment"; cash on delivery goes straight to "pending".
ordersRouter.post("/", createLimit, async (req, res, next) => {
  try {
    const { errors, customer, address, paymentMethod } = parseCheckout(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: "Please check the highlighted fields.", fields: errors });

    const quote = await quoteOrder({ items: req.body?.items, couponCode: req.body?.couponCode, paymentMethod });

    if (paymentMethod === "cod") {
      if (!commerce.payments.cod.enabled) return res.status(400).json({ error: "Cash on delivery isn't available." });
      if (!codAllowed(quote.total)) {
        return res.status(400).json({ error: `Cash on delivery is available on orders up to ₹${commerce.payments.cod.maxOrderValue}. Please pay online.` });
      }
    } else if (availableGateways().length === 0) {
      return res.status(503).json({ error: "Online payment isn't available right now. Please choose cash on delivery." });
    }

    const order = new Order({
      number: await generateOrderNumber(),
      accessKey: newAccessKey(),
      customer,
      address,
      ...quote,
      status: paymentMethod === "cod" ? "pending" : "awaiting_payment",
      payment: paymentMethod === "cod" ? { method: "cod", status: "cod_pending" } : { method: availableGateways()[0].id, status: "unpaid" },
    });
    addEvent(order, order.status, paymentMethod === "cod" ? "Order placed — cash on delivery." : "Order placed — awaiting online payment.", "customer");
    await order.save();
    if (paymentMethod === "cod" && order.couponCode) await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: 1 } });

    // Online: open the payment now. If no gateway answers, the order page offers "Pay now" again.
    let payment = null;
    let paymentError = "";
    if (paymentMethod === "online") {
      try {
        payment = await startPayment(order, req);
      } catch (err) {
        paymentError = err.message;
      }
    }

    res.status(201).json({ order: publicOrderView(order), accessKey: order.accessKey, payment, paymentError });
  } catch (err) {
    next(err);
  }
});

// Finds an order for the tracking page by number + the email (or mobile) used at checkout.
ordersRouter.post("/lookup", lookupLimit, async (req, res, next) => {
  try {
    const number = text(req.body?.number, 20).toUpperCase();
    const contact = text(req.body?.contact, 120).toLowerCase();
    const phone = contact.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    const order = number ? await Order.findOne({ number }).select("+accessKey") : null;
    const matches = order && (order.customer.email === contact || (MOBILE.test(phone) && order.customer.phone === phone));
    if (!matches) return res.status(404).json({ error: "We couldn't find an order with those details. Check the order number and the email or mobile used at checkout." });
    res.json({ order: publicOrderView(order), accessKey: order.accessKey });
  } catch (err) {
    next(err);
  }
});

async function loadOwnedOrder(req, res) {
  const number = text(req.params.number, 20).toUpperCase();
  const key = req.query.key ?? req.body?.key;
  const order = await Order.findOne({ number }).select("+accessKey");
  if (!order || !keyMatches(order, key)) {
    res.status(404).json({ error: "Order not found." });
    return null;
  }
  return order;
}

// The customer's order page. An unpaid online order is re-checked with the gateway on each view.
ordersRouter.get("/:number", async (req, res, next) => {
  try {
    let order = await loadOwnedOrder(req, res);
    if (!order) return;
    if (order.status === "awaiting_payment") order = await syncPayment(order, "customer").catch(() => order);
    res.set("Cache-Control", "no-store");
    res.json({ order: publicOrderView(order) });
  } catch (err) {
    next(err);
  }
});

// Razorpay Checkout success handler (signature check), or a manual "check my payment".
ordersRouter.post("/:number/verify", async (req, res, next) => {
  try {
    let order = await loadOwnedOrder(req, res);
    if (!order) return;
    if (order.payment.method === "razorpay" && req.body?.razorpay_signature) {
      if (!GATEWAYS.razorpay.verifyCheckoutSignature(req.body) || req.body.razorpay_order_id !== order.payment.gatewayOrderId) {
        return res.status(400).json({ error: "We couldn't verify this payment. If money was debited, it will be confirmed automatically." });
      }
    }
    order = await syncPayment(order, "customer");
    res.json({ order: publicOrderView(order) });
  } catch (err) {
    next(err);
  }
});

// Start a new payment attempt for an unpaid order.
ordersRouter.post("/:number/pay", createLimit, async (req, res, next) => {
  try {
    let order = await loadOwnedOrder(req, res);
    if (!order) return;
    if (order.status === "awaiting_payment") order = await syncPayment(order, "customer").catch(() => order);
    if (!["awaiting_payment", "payment_failed"].includes(order.status)) {
      return res.status(409).json({ error: "This order doesn't need a payment.", order: publicOrderView(order) });
    }
    const payment = await startPayment(order, req);
    res.json({ order: publicOrderView(order), payment });
  } catch (err) {
    next(err);
  }
});
