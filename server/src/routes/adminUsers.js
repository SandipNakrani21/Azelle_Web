import mongoose from "mongoose";
import { Router } from "express";
import { config } from "../config.js";
import { AdminUser, Role } from "../models/AdminUser.js";
import { hashPassword, PERMISSIONS, PERMISSION_KEYS, STRONG_PASSWORD } from "../rbac.js";

// Admin users and roles (RBAC). Needs the users.manage permission (see app.js).
export const adminUsersRouter = Router();

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const text = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const invalid = (res, fields) => res.status(400).json({ error: "Please fix the highlighted fields.", fields });
const bad = (res, status, error) => res.status(status).json({ error });

// ── Permissions catalogue ───────────────────────────────────────────────────
adminUsersRouter.get("/permissions", (_req, res) => res.json({ permissions: PERMISSIONS }));

// ── Roles ───────────────────────────────────────────────────────────────────
adminUsersRouter.get("/roles", async (_req, res, next) => {
  try {
    const [roles, counts] = await Promise.all([Role.find().sort({ name: 1 }), AdminUser.aggregate([{ $group: { _id: "$role", n: { $sum: 1 } } }])]);
    const byRole = new Map(counts.map((c) => [String(c._id), c.n]));
    res.json({ roles: roles.map((r) => ({ ...r.toJSON(), userCount: byRole.get(String(r._id)) ?? 0 })) });
  } catch (err) {
    next(err);
  }
});

function parseRole(body = {}) {
  const fields = {};
  const name = text(body.name, 40);
  if (name.length < 2) fields.name = "Give the role a name.";
  if (/^owner$/i.test(name)) fields.name = "“Owner” is reserved.";
  const permissions = Array.isArray(body.permissions) ? [...new Set(body.permissions.filter((p) => PERMISSION_KEYS.includes(p)))] : [];
  if (!permissions.length) fields.permissions = "Choose at least one permission.";
  return { fields, data: { name, description: text(body.description, 160), permissions } };
}

adminUsersRouter.post("/roles", async (req, res, next) => {
  try {
    const { fields, data } = parseRole(req.body);
    if (Object.keys(fields).length) return invalid(res, fields);
    res.status(201).json({ role: await Role.create(data) });
  } catch (err) {
    if (err?.code === 11000) return invalid(res, { name: "A role with this name exists." });
    next(err);
  }
});

adminUsersRouter.put("/roles/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 404, "Role not found.");
    const { fields, data } = parseRole(req.body);
    if (Object.keys(fields).length) return invalid(res, fields);
    const role = await Role.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!role) return bad(res, 404, "Role not found.");
    res.json({ role });
  } catch (err) {
    if (err?.code === 11000) return invalid(res, { name: "A role with this name exists." });
    next(err);
  }
});

adminUsersRouter.delete("/roles/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 404, "Role not found.");
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
adminUsersRouter.get("/", async (_req, res, next) => {
  try {
    const users = await AdminUser.find().sort({ createdAt: -1 }).populate("role", "name");
    // The owner comes from the environment and is listed read-only.
    res.json({ owner: { name: "Owner", email: config.admin.email }, users });
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
  if (email === config.admin.email.toLowerCase()) fields.email = "This email belongs to the owner.";
  const roleId = String(body.role ?? "");
  const role = mongoose.isValidObjectId(roleId) ? await Role.findById(roleId) : null;
  if (!role) fields.role = "Choose a role.";
  const password = typeof body.password === "string" ? body.password : "";
  if (creating || password) {
    if (!STRONG_PASSWORD.test(password)) fields.password = "8+ characters with upper and lower case, a number and a symbol.";
  }
  return { fields, data: { name, email, role: role?._id, active: body.active !== false }, password };
}

adminUsersRouter.post("/", async (req, res, next) => {
  try {
    const { fields, data, password } = await parseUser(req.body, { creating: true });
    if (Object.keys(fields).length) return invalid(res, fields);
    const user = await AdminUser.create({ ...data, passwordHash: hashPassword(password) });
    res.status(201).json({ user: await user.populate("role", "name") });
  } catch (err) {
    if (err?.code === 11000) return invalid(res, { email: "An admin with this email exists." });
    next(err);
  }
});

adminUsersRouter.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 404, "User not found.");
    const { fields, data, password } = await parseUser(req.body, { creating: false });
    if (Object.keys(fields).length) return invalid(res, fields);
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

adminUsersRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 404, "User not found.");
    if (req.admin.id === req.params.id) return bad(res, 409, "You can't delete your own account.");
    const deleted = await AdminUser.findByIdAndDelete(req.params.id);
    if (!deleted) return bad(res, 404, "User not found.");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
