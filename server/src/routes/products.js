import { Router } from "express";
import { Product } from "../models/Product.js";

export const publicProductsRouter = Router();

// The storefront only ever sees active, non-deleted products.
const PUBLIC = { status: "active", isDeleted: false };
const HIDDEN_FIELDS = "-isDeleted -deletedAt -sortOrder";

publicProductsRouter.get("/", async (_req, res) => {
  const products = await Product.find(PUBLIC).select(HIDDEN_FIELDS).sort({ sortOrder: 1, createdAt: 1 });
  res.set("Cache-Control", "no-store");
  res.json({ products });
});

publicProductsRouter.get("/:slug", async (req, res) => {
  const product = await Product.findOne({ ...PUBLIC, slug: String(req.params.slug).toLowerCase() }).select(HIDDEN_FIELDS);
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json({ product });
});
