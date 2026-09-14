import { Router } from "express";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { imageUpload, saveUploadedImage } from "../uploads.js";
import { parseProductInput } from "../validation.js";

export const adminProductsRouter = Router();

const LIVE = { isDeleted: false };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notFound = (res) => res.status(404).json({ error: "Product not found." });

function sendValidation(res, errors) {
  res.status(422).json({ error: "Please fix the highlighted fields.", fields: errors });
}

function handleDuplicateSlug(err, res) {
  if (err?.code !== 11000) return false;
  res.status(409).json({ error: "Another product already uses this slug.", fields: { slug: "This slug is already in use." } });
  return true;
}

// List (all statuses, never soft-deleted). ?status=active|inactive&q=search
adminProductsRouter.get("/", async (req, res) => {
  const filter = { ...LIVE };
  if (req.query.status === "active" || req.query.status === "inactive") filter.status = req.query.status;
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: re }, { slug: re }, { family: re }];
  }
  const products = await Product.find(filter).sort({ sortOrder: 1, createdAt: 1 });
  res.json({ products });
});

// Image upload (field "image"). Returns the public URL to store in `images`
// (a local /uploads path, or a Vercel Blob URL when deployed).
adminProductsRouter.post("/uploads", imageUpload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });
  const url = await saveUploadedImage(req.file);
  if (!url) return res.status(400).json({ error: "That file is not a valid image." });
  res.status(201).json({ url });
});

adminProductsRouter.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const product = await Product.findOne({ _id: req.params.id, ...LIVE });
  if (!product) return notFound(res);
  res.json({ product });
});

adminProductsRouter.post("/", async (req, res) => {
  const { errors, value } = parseProductInput(req.body);
  if (Object.keys(errors).length) return sendValidation(res, errors);
  try {
    const last = await Product.findOne(LIVE).sort({ sortOrder: -1 }).select("sortOrder");
    const product = await Product.create({ ...value, sortOrder: (last?.sortOrder ?? -1) + 1 });
    res.status(201).json({ product });
  } catch (err) {
    if (!handleDuplicateSlug(err, res)) throw err;
  }
});

adminProductsRouter.put("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const { errors, value } = parseProductInput(req.body);
  if (Object.keys(errors).length) return sendValidation(res, errors);
  try {
    const product = await Product.findOneAndUpdate({ _id: req.params.id, ...LIVE }, value, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!product) return notFound(res);
    res.json({ product });
  } catch (err) {
    if (!handleDuplicateSlug(err, res)) throw err;
  }
});

adminProductsRouter.patch("/:id/status", async (req, res) => {
  const status = req.body?.status;
  if (status !== "active" && status !== "inactive") {
    return res.status(422).json({ error: "Status must be active or inactive." });
  }
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const product = await Product.findOneAndUpdate({ _id: req.params.id, ...LIVE }, { status }, { returnDocument: "after" });
  if (!product) return notFound(res);
  res.json({ product });
});

// Soft delete: keep the record, hide it from the store and the admin list.
adminProductsRouter.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, ...LIVE },
    { isDeleted: true, deletedAt: new Date(), status: "inactive" },
    { returnDocument: "after" },
  );
  if (!product) return notFound(res);
  res.json({ ok: true });
});
