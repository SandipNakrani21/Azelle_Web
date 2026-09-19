import mongoose from "mongoose";
import { DEFAULT_ROLES, PERMISSION_KEYS } from "../rbac.js";

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40, unique: true },
    description: { type: String, trim: true, maxlength: 160, default: "" },
    permissions: { type: [{ type: String, enum: PERMISSION_KEYS }], default: [] },
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

export async function seedRolesIfEmpty() {
  if ((await Role.estimatedDocumentCount()) > 0) return;
  await Role.insertMany(DEFAULT_ROLES);
  console.log(`Seeded ${DEFAULT_ROLES.length} admin roles.`);
}
