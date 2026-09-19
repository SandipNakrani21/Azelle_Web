import mongoose from "mongoose";

// Customer-facing lifecycle:
//   awaiting_payment → pending (order received, waiting for Azelle) → accepted (shipment booked)
//   → shipped → delivered.   Side exits: payment_failed, cancelled, returned.
export const ORDER_STATUSES = ["awaiting_payment", "payment_failed", "pending", "accepted", "shipped", "delivered", "cancelled", "returned"];
export const PAYMENT_METHODS = ["cashfree", "razorpay", "cod"];
export const PAYMENT_STATUSES = ["unpaid", "paid", "failed", "refunded", "cod_pending", "cod_collected"];
export const SHIPPING_PARTNERS = ["shiprocket", "delhivery", "manual"];

const lineSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    slug: { type: String, default: "" },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    sizeId: { type: String, required: true },
    sizeLabel: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unit: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const eventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    status: { type: String, default: "" },
    note: { type: String, default: "" },
    by: { type: String, default: "system" }, // "customer" | "system" | admin email | partner name
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true }, // AZ-XXXXXX
    // Secret the customer's browser holds to view this order (never shown in the admin UI).
    accessKey: { type: String, required: true, select: false },

    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, index: true },
      phone: { type: String, required: true },
    },
    address: {
      line1: { type: String, required: true },
      line2: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: "India" },
    },

    lines: { type: [lineSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: "" },
    tax: { type: Number, required: true },
    shipping: { type: Number, required: true },
    codFee: { type: Number, default: 0 },
    total: { type: Number, required: true },

    status: { type: String, enum: ORDER_STATUSES, required: true, index: true },

    payment: {
      method: { type: String, enum: PAYMENT_METHODS, required: true },
      status: { type: String, enum: PAYMENT_STATUSES, required: true },
      gatewayOrderId: { type: String, default: "" }, // Cashfree order id / Razorpay order_…
      paymentId: { type: String, default: "" }, // Razorpay pay_… / Cashfree cf_payment_id
      paidAt: { type: Date, default: null },
      refundId: { type: String, default: "" },
      refundedAt: { type: Date, default: null },
    },

    shipment: {
      partner: { type: String, enum: [...SHIPPING_PARTNERS, ""], default: "" },
      courierName: { type: String, default: "" },
      awb: { type: String, default: "" },
      trackingUrl: { type: String, default: "" },
      partnerOrderId: { type: String, default: "" }, // Shiprocket order_id
      partnerShipmentId: { type: String, default: "" }, // Shiprocket shipment_id
      labelUrl: { type: String, default: "" },
      weightKg: { type: Number, default: 0 },
      lastStatus: { type: String, default: "" }, // partner's own status text
      lastSyncedAt: { type: Date, default: null },
    },

    cancelReason: { type: String, default: "" },
    adminNote: { type: String, default: "" },
    history: { type: [eventSchema], default: [] },
    acceptedAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ "payment.gatewayOrderId": 1 });

orderSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.accessKey;
    return ret;
  },
});

export const Order = mongoose.model("Order", orderSchema);
