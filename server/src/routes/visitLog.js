import { config } from "../config.js";
import { hashIp, readSource, readUserAgent, Visit } from "../models/Visit.js";

// Records one page view from the storefront beacon and, when the shopper tells us who they are
// (sign in, sign up or checkout), attaches the email and mobile to that visitor.
// Everything here is best-effort: a failed beacon must never break a page.

const MAX_PAGES = 30;
const clip = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** Only same-site paths, so a crafted beacon can't fill the table with junk URLs. */
const cleanPath = (v) => {
  const p = clip(v, 200);
  return p.startsWith("/") && !p.startsWith("//") ? p : "/";
};
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export async function recordVisit(req, res, next) {
  try {
    const body = req.body ?? {};
    const visitorId = clip(body.visitorId, 64);
    const sessionId = clip(body.sessionId, 64);
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(visitorId)) return res.status(400).json({ error: "Invalid visitor id." });

    const path = cleanPath(body.path);
    // The admin panel is never tracked.
    if (path.startsWith("/admin")) return res.status(204).end();

    const now = new Date();
    const utm = {
      source: clip(body.utm?.source, 60),
      medium: clip(body.utm?.medium, 60),
      campaign: clip(body.utm?.campaign, 80),
    };
    const referrer = clip(body.referrer, 300);
    const { device, browser, os } = readUserAgent(req.get("user-agent"));

    const page = { path, title: clip(body.title, 120), at: now };
    const identity = body.identity ?? {};
    const email = clip(identity.email, 120).toLowerCase();
    const identify = EMAIL.test(email)
      ? {
          email,
          name: clip(identity.name, 60),
          phone: clip(identity.phone, 20).replace(/\D/g, "").slice(-10),
          identifiedVia: ["signin", "signup", "order", "newsletter"].includes(identity.via) ? identity.via : "signin",
          identifiedAt: now,
        }
      : null;

    const existing = await Visit.findOne({ visitorId }).select("sessionId");
    const newSession = Boolean(sessionId) && existing?.sessionId !== sessionId;

    await Visit.updateOne(
      { visitorId },
      {
        $set: {
          sessionId,
          lastSeen: now,
          lastPath: path,
          device,
          browser,
          os,
          country: clip(req.get("x-vercel-ip-country"), 4),
          ipHash: hashIp(req.ip, config.sessionSecret),
          ...(identify ?? {}),
        },
        $setOnInsert: {
          firstSeen: now,
          landingPath: path,
          referrer,
          source: readSource(referrer, utm.source),
          utm,
        },
        $inc: { pageViews: 1, ...(existing ? (newSession ? { sessions: 1 } : {}) : {}) },
        $push: { pages: { $each: [page], $slice: -MAX_PAGES } },
      },
      { upsert: true },
    );
    res.status(204).end();
  } catch (err) {
    // A duplicate key can happen when two beacons race on a brand-new visitor; the next one wins.
    if (err?.code === 11000) return res.status(204).end();
    next(err);
  }
}
