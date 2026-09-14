import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Product } from "../models/Product.js";
import { ON_VERCEL, UPLOADS_DIR } from "../uploads.js";

const SEED_DIR = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(SEED_DIR, "products.json");
const SEED_IMAGES_DIR = path.join(SEED_DIR, "images");

/**
 * Makes sure the bundled product photos exist in the local uploads folder (served at /uploads).
 * On Vercel the same photos ship as static files in public/uploads, so nothing is copied.
 */
function ensureSeedImages() {
  if (ON_VERCEL || !fs.existsSync(SEED_IMAGES_DIR)) return;
  for (const file of fs.readdirSync(SEED_IMAGES_DIR)) {
    const target = path.join(UPLOADS_DIR, file);
    if (!fs.existsSync(target)) fs.copyFileSync(path.join(SEED_IMAGES_DIR, file), target);
  }
}

/** On a brand-new database, load the starter collection so the store isn't empty. */
export async function seedProductsIfEmpty() {
  ensureSeedImages();
  await Product.init(); // build indexes (including the partial unique slug index)
  const count = await Product.estimatedDocumentCount();
  if (count > 0) return;
  const items = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  await Product.insertMany(items.map((item, i) => ({ ...item, sortOrder: i, status: "active" })));
  console.log(`Seeded ${items.length} starter products.`);
}
