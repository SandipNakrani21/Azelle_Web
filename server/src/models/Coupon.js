import mongoose from "mongoose";

export const COUPON_KINDS = ["percent", "flat", "shipping"];

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, unique: true, maxlength: 30 },
    label: { type: String, required: true, trim: true, maxlength: 80 }, // "10% off (up to ₹300)"
    kind: { type: String, enum: COUPON_KINDS, required: true },
    value: { type: Number, default: 0, min: 0 }, // % for percent, ₹ for flat
    maxDiscount: { type: Number, default: null, min: 0 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    /** Shown in the cart's "View all coupons" list; hidden codes still work when typed. */
    public: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

couponSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const Coupon = mongoose.model("Coupon", couponSchema);

/** A coupon is usable when active, not expired and under its usage limit. */
export function isCouponLive(coupon, now = new Date()) {
  if (!coupon?.active) return false;
  if (coupon.expiresAt && coupon.expiresAt <= now) return false;
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return false;
  return true;
}

/** Same rules as the storefront cart (src/lib/coupons.ts). */
export function evaluateCoupon(coupon, subtotal) {
  const shortfall = Math.max(0, coupon.minSubtotal - subtotal);
  if (shortfall > 0) return { discount: 0, freeShipping: false, shortfall };
  let discount = 0;
  if (coupon.kind === "percent") discount = Math.min((subtotal * coupon.value) / 100, coupon.maxDiscount ?? Number.POSITIVE_INFINITY);
  else if (coupon.kind === "flat") discount = coupon.value;
  discount = Math.min(Math.round(discount * 100) / 100, subtotal);
  return { discount, freeShipping: coupon.kind === "shipping", shortfall: 0 };
}

// The cart's original demo offers, created once on an empty database so checkout keeps working.
const DEFAULT_COUPONS = [
  { code: "WELCOME10", label: "10% off (up to ₹300)", minSubtotal: 399, kind: "percent", value: 10, maxDiscount: 300 },
  { code: "AZELLE100", label: "₹100 off on ₹999+", minSubtotal: 999, kind: "flat", value: 100 },
  { code: "FREESHIP", label: "Free shipping on ₹599+", minSubtotal: 599, kind: "shipping", value: 0 },
];

export async function seedCouponsIfEmpty() {
  if ((await Coupon.estimatedDocumentCount()) > 0) return;
  await Coupon.insertMany(DEFAULT_COUPONS);
  console.log(`Seeded ${DEFAULT_COUPONS.length} coupons.`);
}
