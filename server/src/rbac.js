import crypto from "node:crypto";

// Role-based access control for the admin panel.
// The owner (ADMIN_EMAIL / ADMIN_PASSWORD) always has every permission. Other admins are stored in
// the database, each with one role; a role is a named set of the permissions below.

// Permissions are a matrix: module × action. Each module lists the actions that apply to it.
export const ACTIONS = ["view", "add", "update", "delete", "export"];
export const MODULES = [
  { key: "dashboard", label: "Azelle dashboard", group: "Dashboards", actions: ["view", "export"] },
  { key: "analytics", label: "Clarity dashboard", group: "Dashboards", actions: ["view", "export"] },
  { key: "orders", label: "Orders", group: "Sales", actions: ["view", "update", "delete", "export"], notes: { update: "Accept, ship, track", delete: "Cancel, refund" } },
  { key: "customers", label: "Customers", group: "Sales", actions: ["view", "export"] },
  { key: "products", label: "Products", group: "Catalogue", actions: ["view", "add", "update", "delete", "export"] },
  { key: "reviews", label: "Reviews", group: "Catalogue", actions: ["view", "update", "delete", "export"], notes: { update: "Publish, hide" } },
  { key: "coupons", label: "Coupons", group: "Catalogue", actions: ["view", "add", "update", "delete", "export"] },
  { key: "users", label: "Admin users", group: "System", actions: ["view", "add", "update", "delete"] },
  { key: "roles", label: "Roles", group: "System", actions: ["view", "add", "update", "delete"] },
  { key: "settings", label: "Settings", group: "System", actions: ["view"] },
];
export const PERMISSION_KEYS = MODULES.flatMap((m) => m.actions.map((a) => `${m.key}.${a}`));
/** Every action of the given modules, e.g. all("orders", "customers"). */
const all = (...modules) => PERMISSION_KEYS.filter((k) => modules.includes(k.split(".")[0]));
const only = (action, ...modules) => modules.map((m) => `${m}.${action}`).filter((k) => PERMISSION_KEYS.includes(k));

/** Older permission names (before the module × action matrix) and what they become. */
export const LEGACY_PERMISSIONS = {
  "orders.manage": ["orders.update", "orders.delete"],
  "products.manage": ["products.add", "products.update", "products.delete"],
  "reviews.manage": ["reviews.view", "reviews.update", "reviews.delete"],
  "coupons.manage": ["coupons.view", "coupons.add", "coupons.update", "coupons.delete"],
  "users.manage": all("users", "roles"),
};
export function upgradePermissions(list = []) {
  return [...new Set(list.flatMap((p) => LEGACY_PERMISSIONS[p] ?? (PERMISSION_KEYS.includes(p) ? [p] : [])))];
}

/** Built-in roles, highest access first. Created (or brought up to date) on every start; they can't be
    deleted, and Super Admin's permissions are locked. Custom roles can be added alongside them. */
export const SUPER_ADMIN_KEY = "super_admin";
export const DEFAULT_ROLES = [
  {
    key: SUPER_ADMIN_KEY,
    name: "Super Admin",
    description: "Full access, including admin users and roles.",
    permissions: PERMISSION_KEYS,
  },
  {
    key: "admin",
    name: "Admin",
    description: "Everything except managing admin users and roles.",
    permissions: all("dashboard", "analytics", "orders", "customers", "products", "reviews", "coupons", "settings"),
  },
  {
    key: "manager",
    name: "Manager",
    description: "Runs the store day to day — orders, customers, products, reviews and coupons.",
    permissions: [...all("dashboard", "analytics", "orders", "products", "reviews", "coupons"), ...only("view", "customers")],
  },
  {
    key: "user",
    name: "User",
    description: "Handles orders — packs, ships and answers customers.",
    permissions: ["dashboard.view", "orders.view", "orders.update", "customers.view", "products.view"],
  },
  {
    key: "viewer",
    name: "Viewer",
    description: "Read-only access to dashboards and lists.",
    permissions: only("view", "dashboard", "analytics", "orders", "customers", "products", "reviews", "coupons"),
  },
];
export const ROLE_ORDER = DEFAULT_ROLES.map((r) => r.key);

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
