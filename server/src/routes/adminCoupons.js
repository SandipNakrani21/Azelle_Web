import mongoose from "mongoose";
import { Router } from "express";
import { Coupon, COUPON_KINDS } from "../models/Coupon.js";

export const adminCouponsRouter = Router();

const CODE = /^[A-Z0-9_-]{3,30}$/;

function parseCoupon(body = {}) {
  const errors = {};
  const code = String(body.code ?? "").trim().toUpperCase();
  if (!CODE.test(code)) errors.code = "3–30 letters, numbers, - or _.";
  const label = String(body.label ?? "").trim().slice(0, 80);
  if (!label) errors.label = "Describe the offer, e.g. 10% off (up to ₹300).";
  const kind = COUPON_KINDS.includes(body.kind) ? body.kind : "";
  if (!kind) errors.kind = "Choose a discount type.";

  const num = (v) => (v === "" || v == null ? null : Number(v));
  const value = kind === "shipping" ? 0 : num(body.value);
  if (kind === "percent" && !(value > 0 && value <= 90)) errors.value = "Enter a percentage between 1 and 90.";
  if (kind === "flat" && !(value > 0)) errors.value = "Enter the rupee amount off.";
  const maxDiscount = kind === "percent" ? num(body.maxDiscount) : null;
  if (maxDiscount != null && !(maxDiscount > 0)) errors.maxDiscount = "Leave empty for no cap, or enter an amount.";
  const minSubtotal = num(body.minSubtotal) ?? 0;
  if (!(minSubtotal >= 0)) errors.minSubtotal = "Enter 0 or more.";
  const usageLimit = num(body.usageLimit);
  if (usageLimit != null && !(Number.isInteger(usageLimit) && usageLimit >= 1)) errors.usageLimit = "Leave empty for unlimited, or enter a whole number.";
  let expiresAt = null;
  if (body.expiresAt) {
    expiresAt = new Date(body.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) errors.expiresAt = "Enter a valid date.";
  }

  return {
    errors,
    data: { code, label, kind, value: value ?? 0, maxDiscount, minSubtotal, usageLimit, expiresAt, active: body.active !== false, public: body.public !== false },
  };
}

const invalid = (res, errors) => res.status(400).json({ error: "Please fix the highlighted fields.", fields: errors });
const duplicate = (res) => res.status(409).json({ error: "A coupon with this code already exists.", fields: { code: "Already in use." } });

adminCouponsRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ coupons: await Coupon.find().sort({ createdAt: -1 }) });
  } catch (err) {
    next(err);
  }
});

adminCouponsRouter.post("/", async (req, res, next) => {
  try {
    const { errors, data } = parseCoupon(req.body);
    if (Object.keys(errors).length) return invalid(res, errors);
    res.status(201).json({ coupon: await Coupon.create(data) });
  } catch (err) {
    if (err?.code === 11000) return duplicate(res);
    next(err);
  }
});

adminCouponsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Coupon not found." });
    const { errors, data } = parseCoupon(req.body);
    if (Object.keys(errors).length) return invalid(res, errors);
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ error: "Coupon not found." });
    res.json({ coupon });
  } catch (err) {
    if (err?.code === 11000) return duplicate(res);
    next(err);
  }
});

adminCouponsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Coupon not found." });
    const deleted = await Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Coupon not found." });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
