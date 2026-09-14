import { FAMILIES, MAX_HIGHLIGHTS, MAX_IMAGES, SIZE_IDS } from "./models/Product.js";

const HEX = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE = /^(https:\/\/\S+|\/uploads\/[\w.-]+)$/i;

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const list = (value, max) =>
  text(value, max)
    .split(/[,·]/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Normalises an admin product payload. Field errors are keyed like the admin form inputs. */
export function parseProductInput(body = {}) {
  const errors = {};

  const name = text(body.name, 80);
  if (!name) errors.name = "Enter a product name.";

  const slug = slugify(text(body.slug, 120) || name);
  if (!SLUG.test(slug)) errors.slug = "Use lowercase letters, numbers and hyphens.";

  const family = text(body.family, 60);
  if (!family) errors.family = "Describe the family, e.g. Woody Oud.";

  const families = Array.isArray(body.families) ? [...new Set(body.families.filter((f) => FAMILIES.includes(f)))] : [];
  if (!families.length) errors.families = "Choose at least one fragrance family.";
  const group = families.includes(body.group) ? body.group : families[0];

  const pricesIn = body.prices && typeof body.prices === "object" ? body.prices : {};
  const prices = {};
  for (const id of SIZE_IDS) {
    const value = Math.round(Number(pricesIn[id]));
    if (!Number.isFinite(value) || value < 1) errors[`price${id}`] = `Enter the ${id} ml price (at least ₹1).`;
    prices[id] = value;
  }

  const keyNotes = list(body.notes, 200);
  if (!keyNotes.length) errors.notes = "Add the key notes.";

  const pyramidIn = body.pyramid && typeof body.pyramid === "object" ? body.pyramid : {};
  const pyramid = {};
  for (const tier of ["top", "heart", "base"]) {
    const notes = list(pyramidIn[tier], 200);
    if (!notes.length) errors[tier] = `Add the ${tier} notes.`;
    pyramid[tier] = notes.join(", ");
  }

  const description = text(body.description, 1200);
  if (!description) errors.description = "Write a short description.";

  let perfumeOil = null;
  if (body.perfumeOil !== null && body.perfumeOil !== undefined && body.perfumeOil !== "") {
    const value = Number(body.perfumeOil);
    if (!Number.isFinite(value) || value < 0 || value > 100) errors.perfumeOil = "Enter a percentage between 0 and 100.";
    else perfumeOil = Math.round(value * 10) / 10;
  }

  const highlightsIn = Array.isArray(body.highlights) ? body.highlights : [];
  const highlights = highlightsIn.map((h) => text(h, 60)).filter(Boolean);
  if (highlights.length > MAX_HIGHLIGHTS) errors.highlights = `Use up to ${MAX_HIGHLIGHTS} highlights.`;

  const images = (Array.isArray(body.images) ? body.images : []).map((u) => text(u, 1000)).filter(Boolean);
  if (images.length > MAX_IMAGES) errors.images = `Use up to ${MAX_IMAGES} images.`;
  else if (images.some((u) => !IMAGE.test(u))) errors.images = "Images must be uploaded files or https:// links.";

  const tint = HEX.test(body.tint ?? "") ? body.tint.toLowerCase() : "#c9a27e";

  return {
    errors,
    value: {
      name,
      slug,
      family,
      group,
      families,
      prices,
      notes: keyNotes.join(" · "),
      pyramid,
      description,
      tagline: text(body.tagline, 80),
      concentration: text(body.concentration, 40) || "Perfume",
      perfumeOil,
      longevity: text(body.longevity, 40),
      highlights,
      images,
      tint,
      inStock: body.inStock !== false,
      status: body.status === "inactive" ? "inactive" : "active",
    },
  };
}
