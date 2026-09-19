import mongoose from "mongoose";
import { Router } from "express";
import { refreshProductRating, Review, REVIEW_STATUSES } from "../models/Review.js";

// Moderation: approve, hide or delete customer reviews. Every change refreshes the product's rating.
export const adminReviewsRouter = Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

adminReviewsRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const filter = {};
    if (REVIEW_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (mongoose.isValidObjectId(req.query.product)) filter.product = req.query.product;
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { email: rx }, { title: rx }, { body: rx }];
    }
    const [reviews, total, counts] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("product", "name slug images"),
      Review.countDocuments(filter),
      Review.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);
    res.json({
      reviews,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    });
  } catch (err) {
    next(err);
  }
});

adminReviewsRouter.patch("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Review not found." });
    const status = req.body?.status;
    if (!REVIEW_STATUSES.includes(status)) return res.status(400).json({ error: "Choose approved, hidden or pending." });
    const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate("product", "name slug images");
    if (!review) return res.status(404).json({ error: "Review not found." });
    await refreshProductRating(review.product._id);
    res.json({ review });
  } catch (err) {
    next(err);
  }
});

adminReviewsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Review not found." });
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found." });
    await refreshProductRating(review.product);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
