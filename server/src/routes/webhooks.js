import express, { Router } from "express";
import { Order } from "../models/Order.js";
import { GATEWAYS } from "../integrations/payments/index.js";
import { syncPayment } from "../services/orders.js";

// Payment webhooks. Signatures are checked on the raw body, then the payment state is
// re-read from the gateway itself — the webhook body is never trusted on its own.
export const webhooksRouter = Router();

webhooksRouter.use(express.raw({ type: "*/*", limit: "1mb" }));

webhooksRouter.post("/:gateway", async (req, res) => {
  const gateway = GATEWAYS[req.params.gateway];
  if (!gateway?.isConfigured()) return res.status(404).json({ error: "Unknown webhook." });

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  let parsed = null;
  try {
    parsed = gateway.parseWebhook(rawBody, req.headers);
  } catch {
    parsed = null;
  }
  if (!parsed) return res.status(400).json({ error: "Invalid signature." });

  try {
    const order = await Order.findOne({ "payment.gatewayOrderId": parsed.gatewayOrderId });
    if (order) await syncPayment(order, `${gateway.label} webhook`);
    res.json({ ok: true });
  } catch (err) {
    console.error(`${gateway.label} webhook failed:`, err);
    // A 5xx makes the gateway retry later.
    res.status(500).json({ error: "Could not process the webhook." });
  }
});
