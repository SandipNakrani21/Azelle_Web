// Coupon rules for the cart. The coupons themselves are managed in the admin (Coupons) and
// loaded from /api/store; the server applies the same rule again when an order is placed.

export type Coupon = {
  code: string;
  /** Short summary shown in the cart, e.g. "10% off (up to ₹300)". */
  label: string;
  /** Minimum product subtotal (before GST and shipping) required to use the coupon. */
  minSubtotal: number;
  kind: "percent" | "flat" | "shipping";
  /** Percentage for "percent", rupees for "flat", unused for "shipping". */
  value: number;
  maxDiscount?: number | null;
};

export function isCoupon(value: unknown): value is Coupon {
  const c = value as Coupon | null;
  return Boolean(c) && typeof c?.code === "string" && typeof c.minSubtotal === "number" && ["percent", "flat", "shipping"].includes(c.kind);
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
