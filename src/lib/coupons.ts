// Coupon codes for the cart.
// ⚠ Demo offers — replace with Azelle's real coupons (or load them from the admin / API) before launch.

export type Coupon = {
  code: string;
  /** Short summary shown in the cart, e.g. "10% off (up to ₹300)". */
  label: string;
  /** Minimum product subtotal (before GST and shipping) required to use the coupon. */
  minSubtotal: number;
  kind: "percent" | "flat" | "shipping";
  /** Percentage for "percent", rupees for "flat", unused for "shipping". */
  value: number;
  maxDiscount?: number;
};

export const COUPONS: Coupon[] = [
  { code: "WELCOME10", label: "10% off (up to ₹300)", minSubtotal: 399, kind: "percent", value: 10, maxDiscount: 300 },
  { code: "AZELLE100", label: "₹100 off on ₹999+", minSubtotal: 999, kind: "flat", value: 100 },
  { code: "FREESHIP", label: "Free shipping on ₹599+", minSubtotal: 599, kind: "shipping", value: 0 },
];

export function findCoupon(code: string): Coupon | undefined {
  const normalised = code.trim().toUpperCase();
  return COUPONS.find((c) => c.code === normalised);
}

export type CouponResult = {
  coupon: Coupon;
  /** Rupee discount on the product subtotal. */
  discount: number;
  freeShipping: boolean;
  /** How much more the subtotal needs to reach the minimum (0 when eligible). */
  shortfall: number;
};

export function evaluateCoupon(coupon: Coupon, subtotal: number): CouponResult {
  const shortfall = Math.max(0, coupon.minSubtotal - subtotal);
  if (shortfall > 0) return { coupon, discount: 0, freeShipping: false, shortfall };

  let discount = 0;
  if (coupon.kind === "percent") discount = Math.min((subtotal * coupon.value) / 100, coupon.maxDiscount ?? Number.POSITIVE_INFINITY);
  else if (coupon.kind === "flat") discount = coupon.value;
  discount = Math.min(Math.round(discount * 100) / 100, subtotal);

  return { coupon, discount, freeShipping: coupon.kind === "shipping", shortfall: 0 };
}
