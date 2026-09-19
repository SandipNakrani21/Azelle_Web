import crypto from "node:crypto";
import mongoose from "mongoose";

// Test-mode gateway used when a gateway's keys start with "dummy". It behaves like the real one:
// the customer is sent to a (local) payment page, then back to the order page, and the order is
// confirmed by asking the "gateway" for the payment state.

const mockPaymentSchema = new mongoose.Schema(
  {
    gatewayOrderId: { type: String, required: true, unique: true },
    provider: { type: String, required: true }, // cashfree | razorpay
    orderNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    returnUrl: { type: String, required: true },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    paymentId: { type: String, default: "" },
  },
  { timestamps: true },
);

export const MockPayment = mongoose.models.MockPayment ?? mongoose.model("MockPayment", mockPaymentSchema);

const prefix = { cashfree: "cf_test_", razorpay: "order_test_" };

export function mockGateway(id, label) {
  return {
    id,
    label: `${label} (test mode)`,
    isMock: true,
    isConfigured: () => true,

    async createPayment(order, { returnUrl }) {
      const gatewayOrderId = `${prefix[id]}${order.number}_${Date.now().toString(36)}`;
      await MockPayment.create({ gatewayOrderId, provider: id, orderNumber: order.number, amount: order.total, returnUrl });
      return {
        gatewayOrderId,
        client: { gateway: "mock", provider: id, url: `/mock-payment/${encodeURIComponent(gatewayOrderId)}` },
      };
    },

    async fetchStatus(gatewayOrderId) {
      const payment = await MockPayment.findOne({ gatewayOrderId }).lean();
      return {
        paid: payment?.status === "paid",
        failed: payment?.status === "failed",
        amount: payment?.amount ?? 0,
        paymentId: payment?.paymentId ?? "",
      };
    },

    verifyCheckoutSignature: () => true,
    parseWebhook: () => null,

    async refund(order) {
      return `rfnd_test_${order.number}_${crypto.randomBytes(3).toString("hex")}`;
    },
  };
}
