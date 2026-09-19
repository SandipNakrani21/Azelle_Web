import { config } from "../config.js";
import { AdminUser } from "../models/AdminUser.js";
import { PERMISSION_KEYS, SUPER_ADMIN_KEY, upgradePermissions } from "../rbac.js";

/**
 * Builds the signed-in admin for this request. The owner (env credentials) has every permission;
 * other admins are re-read from the database on every request, so a role change or deactivation
 * takes effect immediately.
 */
export async function loadAdmin(session) {
  const who = session?.admin;
  if (!who) return null;
  // The main account (ADMIN_EMAIL) is a Super Admin that can never be locked out.
  if (who.owner) return { id: "owner", owner: true, name: "Azelle Admin", email: config.admin.email, roleName: "Super Admin", roleKey: SUPER_ADMIN_KEY, permissions: PERMISSION_KEYS };
  const user = await AdminUser.findById(who.id).populate("role");
  if (!user || !user.active || !user.role) return null;
  return { id: String(user._id), owner: false, name: user.name, email: user.email, roleName: user.role.name, roleKey: user.role.key ?? "", permissions: upgradePermissions(user.role.permissions) };
}

export async function requireAdmin(req, res, next) {
  try {
    const admin = await loadAdmin(req.session);
    if (!admin) {
      if (req.session?.admin) delete req.session.admin;
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }
    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}

/** Route guard: `can("orders.manage")`. Use after requireAdmin. */
export const can = (...permissions) => (req, res, next) => {
  if (permissions.some((p) => req.admin?.permissions.includes(p))) return next();
  res.status(403).json({ error: "Your role doesn't allow this. Ask the store owner for access." });
};

/**
 * Module guard for the module × action matrix. By default: GET …/export → export, other GET → view,
 * POST → add, PUT/PATCH → update, DELETE → delete. `resolve(req)` can override the action.
 */
export const crud = (module, resolve) => (req, res, next) => {
  const action = resolve?.(req) ?? defaultAction(req);
  return can(`${module}.${action}`)(req, res, next);
};

function defaultAction(req) {
  if (req.method === "GET") return /^\/export\/?$/.test(req.path) ? "export" : "view";
  if (req.method === "POST") return "add";
  if (req.method === "DELETE") return "delete";
  return "update";
}
