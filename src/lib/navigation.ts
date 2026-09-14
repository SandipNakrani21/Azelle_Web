import type { FragranceFamily } from "./products";

// Site navigation shared by the header menu and the footer, so both always list the same links.
export type NavLink = { label: string; to: string };
/** A menu entry that runs an action instead of navigating (e.g. opening the sign-in window). */
export type NavAction = { label: string; action: "auth" };
export type MenuEntry = NavLink | NavAction;
export type NavSection = { heading: string; links: NavLink[] };
export type MenuColumn = { heading: string; links: MenuEntry[]; more?: NavLink };

export const GENDERS = ["Men", "Women", "Unisex"] as const;
export type Gender = (typeof GENDERS)[number];

// Most-loved notes and families shown first in the Shop menu ("Explore all" opens the full list).
export const TOP_NOTES = ["Rose", "Jasmine", "Oud", "Sandalwood", "Cedar"];
export const TOP_FAMILIES: FragranceFamily[] = ["Floral", "Woody", "Amber", "Fresh", "Aromatic"];

// Curated collections, built from fragrance families until collections can be managed in the admin.
export type CuratedCollection = { slug: string; label: string; families: FragranceFamily[] };
export const COLLECTIONS: CuratedCollection[] = [
  { slug: "everyday-fresh", label: "Everyday Fresh", families: ["Fresh", "Aromatic"] },
  { slug: "evening-occasion", label: "Evening & Occasion", families: ["Amber", "Woody"] },
  { slug: "floral-romance", label: "Floral Romance", families: ["Floral", "Sweet"] },
  { slug: "woods-moss", label: "Woods & Moss", families: ["Woody", "Mossy"] },
  { slug: "sweet-indulgence", label: "Sweet Indulgence", families: ["Sweet", "Amber"] },
];

// Collection page sections — the footer Shop links and the menu's "Explore all" links open these tabs.
export type ShopTab = "all" | "gender" | "notes" | "family" | "bestsellers" | "collections";
export const SHOP_TABS: { id: ShopTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "gender", label: "Shop by Gender" },
  { id: "notes", label: "Shop by Notes" },
  { id: "family", label: "Shop by Family" },
  { id: "bestsellers", label: "Our Bestsellers" },
  { id: "collections", label: "Our Collections" },
];
/** Bestsellers are the first products in catalogue order until sales data exists. */
export const BESTSELLER_COUNT = 5;

/** Router state for footer/menu links: collection links ask the page to bring the section tabs into view. */
export type NavState = { focusShop?: boolean };
export function linkState(to: string): NavState | undefined {
  return to.startsWith("/collection") ? { focusShop: true } : undefined;
}

export const SHOP_LINKS: NavLink[] = SHOP_TABS.filter((t) => t.id !== "all").map((t) => ({ label: t.label, to: `/collection?tab=${t.id}` }));

export const INFORMATION_LINKS: NavLink[] = [
  { label: "Terms & Conditions", to: "/pages/terms-and-conditions" },
  { label: "Privacy Policy", to: "/pages/privacy-policy" },
  { label: "Refund & Return", to: "/pages/refund-and-return" },
  { label: "Shipping Policy", to: "/pages/shipping-policy" },
  { label: "GST Invoice", to: "/pages/gst-invoice" },
];

export const HOUSE_LINKS: NavLink[] = [
  { label: "Our Story", to: "/pages/our-story" },
  { label: "Contact Us", to: "/pages/contact-us" },
  { label: "Order Tracking", to: "/pages/order-tracking" },
  { label: "Bulk Order – Query Form", to: "/pages/bulk-order-enquiry" },
];

export const OTHERS_LINKS: MenuEntry[] = [
  { label: "Account", to: "/account" },
  { label: "Login & Signup", action: "auth" },
  { label: "Get Help", to: "/pages/help" },
];

export const NAV_SECTIONS: NavSection[] = [
  { heading: "Shop", links: SHOP_LINKS },
  { heading: "Information", links: INFORMATION_LINKS },
  { heading: "Our House", links: HOUSE_LINKS },
];

/** The five Shop menu columns. Bestsellers are the first live products until sales data exists. */
export function shopMenuColumns(products: { name: string; slug: string }[]): MenuColumn[] {
  return [
    { heading: "Shop by Gender", links: GENDERS.map((g) => ({ label: g, to: `/collection?gender=${g}` })) },
    {
      heading: "Shop by Notes",
      links: TOP_NOTES.map((n) => ({ label: n, to: `/collection?note=${encodeURIComponent(n)}` })),
      more: { label: "Explore all", to: "/collection?tab=notes" },
    },
    {
      heading: "Shop by Family",
      links: TOP_FAMILIES.map((f) => ({ label: f, to: `/collection?group=${f}` })),
      more: { label: "Explore all", to: "/collection?tab=family" },
    },
    {
      heading: "Our Bestsellers",
      links: products.slice(0, BESTSELLER_COUNT).map((p) => ({ label: p.name, to: `/product/${p.slug}` })),
      more: { label: "Explore all", to: "/collection?tab=bestsellers" },
    },
    {
      heading: "Our Collections",
      links: COLLECTIONS.map((c) => ({ label: c.label, to: `/collection?collection=${c.slug}` })),
      more: { label: "Explore all", to: "/collection?tab=collections" },
    },
  ];
}
