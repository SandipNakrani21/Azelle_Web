import mongoose from "mongoose";
import { Router } from "express";
import { commerce, isDummy } from "../commerce.config.js";
import { Announcement } from "../models/Announcement.js";
import { Coupon, isCouponLive } from "../models/Coupon.js";
import { availableGateways } from "../integrations/payments/index.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { recordVisit } from "./visitLog.js";

export const storeRouter = Router();

const couponView = ({ code, label, kind, value, maxDiscount, minSubtotal }) => ({ code, label, kind, value, maxDiscount, minSubtotal });

// Everything the cart and checkout need to price an order exactly like the server does.
storeRouter.get("/", async (_req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(await publicStore());
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

// First-party visit log: one beacon per page view (see routes/visitLog.js).
// Generous limit — a browsing session can easily hit a few dozen pages.
storeRouter.post(
  "/visit",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 300, message: "Too many requests." }),
  recordVisit,
);

// Live announcements for the storefront popup and the "What's new" ribbon.
storeRouter.get("/announcements", async (_req, res, next) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      active: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .sort({ priority: -1, createdAt: -1 })
      .limit(5)
      .lean();
    res.set("Cache-Control", "no-store");
    res.json({
      announcements: announcements.map((a) => ({
        id: String(a._id),
        eyebrow: a.eyebrow,
        title: a.title,
        message: a.message,
        ctaLabel: a.ctaLabel,
        ctaHref: a.ctaHref,
        placement: a.placement,
        tone: a.tone,
        image: a.image,
        dismissDays: a.dismissDays,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// How an announcement performed: shown, clicked or dismissed. Fire-and-forget from the browser.
storeRouter.post(
  "/announcements/:id/:event",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 120, message: "Too many requests." }),
  async (req, res, next) => {
    try {
      const field = { view: "views", click: "clicks", dismiss: "dismissals" }[req.params.event];
      if (!field || !mongoose.isValidObjectId(req.params.id)) return res.status(204).end();
      await Announcement.updateOne({ _id: req.params.id }, { $inc: { [field]: 1 } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

export async function publicStore(){
    const coupons = await Coupon.find({ active: true, public: true }).sort({ minSubtotal: 1 }).lean();
    const { gstRate, shippingFee, maxQtyPerLine } = commerce.store;
    const { cod } = commerce.payments;
    return {
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
    };
}
