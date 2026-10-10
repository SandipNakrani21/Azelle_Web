import mongoose from "mongoose";
import { hashPassword, verifyPassword } from "../rbac.js";

// A storefront account: created when a shopper signs up, used to sign in and to fill checkout.
// Guests can still order without one — those orders are matched to an account by email.
const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    passwordHash: { type: String, required: true, select: false },
    active: { type: Boolean, default: true },
    /** Agreed to hear about launches and offers. */
    marketing: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
    lastLoginAt: { type: Date, default: null },
    /** Where the account was created from: the storefront, or an admin adding it by hand. */
    source: { type: String, enum: ["storefront", "admin"], default: "storefront" },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });

customerSchema.methods.verifyPassword = function verify(password) {
  return verifyPassword(password, this.passwordHash);
};

/** What the storefront is told about the signed-in shopper. */
customerSchema.methods.toPublic = function toPublic() {
  return { id: this.id, name: this.name, email: this.email, phone: this.phone ?? "", marketing: Boolean(this.marketing) };
};

export const Customer = mongoose.models.Customer ?? mongoose.model("Customer", customerSchema);
export { hashPassword };
