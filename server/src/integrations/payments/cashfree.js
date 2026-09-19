import crypto from "node:crypto";
import { commerce, hasKeys } from "../../commerce.config.js";
import { partnerFetch, PartnerError } from "../http.js";

// Cashfree Payment Gateway (PG API). Docs: https://www.cashfree.com/docs/api-reference/payments
const cfg = commerce.payments.cashfree;
const NAME = "Cashfree";

const baseUrl = () => (cfg.environment === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg");
const headers = () => ({
  "x-api-version": cfg.apiVersion,
  "x-client-id": cfg.keys.appId,
  "x-client-secret": cfg.keys.secretKey,
});

export const cashfree = {
  id: "cashfree",
  label: cfg.label,
  isConfigured: () => hasKeys(cfg),

  /** Creates a Cashfree order; the browser opens Cashfree's checkout with `paymentSessionId`. */
  async createPayment(order, { returnUrl, notifyUrl }) {
    // A fresh id per attempt, so a customer can retry after a failed or abandoned payment.
    const gatewayOrderId = `${order.number}_${Date.now().toString(36)}`;
    const customerId = `c${crypto.createHash("sha1").update(order.customer.email).digest("hex").slice(0, 20)}`;
    const data = await partnerFetch(NAME, `${baseUrl()}/orders`, {
      method: "POST",
      headers: headers(),
      json: {
        order_id: gatewayOrderId,
        order_amount: order.total,
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_name: order.customer.name,
          customer_email: order.customer.email,
          customer_phone: order.customer.phone,
        },
        order_meta: {
          return_url: returnUrl,
          // Cashfree only accepts https notify URLs (so there is none on localhost).
          ...(notifyUrl.startsWith("https://") ? { notify_url: notifyUrl } : {}),
        },
        order_note: `Azelle order ${order.number}`,
      },
    });
    if (!data?.payment_session_id) throw new PartnerError(NAME, "no payment session was returned.");
    return {
      gatewayOrderId,
      client: { gateway: "cashfree", mode: cfg.environment, paymentSessionId: data.payment_session_id },
    };
  },

  /** Asks Cashfree for the order's real state (used after the redirect back and on webhooks). */
  async fetchStatus(gatewayOrderId) {
    const path = `${baseUrl()}/orders/${encodeURIComponent(gatewayOrderId)}`;
    const data = await partnerFetch(NAME, path, { headers: headers() });
    const paid = data?.order_status === "PAID";
    let paymentId = "";
    if (paid) {
      const payments = await partnerFetch(NAME, `${path}/payments`, { headers: headers() }).catch(() => []);
      paymentId = String((Array.isArray(payments) ? payments : []).find((p) => p.payment_status === "SUCCESS")?.cf_payment_id ?? "");
    }
    return {
      paid,
      failed: ["EXPIRED", "TERMINATED"].includes(data?.order_status),
      amount: Number(data?.order_amount ?? 0),
      paymentId,
    };
  },

  /** Verifies a webhook (base64 HMAC-SHA256 of timestamp + raw body) and returns the gateway order id. */
  parseWebhook(rawBody, headersIn) {
    const timestamp = headersIn["x-webhook-timestamp"];
    const signature = headersIn["x-webhook-signature"];
    if (!timestamp || !signature || !cfg.keys.secretKey) return null;
    const expected = Buffer.from(crypto.createHmac("sha256", cfg.keys.secretKey).update(timestamp + rawBody).digest("base64"));
    const given = Buffer.from(String(signature));
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    const payload = JSON.parse(rawBody);
    const gatewayOrderId = payload?.data?.order?.order_id;
    return gatewayOrderId ? { gatewayOrderId } : null;
  },

  async refund(order, note) {
    const refundId = `rf_${order.number}_${Date.now().toString(36)}`;
    await partnerFetch(NAME, `${baseUrl()}/orders/${encodeURIComponent(order.payment.gatewayOrderId)}/refunds`, {
      method: "POST",
      headers: headers(),
      json: { refund_amount: order.total, refund_id: refundId, refund_note: (note || "Order cancelled").slice(0, 100) },
    });
    return refundId;
  },
};
