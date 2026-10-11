import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";

export const publicProductQuery = {
  status: "active",
  isDeleted: false,
  slug: { $ne: "imperium-2" },
};

/** Preview reviews never contribute to public ratings; no records are deleted. */
export async function publicCatalogue(slug) {
  if (slug === "imperium-2") return [];
  const products = await Product.find({
    ...publicProductQuery,
    ...(slug ? { slug } : {}),
  }).sort({ sortOrder: 1, createdAt: 1 });
  const ratings = await Review.aggregate([
    {
      $match: {
        product: {
          $in: products.map((p) => new mongoose.Types.ObjectId(p.id)),
        },
        status: "approved",
        testData: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$product",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  const byId = new Map(ratings.map((r) => [String(r._id), r]));
  return products.map((product) => {
    const p = product.toJSON();
    delete p.sortOrder;
    delete p.isDeleted;
    delete p.deletedAt;
    const rating = byId.get(product.id);
    return {
      ...p,
      ratingAvg: rating ? Math.round(rating.average * 10) / 10 : 0,
      ratingCount: rating?.count ?? 0,
    };
  });
}
