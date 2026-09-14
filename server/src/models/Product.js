import mongoose from "mongoose";

export const FAMILIES = ["Floral", "Woody", "Amber", "Fresh", "Mossy", "Aromatic", "Sweet"];
export const SIZE_IDS = ["30", "50", "100"];
export const MAX_IMAGES = 6;
export const MAX_HIGHLIGHTS = 8;

const tierText = { type: String, required: true, trim: true, maxlength: 200 };
const priceField = { type: Number, required: true, min: 1 };

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 90 },
    family: { type: String, required: true, trim: true, maxlength: 60 }, // e.g. "Woody Oud"
    group: { type: String, required: true, enum: FAMILIES }, // primary family
    families: {
      type: [{ type: String, enum: FAMILIES }],
      validate: { validator: (v) => v.length > 0, message: "Choose at least one family." },
    },
    // INR price for each bottle size.
    prices: { 30: priceField, 50: priceField, 100: priceField },
    notes: { type: String, required: true, trim: true, maxlength: 200 }, // "Saffron · Oud · Sandalwood"
    pyramid: { top: tierText, heart: tierText, base: tierText },
    description: { type: String, required: true, trim: true, maxlength: 1200 },
    tagline: { type: String, trim: true, maxlength: 80, default: "" },
    concentration: { type: String, trim: true, maxlength: 40, default: "Perfume" }, // "Perfume extract"
    perfumeOil: { type: Number, min: 0, max: 100, default: null }, // % perfume oil
    longevity: { type: String, trim: true, maxlength: 40, default: "" }, // "Up to 12 hours"
    highlights: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      validate: { validator: (v) => v.length <= MAX_HIGHLIGHTS, message: `Up to ${MAX_HIGHLIGHTS} highlights.` },
    },
    images: {
      type: [String],
      validate: { validator: (v) => v.length <= MAX_IMAGES, message: `Up to ${MAX_IMAGES} images.` },
    },
    tint: { type: String, default: "#c9a27e", match: /^#[0-9a-f]{6}$/i },
    inStock: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    sortOrder: { type: Number, default: 0 },
    // Soft delete: records are kept but hidden everywhere.
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Slugs must be unique among live (non-deleted) products only.
productSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

productSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const Product = mongoose.model("Product", productSchema);
