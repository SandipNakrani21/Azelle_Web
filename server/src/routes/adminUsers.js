import mongoose from "mongoose";
import { Router } from "express";
import { config } from "../config.js";
import { AdminUser, Role } from "../models/AdminUser.js";
import { can } from "../middleware/requireAdmin.js";
import { ACTIONS, DEFAULT_ROLES, hashPassword, MODULES, PERMISSION_KEYS, ROLE_ORDER, STRONG_PASSWORD, SUPER_ADMIN_KEY } from "../rbac.js";

// Admin users and roles (RBAC). Each route checks its own users.* / roles.* permission.
export const adminUsersRouter = Router();

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const text = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const invalid = (res, fields) => res.status(400).json({ error: "Please fix the highlighted fields.", fields });
const bad = (res, status, error) => res.status(status).json({ error });

// ── Permissions catalogue ───────────────────────────────────────────────────
adminUsersRouter.get("/permissions", can("roles.view", "users.view"), (_req, res) => res.json({ modules: MODULES, actions: ACTIONS }));

// ── Roles ───────────────────────────────────────────────────────────────────
// Roles are also listed for the user form (to choose a role).
adminUsersRouter.get("/roles", can("roles.view", "users.view", "users.add", "users.update"), async (_req, res, next) => {
  try {
    const [roles, counts] = await Promise.all([Role.find().sort({ name: 1 }), AdminUser.aggregate([{ $group: { _id: "$role", n: { $sum: 1 } } }])]);
    const byRole = new Map(counts.map((c) => [String(c._id), c.n]));
    // Built-in roles first (Super Admin → Viewer), then custom roles by name.
    const rank = (r) => (r.key ? ROLE_ORDER.indexOf(r.key) : ROLE_ORDER.length);
    const sorted = [...roles].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    res.json({ roles: sorted.map((r) => ({ ...r.toJSON(), userCount: byRole.get(String(r._id)) ?? 0 })) });
  } catch (err) {
    next(err);
  }
});

function parseRole(body = {}) {
  const fields = {};
  const name = text(body.name, 40);
  if (name.length < 2) fields.name = "Give the role a name.";
  if (DEFAULT_ROLES.some((d) => d.name.toLowerCase() === name.toLowerCase())) fields.name = "That's a built-in role name — choose another.";
  const permissions = Array.isArray(body.permissions) ? [...new Set(body.permissions.filter((p) => PERMISSION_KEYS.includes(p)))] : [];
  if (!permissions.length) fields.permissions = "Choose at least one permission.";
  return { fields, data: { name, description: text(body.description, 160), permissions } };
}

adminUsersRouter.post("/roles", can("roles.add"), async (req, res, next) => {
  try {
    const { fields, data } = parseRole(req.body);
    if (Object.keys(fields).length) return invalid(res, fields);
    res.status(201).json({ role: await Role.create(data) });
  } catch (err) {
    if (err?.code === 11000) return invalid(res, { name: "A role with this name exists." });
    next(err);
  }
});

adminUsersRouter.put("/roles/:id", can("roles.update"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 404, "Role not found.");
    const role = await Role.findById(req.params.id);
    if (!role) return bad(res, 404, "Role not found.");
    if (role.key === SUPER_ADMIN_KEY) return bad(res, 409, "Super Admin always has full access and can't be changed.");
    // Built-in roles keep their name; their description and permissions can be adjusted.
    const { fields, data } = parseRole(role.system ? { ...req.body, name: "Custom placeholder" } : req.body);
    if (Object.keys(fields).length) return invalid(res, fields);
    role.description = data.description;
    role.permissions = data.permissions;
    if (!role.system) role.name = data.name;
    await role.save();
    res.json({ role });
  } catch (err) {
    if (err?.code === 11000) return invalid(res, { name: "A role with this name exists." });
    next(err);
  }
});

adminUsersRouter.delete("/roles/:id", can("roles.delete"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 404, "Role not found.");
    const target = await Role.findById(req.params.id);
    if (target?.system) return bad(res, 409, "Built-in roles can't be deleted.");
    const users = await AdminUser.countDocuments({ role: req.params.id });
    if (users) return bad(res, 409, `${users} admin user${users > 1 ? "s have" : " has"} this role. Move them to another role first.`);
    const deleted = await Role.findByIdAndDelete(req.params.id);
    if (!deleted) return bad(res, 404, "Role not found.");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Users ───────────────────────────────────────────────────────────────────
adminUsersRouter.get("/", can("users.view"), async (_req, res, next) => {
  try {
    const users = await AdminUser.find().sort({ createdAt: -1 }).populate("role", "name key");
    // The owner comes from the environment and is listed read-only.
    res.json({ owner: { name: "Main account", email: config.admin.email, role: "Super Admin" }, users });
  } catch (err) {
    next(err);
  }
});

async function parseUser(body = {}, { creating }) {
  const fields = {};
  const name = text(body.name, 60);
  if (name.length < 2) fields.name = "Enter a name.";
  const email = text(body.email, 120).toLowerCase();
  if (!EMAIL.test(email)) fields.email = "Enter a valid email.";
  if (email === config.admin.email.toLowerCase()) fields.email = "This email is the main Super Admin account.";
  const roleId = String(body.role ?? "");
  const role = mongoose.isValidObjectId(roleId) ? await Role.findById(roleId) : null;
  if (!role) fields.role = "Choose a role.";
  const password = typeof body.password === "string" ? body.password : "";
  if (creating || password) {
    if (!STRONG_PASSWORD.test(password)) fields.password = "8+ characters with upper and lower case, a number and a symbol.";
  }
  return { fields, data: { name, email, role: role?._id, active: body.active !== false }, password, roleKey: role?.key ?? "" };
}

// Only a Super Admin may create, change or remove Super Admins.
const isSuper = (req) => req.admin.roleKey === SUPER_ADMIN_KEY;
async function touchesSuperAdmin(userId, newRoleKey) {
  if (newRoleKey === SUPER_ADMIN_KEY) return true;
  if (!userId) return false;
  const current = await AdminUser.findById(userId).populate("role", "key");
  return current?.role?.key === SUPER_ADMIN_KEY;
}

adminUsersRouter.post("/", can("users.add"), async (req, res, next) => {
  try {
    const { fields, data, password, roleKey } = await parseUser(req.body, { creating: true });
    if (Object.keys(fields).length) return invalid(res, fields);
    if (!isSuper(req) && (await touchesSuperAdmin(null, roleKey))) return bad(res, 403, "Only a Super Admin can add another Super Admin.");
    const user = await AdminUser.create({ ...data, passwordHash: hashPassword(password) });
    res.status(201).json({ user: await user.populate("role", "name") });
  } catch (err) {
    if (err?.code === 11000) return invalid(res, { email: "An admin with this email exists." });
    next(err);
  }
});

adminUsersRouter.put("/:id", can("users.update"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 404, "User not found.");
    const { fields, data, password, roleKey } = await parseUser(req.body, { creating: false });
    if (Object.keys(fields).length) return invalid(res, fields);
    if (!isSuper(req) && (await touchesSuperAdmin(req.params.id, roleKey))) return bad(res, 403, "Only a Super Admin can change a Super Admin.");
    if (req.admin.id === req.params.id && data.active === false) return bad(res, 409, "You can't deactivate your own account.");
    const update = { ...data, ...(password ? { passwordHash: hashPassword(password) } : {}) };
    const user = await AdminUser.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate("role", "name");
    if (!user) return bad(res, 404, "User not found.");
    res.json({ user });
  } catch (err) {
    if (err?.code === 11000) return invalid(res, { email: "An admin with this email exists." });
    next(err);
  }
});

adminUsersRouter.delete("/:id", can("users.delete"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 404, "User not found.");
    if (req.admin.id === req.params.id) return bad(res, 409, "You can't delete your own account.");
    if (!isSuper(req) && (await touchesSuperAdmin(req.params.id, ""))) return bad(res, 403, "Only a Super Admin can remove a Super Admin.");
    const deleted = await AdminUser.findByIdAndDelete(req.params.id);
    if (!deleted) return bad(res, 404, "User not found.");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
