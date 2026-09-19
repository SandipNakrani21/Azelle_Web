import crypto from "node:crypto";

// Role-based access control for the admin panel.
// The owner (ADMIN_EMAIL / ADMIN_PASSWORD) always has every permission. Other admins are stored in
// the database, each with one role; a role is a named set of the permissions below.

export const PERMISSIONS = [
  { key: "dashboard.view", group: "Dashboards", label: "View the Azelle (sales) dashboard" },
  { key: "analytics.view", group: "Dashboards", label: "View the Clarity (visitors) dashboard" },
  { key: "orders.view", group: "Sales", label: "View orders" },
  { key: "orders.manage", group: "Sales", label: "Accept, ship, cancel and refund orders" },
  { key: "customers.view", group: "Sales", label: "View customers" },
  { key: "products.view", group: "Catalogue", label: "View products" },
  { key: "products.manage", group: "Catalogue", label: "Add, edit and delete products" },
  { key: "reviews.manage", group: "Catalogue", label: "Publish, hide and delete reviews" },
  { key: "coupons.manage", group: "Catalogue", label: "Add, edit and delete coupons" },
  { key: "settings.view", group: "System", label: "View settings and partner status" },
  { key: "users.manage", group: "System", label: "Manage admin users and roles" },
];
export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

/** Starter roles, created once on an empty database (editable afterwards, except their names). */
export const DEFAULT_ROLES = [
  {
    name: "Manager",
    description: "Runs the store day to day — everything except admin users.",
    permissions: PERMISSION_KEYS.filter((k) => k !== "users.manage"),
  },
  {
    name: "Order staff",
    description: "Packs and ships orders, answers customers.",
    permissions: ["dashboard.view", "orders.view", "orders.manage", "customers.view", "products.view"],
  },
  {
    name: "Content editor",
    description: "Looks after products, reviews and coupons.",
    permissions: ["dashboard.view", "products.view", "products.manage", "reviews.manage", "coupons.manage"],
  },
  {
    name: "Viewer",
    description: "Read-only access to dashboards and lists.",
    permissions: ["dashboard.view", "analytics.view", "orders.view", "customers.view", "products.view"],
  },
];

// ── Passwords (scrypt, per-user salt) ──────────────────────────────────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored ?? "").split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

/** 8+ characters with upper and lower case, a number and a symbol. */
export const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
