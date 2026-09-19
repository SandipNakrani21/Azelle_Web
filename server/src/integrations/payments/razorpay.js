import crypto from "node:crypto";
import { commerce, hasKeys } from "../../commerce.config.js";
import { partnerFetch, PartnerError } from "../http.js";

// Razorpay Orders API + Standard Checkout. Docs: https://razorpay.com/docs/api/
const cfg = commerce.payments.razorpay;
const NAME = "Razorpay";
const API = "https://api.razorpay.com/v1";

const headers = () => ({ Authorization: `Basic ${Buffer.from(`${cfg.keys.keyId}:${cfg.keys.keySecret}`).toString("base64")}` });

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const capture = (payment) =>
  partnerFetch(NAME, `${API}/payments/${encodeURIComponent(payment.id)}/capture`, {
    method: "POST",
    headers: headers(),
    json: { amount: payment.amount, currency: payment.currency },
  });

export const razorpay = {
  id: "razorpay",
  label: cfg.label,
  isConfigured: () => hasKeys(cfg),

  /** Creates a Razorpay order; the browser opens Razorpay Checkout with it. */
  async createPayment(order) {
    const amount = Math.round(order.total * 100); // paise
    const data = await partnerFetch(NAME, `${API}/orders`, {
      method: "POST",
      headers: headers(),
      json: { amount, currency: "INR", receipt: order.number, notes: { azelle_order: order.number } },
    });
    if (!data?.id) throw new PartnerError(NAME, "no order id was returned.");
    return {
      gatewayOrderId: data.id,
      client: {
        gateway: "razorpay",
        keyId: cfg.keys.keyId,
        razorpayOrderId: data.id,
        amount,
        currency: "INR",
        name: cfg.brandName,
        description: `Order ${order.number}`,
        prefill: { name: order.customer.name, email: order.customer.email, contact: `+91${order.customer.phone}` },
        themeColor: cfg.themeColor,
      },
    };
  },

  /** Checks the signature Razorpay Checkout gives the browser after a successful payment. */
  verifyCheckoutSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature } = {}) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;
    const expected = crypto.createHmac("sha256", cfg.keys.keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    return safeEqual(expected, razorpay_signature);
  },

  /** Real state of a Razorpay order. Authorised payments are captured here if auto-capture is off. */
  async fetchStatus(gatewayOrderId) {
    const data = await partnerFetch(NAME, `${API}/orders/${encodeURIComponent(gatewayOrderId)}/payments`, { headers: headers() });
    const items = Array.isArray(data?.items) ? data.items : [];
    let payment = items.find((p) => p.status === "captured");
    if (!payment) {
      const authorised = items.find((p) => p.status === "authorized");
      if (authorised) payment = await capture(authorised);
    }
    return {
      paid: payment?.status === "captured",
      failed: !payment && items.length > 0 && items.every((p) => p.status === "failed"),
      amount: payment ? payment.amount / 100 : 0,
      paymentId: payment?.id ?? "",
    };
  },

  /** Verifies a webhook (hex HMAC-SHA256 of the raw body with the webhook secret). */
  parseWebhook(rawBody, headersIn) {
    const signature = headersIn["x-razorpay-signature"];
    if (!signature || !cfg.keys.webhookSecret) return null;
    const expected = crypto.createHmac("sha256", cfg.keys.webhookSecret).update(rawBody).digest("hex");
    if (!safeEqual(expected, signature)) return null;
    const payload = JSON.parse(rawBody);
    const gatewayOrderId = payload?.payload?.payment?.entity?.order_id ?? payload?.payload?.order?.entity?.id;
    return gatewayOrderId ? { gatewayOrderId } : null;
  },

  async refund(order, note) {
    if (!order.payment.paymentId) throw new PartnerError(NAME, "this order has no captured payment to refund.", { status: 409 });
    const data = await partnerFetch(NAME, `${API}/payments/${encodeURIComponent(order.payment.paymentId)}/refund`, {
      method: "POST",
      headers: headers(),
      json: { amount: Math.round(order.total * 100), notes: { reason: (note || "Order cancelled").slice(0, 100) } },
    });
    return String(data?.id ?? "");
  },
};
