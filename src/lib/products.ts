// Product types, sizes and pricing helpers. Product data comes from the API (server/)
// via ProductsProvider — only active, non-deleted products reach the storefront.

// The seven main fragrance families (fragrance-wheel groupings, plain English names).
export type FragranceFamily = "Floral" | "Woody" | "Amber" | "Fresh" | "Mossy" | "Aromatic" | "Sweet";

export type Size = { id: "30" | "50" | "100"; label: string };

export type SizePrices = Record<Size["id"], number>;

export type Product = {
  id: string;
  slug: string;
  name: string;
  family: string; // e.g. "Woody Oud"
  group: FragranceFamily; // primary family
  families: FragranceFamily[]; // every family it belongs to (used by filters)
  prices: SizePrices; // INR per bottle size
  notes: string; // "Saffron · Oud · Sandalwood"
  pyramid: { top: string; heart: string; base: string };
  description: string;
  tagline?: string;
  concentration: string; // "Perfume extract"
  perfumeOil?: number | null; // % perfume oil
  longevity?: string; // "8–12 hours"
  highlights: string[];
  images: string[]; // up to 6, in display order
  tint: string; // bottle colour for illustrations
  inStock: boolean;
  status?: "active" | "inactive";
};

export type CartLine = { key: string; productId: string; sizeId: Size["id"]; qty: number };

export const SIZES: Size[] = [
  { id: "30", label: "30 ml" },
  { id: "50", label: "50 ml" },
  { id: "100", label: "100 ml" },
];

export const DEFAULT_SIZE_ID: Size["id"] = "50";
/** GST added on top of the product price at checkout (18%). */
export const TAX_RATE = 0.18;
/** Flat shipping charge per order in INR (applied when the cart isn't empty). */
export const SHIPPING = 100;
export const MAX_PRODUCT_IMAGES = 6;
export const FAMILIES: FragranceFamily[] = ["Floral", "Woody", "Amber", "Fresh", "Mossy", "Aromatic", "Sweet"];

// ── Pricing ───────────────────────────────────────────────────

export function getSize(sizeId: Size["id"]): Size {
  return SIZES.find((s) => s.id === sizeId) ?? SIZES[1];
}

export function unitPrice(product: Pick<Product, "prices">, sizeId: Size["id"]): number {
  return product.prices?.[sizeId] ?? 0;
}

export function cartKey(productId: string, sizeId: Size["id"]): string {
  return `${productId}-${sizeId}`;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    // Whole rupees show no decimals; anything with paise always shows two (₹119.80, not ₹119.8).
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

// True when a note (e.g. "Rose") appears anywhere in the product's notes or pyramid.
export function matchesNote(product: Product, note: string): boolean {
  const haystack = [product.notes, product.pyramid.top, product.pyramid.heart, product.pyramid.base].join(" ").toLowerCase();
  return haystack.includes(note.toLowerCase());
}
