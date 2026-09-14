// One-off: adds Desire Edge and Conqueror (with their photos) to the live database and to the
// starter data, places them right after the real products, and corrects Urban Voyage's concentration.
// Run from /server:  node --env-file=.env src/seed/add-products.js
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { UPLOADS_DIR } from "../uploads.js";

const SEED_DIR = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(SEED_DIR, "products.json");
const SEED_IMAGES_DIR = path.join(SEED_DIR, "images");
const DOWNLOADS = path.join(os.homedir(), "Downloads");

const HIGHLIGHTS_FULL = ["25% perfume oil", "Lasts up to 12 hours", "Premium ingredients", "Inspired by international fragrances", "Vegan", "Cruelty free", "Sulphate free"];

const NEW_PRODUCTS = [
  {
    source: (i) => `Desire Edge-${i}.webp`,
    count: 5,
    data: {
      name: "Desire Edge",
      slug: "desire-edge",
      family: "Fruity Amber",
      group: "Sweet",
      families: ["Sweet", "Amber", "Floral"],
      prices: { 30: 399, 50: 599, 100: 999 },
      notes: "Pineapple · Vanilla · Amber",
      pyramid: {
        top: "Pineapple, Apple, Lemon",
        heart: "Orange Blossom, Lavender, Iris",
        base: "Vanilla, Amber, Sandalwood",
      },
      description:
        "A magnetic fragrance with a daring edge. Juicy pineapple, crisp apple and a twist of lemon open onto a sensual heart of orange blossom, lavender and iris, before settling into a warm, lingering trail of vanilla, amber and creamy sandalwood. Made for date nights and the moments you want remembered.",
      tagline: "Where attraction begins.",
      concentration: "Eau de Parfum",
      perfumeOil: 25,
      longevity: "Up to 12 hours",
      highlights: HIGHLIGHTS_FULL,
      tint: "#3b2a6b",
      inStock: true,
    },
  },
  {
    source: (i) => `Conqueror-${i}.webp`,
    count: 4,
    data: {
      name: "Conqueror",
      slug: "conqueror",
      family: "Aquatic Woody",
      group: "Fresh",
      families: ["Fresh", "Woody", "Aromatic", "Mossy"],
      prices: { 30: 399, 50: 599, 100: 999 },
      notes: "Grapefruit · Marine Accord · Ambergris",
      pyramid: {
        top: "Grapefruit, Marine Accord, Bay Leaf",
        heart: "Hedione Jasmine, Patchouli",
        base: "Guaiac Wood, Oak Moss, Ambergris",
      },
      description:
        "Built for those who lead. Sparkling grapefruit and a cool marine accord meet aromatic bay leaf, flowing into a radiant heart of hedione jasmine and earthy patchouli. The dry-down is bold and assured: smoky guaiac wood, oak moss and salty ambergris that stay with you all day. Citrus, marine and woody, with a confident edge.",
      tagline: "Command every room.",
      concentration: "Eau de Parfum",
      perfumeOil: 25,
      longevity: "Up to 12 hours",
      highlights: ["25% perfume oil", "Lasts up to 12 hours", "Premium ingredients", "Inspired by international fragrances", "Vegan", "Cruelty free"],
      tint: "#1f2433",
      inStock: true,
    },
  },
];

const REAL_FIRST = ["white-oud", "imperium", "urban-voyage", "desire-edge", "conqueror"];

function copyImages({ source, count, data }) {
  const images = [];
  for (let i = 1; i <= count; i++) {
    const from = path.join(DOWNLOADS, source(i));
    if (!fs.existsSync(from)) throw new Error(`Missing image: ${from}`);
    const file = `${data.slug}-${i}.webp`;
    fs.copyFileSync(from, path.join(SEED_IMAGES_DIR, file));
    fs.copyFileSync(from, path.join(UPLOADS_DIR, file));
    images.push(`/uploads/${file}`);
  }
  return images;
}

async function main() {
  const products = NEW_PRODUCTS.map((p) => ({ ...p.data, images: copyImages(p) }));

  // 1. Starter data (for fresh installs): insert after Urban Voyage, update its concentration.
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  const withoutNew = seed.filter((p) => !products.some((n) => n.slug === p.slug));
  const uv = withoutNew.find((p) => p.slug === "urban-voyage");
  if (uv) uv.concentration = "Eau de Parfum";
  const at = withoutNew.findIndex((p) => p.slug === "urban-voyage") + 1;
  withoutNew.splice(at, 0, ...products);
  fs.writeFileSync(SEED_FILE, `${JSON.stringify(withoutNew, null, 2)}\n`);

  // 2. Live database.
  await mongoose.connect(process.env.MONGODB_URI);
  for (const p of products) {
    const existing = await Product.findOne({ slug: p.slug, isDeleted: false });
    if (existing) {
      Object.assign(existing, p);
      await existing.save();
      console.log(`Updated ${p.name}`);
    } else {
      await Product.create({ ...p, status: "active" });
      console.log(`Added ${p.name}`);
    }
  }
  await Product.updateOne({ slug: "urban-voyage", isDeleted: false }, { concentration: "Eau de Parfum" });

  // Order: real products first (in REAL_FIRST order), then everything else as it was.
  const live = await Product.find({ isDeleted: false }).sort({ sortOrder: 1, createdAt: 1 });
  const ordered = [...REAL_FIRST.map((slug) => live.find((p) => p.slug === slug)).filter(Boolean), ...live.filter((p) => !REAL_FIRST.includes(p.slug))];
  await Promise.all(ordered.map((p, i) => Product.updateOne({ _id: p._id }, { sortOrder: i })));
  console.log("Order:", ordered.map((p) => p.name).join(", "));

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
