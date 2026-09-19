import { config } from "../config.js";
import { AdminUser } from "../models/AdminUser.js";
import { PERMISSION_KEYS } from "../rbac.js";

/**
 * Builds the signed-in admin for this request. The owner (env credentials) has every permission;
 * other admins are re-read from the database on every request, so a role change or deactivation
 * takes effect immediately.
 */
export async function loadAdmin(session) {
  const who = session?.admin;
  if (!who) return null;
  if (who.owner) return { id: "owner", owner: true, name: "Owner", email: config.admin.email, roleName: "Owner", permissions: PERMISSION_KEYS };
  const user = await AdminUser.findById(who.id).populate("role");
  if (!user || !user.active || !user.role) return null;
  return { id: String(user._id), owner: false, name: user.name, email: user.email, roleName: user.role.name, permissions: user.role.permissions };
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

/** GET needs `view`, anything else needs `manage`. */
export const viewOrManage = (view, manage) => (req, res, next) =>
  (req.method === "GET" ? can(view, manage) : can(manage))(req, res, next);
