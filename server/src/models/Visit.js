import crypto from "node:crypto";
import mongoose from "mongoose";

// One document per browser (a "visitor"), built from the beacons the storefront sends on each page
// view. Microsoft Clarity gives totals and recordings but never tells us *who* someone is, so this
// is our own first-party record: what they looked at, and — once they sign in, order or subscribe —
// the email and mobile that belong to it.
//
// What we deliberately do not keep: raw IP addresses (only a salted hash, so repeat visits can be
// matched without storing the address itself) and anything from the admin panel.
const pageSchema = new mongoose.Schema(
  { path: { type: String, required: true, maxlength: 200 }, title: { type: String, maxlength: 120, default: "" }, at: { type: Date, default: Date.now } },
  { _id: false },
);

const visitSchema = new mongoose.Schema(
  {
    /** Random id kept in the browser's storage — one per device, not per person. */
    visitorId: { type: String, required: true, unique: true, maxlength: 64 },
    /** Id of the visit in progress; a new one starts after 30 minutes of inactivity. */
    sessionId: { type: String, default: "", maxlength: 64 },
    sessions: { type: Number, default: 1 },
    pageViews: { type: Number, default: 0 },
    /** The last 30 pages, newest last. */
    pages: { type: [pageSchema], default: [] },
    landingPath: { type: String, default: "", maxlength: 200 },
    lastPath: { type: String, default: "", maxlength: 200 },
    referrer: { type: String, default: "", maxlength: 300 },
    /** Where they came from, in plain words: Direct, Google, Instagram… */
    source: { type: String, default: "Direct", maxlength: 60 },
    utm: {
      source: { type: String, default: "", maxlength: 60 },
      medium: { type: String, default: "", maxlength: 60 },
      campaign: { type: String, default: "", maxlength: 80 },
    },
    device: { type: String, enum: ["mobile", "tablet", "desktop"], default: "desktop" },
    browser: { type: String, default: "", maxlength: 40 },
    os: { type: String, default: "", maxlength: 40 },
    country: { type: String, default: "", maxlength: 4 },
    /** Salted hash of the IP address — never the address itself. */
    ipHash: { type: String, default: "", maxlength: 32 },
    // ── Identity, once we know it ──────────────────────────────────────────
    email: { type: String, default: "", lowercase: true, trim: true, maxlength: 120 },
    name: { type: String, default: "", trim: true, maxlength: 60 },
    phone: { type: String, default: "", trim: true, maxlength: 20 },
    /** How we learnt who they are: they signed in, signed up, or placed an order. */
    identifiedVia: { type: String, default: "", maxlength: 20 },
    identifiedAt: { type: Date, default: null },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: false, toJSON: { versionKey: false, transform: (_doc, ret) => { ret.id = String(ret._id); delete ret._id; delete ret.ipHash; return ret; } } },
);

visitSchema.index({ lastSeen: -1 });
visitSchema.index({ email: 1 });

export const Visit = mongoose.models.Visit ?? mongoose.model("Visit", visitSchema);

/** Hashes an IP with the session secret so the same device can be recognised without storing it. */
export function hashIp(ip, secret) {
  if (!ip) return "";
  return crypto.createHmac("sha256", String(secret)).update(String(ip)).digest("hex").slice(0, 32);
}

/** Small, dependency-free user-agent read: enough for "mobile / Chrome / Android". */
export function readUserAgent(ua = "") {
  const s = String(ua);
  const device = /iPad|Tablet|PlayBook|Silk/i.test(s) ? "tablet" : /Mobi|Android|iPhone|iPod|Windows Phone/i.test(s) ? "mobile" : "desktop";
  const browser =
    /Edg\//.test(s) ? "Edge"
    : /OPR\//.test(s) ? "Opera"
    : /SamsungBrowser/.test(s) ? "Samsung Internet"
    : /Chrome\//.test(s) ? "Chrome"
    : /Firefox\//.test(s) ? "Firefox"
    : /Safari\//.test(s) ? "Safari"
    : "Other";
  const os =
    /Windows NT/.test(s) ? "Windows"
    : /Android/.test(s) ? "Android"
    : /iPhone|iPad|iPod/.test(s) ? "iOS"
    : /Mac OS X/.test(s) ? "macOS"
    : /Linux/.test(s) ? "Linux"
    : "Other";
  return { device, browser, os };
}

/** "instagram.com/p/123" → Instagram; an empty referrer → Direct. */
export function readSource(referrer = "", utmSource = "") {
  if (utmSource) return utmSource.slice(0, 60);
  if (!referrer) return "Direct";
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "Other";
  }
  const known = [
    [/google\./, "Google"],
    [/instagram\./, "Instagram"],
    [/facebook\.|fb\./, "Facebook"],
    [/youtube\.|youtu\.be/, "YouTube"],
    [/bing\./, "Bing"],
    [/duckduckgo\./, "DuckDuckGo"],
    [/x\.com|twitter\./, "X"],
    [/pinterest\./, "Pinterest"],
    [/whatsapp\./, "WhatsApp"],
    [/linkedin\./, "LinkedIn"],
  ];
  return known.find(([re]) => re.test(host))?.[1] ?? host.slice(0, 60);
}
