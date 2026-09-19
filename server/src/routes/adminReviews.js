import mongoose from "mongoose";
import { Router } from "express";
import { refreshProductRating, Review, REVIEW_STATUSES } from "../models/Review.js";
import { istDate, sendCsv } from "../services/csv.js";

// Moderation: approve, hide or delete customer reviews. Every change refreshes the product's rating.
export const adminReviewsRouter = Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

adminReviewsRouter.get("/export", async (_req, res, next) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(20000).populate("product", "name").lean();
    sendCsv(res, "reviews", reviews, [
      { label: "Product", value: (r) => r.product?.name ?? "" },
      { label: "Rating", value: (r) => r.rating },
      { label: "Title", value: (r) => r.title },
      { label: "Review", value: (r) => r.body },
      { label: "Name", value: (r) => r.name },
      { label: "Email", value: (r) => r.email },
      { label: "City", value: (r) => r.city },
      { label: "Verified purchase", value: (r) => (r.verifiedPurchase ? "Yes" : "No") },
      { label: "Status", value: (r) => r.status },
      { label: "Test data", value: (r) => (r.testData ? "Yes" : "") },
      { label: "Date (IST)", value: (r) => istDate(r.createdAt) },
    ]);
  } catch (err) {
    next(err);
  }
});

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
