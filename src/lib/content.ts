// ⚠ PLACEHOLDER CONTENT — reviews, stockists and brand claims below are
// stand-ins for layout. Replace with real, verified copy before launch.

export const MARQUEE_ITEMS = [
  "Perfume extract",
  "Small-batch composed",
  "Complimentary shipping",
  "Natural absolutes",
];

export type Review = { title: string; body: string; name: string };

export const REVIEWS: Review[] = [
  {
    title: "My new signature",
    body: "I've worn Midnight Osmanthus every day for a month and still catch myself smelling my wrist in meetings. Warm, soft, and it lasts well into the evening.",
    name: "Amara K.",
  },
  {
    title: "Worth every drop",
    body: "The 30 ml was meant to be a trial. I ordered the 100 ml a week later. Nothing else I own feels this considered.",
    name: "Daniel R.",
  },
  {
    title: "Compliments all day",
    body: "Smoked Cedar is smoky without being heavy. Three people asked what I was wearing before lunch.",
    name: "Priya S.",
  },
  {
    title: "Beautiful from bottle to skin",
    body: "The bottle is gorgeous, but it's the dry-down that won me over. Creamy, quiet and completely me.",
    name: "Lena M.",
  },
  {
    title: "Fresh that actually lasts",
    body: "Most citrus scents vanish in an hour. Crystal Neroli is still there when I get home.",
    name: "Tom H.",
  },
  {
    title: "A gift they still mention",
    body: "Bought Powder Rose for my mother. She has asked me twice where to find the next bottle.",
    name: "Sofia L.",
  },
  {
    title: "Quietly luxurious",
    body: "Close to the skin, never loud. Exactly what I wanted from a niche house.",
    name: "Marcus B.",
  },
];

export const STOCKISTS = [
  "The Perfume Library",
  "Northern Studio",
  "Ivory Lane",
  "The Bottle Room",
  "White Salon",
  "Shadow & Ivory",
  "The Scent Room",
  "Moonlight Perfumery",
];

export type PromiseKey = "batch" | "natural" | "cruelty" | "lasting" | "refill" | "samples";

export const PROMISES: { key: PromiseKey; title: string; body: string }[] = [
  {
    key: "batch",
    title: "Small-batch composed",
    body: "Every fragrance is blended and matured in batches small enough to check by nose.",
  },
  {
    key: "natural",
    title: "Natural absolutes",
    body: "Osmanthus, rose and neroli absolutes lead each formula, balanced with modern molecules.",
  },
  {
    key: "cruelty",
    title: "Cruelty-free",
    body: "Never tested on animals, at any stage of making.",
  },
  {
    key: "lasting",
    title: "Long-lasting perfume extract",
    body: "Perfume extract concentration carries a few sprays from morning into night.",
  },
  {
    key: "refill",
    title: "Refillable glass",
    body: "Heavy glass bottles designed to be refilled, not replaced.",
  },
  {
    key: "samples",
    title: "Complimentary samples",
    body: "Every order includes two samples so you can find your next signature.",
  },
];

export const ATELIER_CHECKS = [
  "Matured before bottling",
  "Hand-finished bottles",
  "Composed with natural absolutes",
  "Samples with every order",
  "Complimentary shipping, always",
];
