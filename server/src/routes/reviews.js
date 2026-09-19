import mongoose from "mongoose";
import { Router } from "express";
import { commerce } from "../commerce.config.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { refreshProductRating, Review } from "../models/Review.js";
import { rateLimit } from "../middleware/rateLimit.js";

export const reviewsRouter = Router();

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const text = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const SORTS = { newest: { createdAt: -1 }, highest: { rating: -1, createdAt: -1 }, lowest: { rating: 1, createdAt: -1 } };

// What the storefront may show about a review (no email).
const publicView = (r) => ({
  id: String(r._id),
  rating: r.rating,
  title: r.title,
  body: r.body,
  name: r.name,
  city: r.city,
  verifiedPurchase: r.verifiedPurchase,
  createdAt: r.createdAt,
});

// Approved reviews for one product, with the rating summary (average, count, 5→1 breakdown).
reviewsRouter.get("/", async (req, res, next) => {
  try {
    const productId = String(req.query.product ?? "");
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ error: "Choose a product." });
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    const sort = SORTS[req.query.sort] ?? SORTS.newest;
    const match = { product: new mongoose.Types.ObjectId(productId), status: "approved" };
    // Every approved rating counts in the summary; only those with a written review are listed.
    const written = { ...match, body: { $ne: "" } };

    const [reviews, total, breakdownAgg] = await Promise.all([
      Review.find(written).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Review.countDocuments(written),
      Review.aggregate([{ $match: match }, { $group: { _id: "$rating", n: { $sum: 1 } } }]),
    ]);
    const ratings = breakdownAgg.reduce((n, b) => n + b.n, 0);
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const b of breakdownAgg) {
      breakdown[b._id] = b.n;
      sum += b._id * b.n;
    }
    res.set("Cache-Control", "no-store");
    res.json({
      reviews: reviews.map(publicView),
      // count = all ratings; reviewCount = written reviews in the list.
      summary: { average: ratings ? Math.round((sum / ratings) * 10) / 10 : 0, count: ratings, reviewCount: total, breakdown },
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

// A customer writes a review. It waits for approval (commerce.config.js → reviews.requireApproval).
reviewsRouter.post(
  "/",
  rateLimit({ windowMs: 60 * 60 * 1000, max: 8, message: "You've sent several reviews already. Please try again later." }),
  async (req, res, next) => {
    try {
      const body = req.body ?? {};
      const errors = {};
      const productId = String(body.productId ?? "");
      const rating = Math.round(Number(body.rating));
      const title = text(body.title, 80);
      const reviewText = typeof body.body === "string" ? body.body.trim().slice(0, 1500) : "";
      const name = text(body.name, 60);
      const email = text(body.email, 120).toLowerCase();
      const city = text(body.city, 60);
      if (!(rating >= 1 && rating <= 5)) errors.rating = "Choose a star rating.";
      if (reviewText.length < 10) errors.body = "Tell us a little more (at least 10 characters).";
      if (name.length < 2) errors.name = "Enter your name.";
      if (!EMAIL.test(email)) errors.email = "Enter a valid email address.";
      if (Object.keys(errors).length) return res.status(400).json({ error: "Please check the highlighted fields.", fields: errors });

      const product = mongoose.isValidObjectId(productId) ? await Product.findOne({ _id: productId, isDeleted: false, status: "active" }).lean() : null;
      if (!product) return res.status(404).json({ error: "Product not found." });

      // One review per email per product.
      if (await Review.exists({ product: product._id, email })) {
        return res.status(409).json({ error: "You've already reviewed this fragrance. Thank you!" });
      }

      // "Verified purchase" when this email has a paid/COD order for the product that wasn't cancelled.
      const verifiedPurchase = Boolean(
        await Order.exists({
          "customer.email": email,
          "lines.productId": productId,
          status: { $in: ["pending", "accepted", "shipped", "delivered"] },
        }),
      );

      const approved = !commerce.reviews.requireApproval;
      const review = await Review.create({
        product: product._id,
        rating,
        title,
        body: reviewText,
        name,
        email,
        city,
        verifiedPurchase,
        status: approved ? "approved" : "pending",
      });
      if (approved) await refreshProductRating(product._id);
      res.status(201).json({ review: publicView(review), published: approved });
    } catch (err) {
      next(err);
    }
  },
);
