import mongoose from "mongoose";
import { DEFAULT_ROLES, PERMISSION_KEYS, SUPER_ADMIN_KEY, upgradePermissions } from "../rbac.js";

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40, unique: true },
    description: { type: String, trim: true, maxlength: 160, default: "" },
    permissions: { type: [{ type: String, enum: PERMISSION_KEYS }], default: [] },
    // Built-in roles (Super Admin, Admin, Manager, User, Viewer) carry a key and can't be deleted.
    key: { type: String, unique: true, sparse: true },
    system: { type: Boolean, default: false },
    // Built-in roles: which version of the default permissions they were last reset to.
    defaultsVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);
roleSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});
export const Role = mongoose.model("Role", roleSchema);

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);
adminUserSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
});
export const AdminUser = mongoose.model("AdminUser", adminUserSchema);

/** Bump when the built-in roles' default permissions change: each built-in role is reset once. */
const DEFAULTS_VERSION = 2; // 2 = module × action matrix

/**
 * Makes sure the five built-in roles exist (runs on every start). An existing role with the same name
 * — e.g. from the earlier starter set — is adopted. Super Admin always keeps every permission. The
 * earlier starter roles "Order staff" and "Content editor" are removed when no user has them.
 */
export async function syncDefaultRoles() {
  // Roles saved with the older permission names are converted to the module × action matrix.
  for (const role of await Role.find().lean()) {
    const upgraded = upgradePermissions(role.permissions);
    if (upgraded.length !== role.permissions.length || upgraded.some((p, i) => p !== role.permissions[i])) {
      await Role.collection.updateOne({ _id: role._id }, { $set: { permissions: upgraded } });
    }
  }
  for (const def of DEFAULT_ROLES) {
    const existing = (await Role.findOne({ key: def.key })) ?? (await Role.findOne({ name: def.name, key: { $exists: false } }));
    if (!existing) {
      await Role.create({ ...def, system: true, defaultsVersion: DEFAULTS_VERSION });
      continue;
    }
    const reset = !existing.key || (existing.defaultsVersion ?? 0) < DEFAULTS_VERSION;
    existing.key = def.key;
    existing.name = def.name;
    existing.system = true;
    if (reset) {
      existing.description = def.description;
      existing.permissions = def.permissions;
      existing.defaultsVersion = DEFAULTS_VERSION;
    }
    if (def.key === SUPER_ADMIN_KEY) existing.permissions = def.permissions;
    if (existing.isModified()) await existing.save();
  }
  for (const name of ["Order staff", "Content editor"]) {
    const old = await Role.findOne({ name, key: { $exists: false } });
    if (old && !(await AdminUser.exists({ role: old._id }))) await old.deleteOne();
  }
}
