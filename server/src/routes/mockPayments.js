import crypto from "node:crypto";
import { Router } from "express";
import { MockPayment } from "../integrations/payments/mock.js";

// Backs the local test-mode payment page (/mock-payment/:id). Mounted only when a gateway uses dummy keys.
export const mockPaymentsRouter = Router();

mockPaymentsRouter.get("/:id", async (req, res, next) => {
  try {
    const payment = await MockPayment.findOne({ gatewayOrderId: req.params.id }).lean();
    if (!payment) return res.status(404).json({ error: "Test payment not found." });
    const { provider, orderNumber, amount, status, returnUrl } = payment;
    res.json({ payment: { provider, orderNumber, amount, status, returnUrl } });
  } catch (err) {
    next(err);
  }
});

mockPaymentsRouter.post("/:id", async (req, res, next) => {
  try {
    const outcome = req.body?.outcome;
    if (!["success", "failure"].includes(outcome)) return res.status(400).json({ error: "Choose success or failure." });
    const payment = await MockPayment.findOne({ gatewayOrderId: req.params.id });
    if (!payment) return res.status(404).json({ error: "Test payment not found." });
    if (payment.status === "created") {
      payment.status = outcome === "success" ? "paid" : "failed";
      if (outcome === "success") payment.paymentId = `${payment.provider === "razorpay" ? "pay" : "cfpay"}_test_${crypto.randomBytes(5).toString("hex")}`;
      await payment.save();
    }
    res.json({ returnUrl: payment.returnUrl, status: payment.status });
  } catch (err) {
    next(err);
  }
});
