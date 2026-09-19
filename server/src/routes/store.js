import { Router } from "express";
import { commerce, isDummy } from "../commerce.config.js";
import { Coupon, isCouponLive } from "../models/Coupon.js";
import { availableGateways } from "../integrations/payments/index.js";
import { rateLimit } from "../middleware/rateLimit.js";

export const storeRouter = Router();

const couponView = ({ code, label, kind, value, maxDiscount, minSubtotal }) => ({ code, label, kind, value, maxDiscount, minSubtotal });

// Everything the cart and checkout need to price an order exactly like the server does.
storeRouter.get("/", async (_req, res, next) => {
  try {
    const coupons = await Coupon.find({ active: true, public: true }).sort({ minSubtotal: 1 }).lean();
    const { gstRate, shippingFee, maxQtyPerLine } = commerce.store;
    const { cod } = commerce.payments;
    res.set("Cache-Control", "no-store");
    res.json({
      gstRate,
      shippingFee,
      maxQtyPerLine,
      coupons: coupons.filter((c) => isCouponLive(c)).map(couponView),
      // Microsoft Clarity tracking (the project id is public — it is in the page's script tag anyway).
      analytics: {
        clarityProjectId: commerce.analytics.clarity.projectId,
        test: isDummy(commerce.analytics.clarity),
        enabled: Boolean(commerce.analytics.clarity.enabled && commerce.analytics.clarity.projectId),
      },
      payments: {
        online: availableGateways().length > 0,
        cod: { enabled: cod.enabled, maxOrderValue: cod.maxOrderValue, fee: cod.fee },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Looks up one code — also finds hidden (non-public) coupons the customer typed in.
storeRouter.post(
  "/coupon",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: "Too many coupon attempts. Please try again later." }),
  async (req, res, next) => {
    try {
      const code = String(req.body?.code ?? "").trim().toUpperCase().slice(0, 30);
      const coupon = code ? await Coupon.findOne({ code }).lean() : null;
      if (!coupon || !isCouponLive(coupon)) return res.status(404).json({ error: `"${code}" isn't a valid coupon code.` });
      res.json({ coupon: couponView(coupon) });
    } catch (err) {
      next(err);
    }
  },
);
