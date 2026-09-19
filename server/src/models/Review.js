import mongoose from "mongoose";
import { Product } from "./Product.js";

export const REVIEW_STATUSES = ["pending", "approved", "hidden"];

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 80, default: "" },
    // Empty for a star-only rating: it counts towards the average but isn't listed.
    body: { type: String, trim: true, maxlength: 1500, default: "" },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // Private: used to spot verified purchases and to contact the reviewer. Never shown publicly.
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    city: { type: String, trim: true, maxlength: 60, default: "" },
    verifiedPurchase: { type: Boolean, default: false },
    status: { type: String, enum: REVIEW_STATUSES, default: "pending", index: true },
    adminNote: { type: String, trim: true, maxlength: 300, default: "" },
    // Sample data for local testing (seed/test-reviews.js). Remove before going live.
    testData: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

reviewSchema.index({ product: 1, status: 1, createdAt: -1 });

reviewSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const Review = mongoose.model("Review", reviewSchema);

/** Recomputes a product's average rating and review count from its approved reviews. */
export async function refreshProductRating(productId) {
  const [agg] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)), status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    { $set: { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg?.count ?? 0 } },
  );
}
