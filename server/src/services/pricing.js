import mongoose from "mongoose";
import { commerce } from "../commerce.config.js";
import { Coupon, evaluateCoupon, isCouponLive } from "../models/Coupon.js";
import { Product, SIZE_IDS } from "../models/Product.js";

const SIZE_LABELS = { 30: "30 ml", 50: "50 ml", 100: "100 ml" };
const round2 = (n) => Math.round(n * 100) / 100;

export class QuoteError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Prices a cart from the database — the browser's prices are never trusted.
 * `items`: [{ productId, sizeId, qty }]. Returns order lines and totals.
 */
export async function quoteOrder({ items, couponCode = "", paymentMethod = "online" }) {
  if (!Array.isArray(items) || items.length === 0) throw new QuoteError("Your cart is empty.");
  if (items.length > 30) throw new QuoteError("Too many items in one order.");

  // Merge duplicate product/size lines.
  const merged = new Map();
  for (const item of items) {
    const productId = String(item?.productId ?? "");
    const sizeId = String(item?.sizeId ?? "");
    const qty = Math.floor(Number(item?.qty));
    if (!mongoose.isValidObjectId(productId) || !SIZE_IDS.includes(sizeId) || !(qty >= 1)) throw new QuoteError("Your cart has an invalid item.");
    const key = `${productId}-${sizeId}`;
    merged.set(key, { productId, sizeId, qty: (merged.get(key)?.qty ?? 0) + qty });
  }

  const ids = [...new Set([...merged.values()].map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: ids }, isDeleted: false, status: "active" }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const { productId, sizeId, qty } of merged.values()) {
    const product = byId.get(productId);
    if (!product) throw new QuoteError("A product in your cart is no longer available. Please review your cart.", 409);
    if (!product.inStock) throw new QuoteError(`${product.name} is sold out. Please remove it from your cart.`, 409);
    if (qty > commerce.store.maxQtyPerLine) throw new QuoteError(`You can order up to ${commerce.store.maxQtyPerLine} of each item.`);
    const unit = Number(product.prices?.[sizeId] ?? 0);
    if (!(unit > 0)) throw new QuoteError(`${product.name} is not available in ${SIZE_LABELS[sizeId]}.`, 409);
    lines.push({
      productId,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0] ?? "",
      sizeId,
      sizeLabel: SIZE_LABELS[sizeId],
      qty,
      unit,
      total: round2(unit * qty),
    });
  }

  const subtotal = round2(lines.reduce((sum, l) => sum + l.total, 0));

  let coupon = null;
  let discount = 0;
  let freeShipping = false;
  const code = String(couponCode ?? "").trim().toUpperCase();
  if (code) {
    coupon = await Coupon.findOne({ code }).lean();
    if (!coupon || !isCouponLive(coupon)) throw new QuoteError(`The coupon ${code} is no longer valid. Remove it and try again.`, 409);
    const result = evaluateCoupon(coupon, subtotal);
    if (result.shortfall > 0) throw new QuoteError(`Add ₹${result.shortfall} more to use ${code}.`, 409);
    ({ discount, freeShipping } = result);
  }

  const { gstRate, shippingFee } = commerce.store;
  const tax = round2((subtotal - discount) * gstRate);
  const shipping = freeShipping ? 0 : shippingFee;
  const codFee = paymentMethod === "cod" ? commerce.payments.cod.fee : 0;
  const total = round2(subtotal - discount + tax + shipping + codFee);

  return { lines, subtotal, discount, couponCode: coupon ? coupon.code : "", tax, shipping, codFee, total };
}
