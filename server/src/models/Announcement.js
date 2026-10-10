import mongoose from "mongoose";

// A launch, an offer or any other notice for the storefront. The first time someone lands on the
// site they get it as a popup; after that it lives in the "What's new" ribbon on the right edge,
// so it is always one tap away without sitting across the page.
const announcementSchema = new mongoose.Schema(
  {
    /** Small line above the title, e.g. "New launch" or "Festive offer". */
    eyebrow: { type: String, trim: true, maxlength: 40, default: "" },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, required: true, trim: true, maxlength: 400 },
    ctaLabel: { type: String, trim: true, maxlength: 30, default: "" },
    /** A path on this site (/product/imperium) or a full https:// link. */
    ctaHref: { type: String, trim: true, maxlength: 300, default: "" },
    /** Where it shows: the first-visit popup, the ribbon only, or both. */
    placement: { type: String, enum: ["both", "popup", "ribbon"], default: "both" },
    tone: { type: String, enum: ["gradient", "light", "dark"], default: "gradient" },
    /** Optional image shown beside the popup text. */
    image: { type: String, trim: true, maxlength: 300, default: "" },
    active: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    /** Higher shows first; the top live announcement is the one that pops up. */
    priority: { type: Number, default: 0, min: -100, max: 100 },
    /** Days before a dismissed popup can come back. */
    dismissDays: { type: Number, default: 7, min: 0, max: 365 },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    dismissals: { type: Number, default: 0 },
    createdBy: { type: String, trim: true, maxlength: 60, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false, transform: (_doc, ret) => { delete ret._id; return ret; } },
  },
);

announcementSchema.index({ active: 1, priority: -1, createdAt: -1 });

/** Live right now: switched on, started, and not finished. */
export function isLive(a, now = new Date()) {
  if (!a?.active) return false;
  if (a.startsAt && new Date(a.startsAt) > now) return false;
  if (a.endsAt && new Date(a.endsAt) < now) return false;
  return true;
}

export const Announcement = mongoose.models.Announcement ?? mongoose.model("Announcement", announcementSchema);
