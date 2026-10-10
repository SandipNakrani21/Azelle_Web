import { Router } from "express";
import { Customer } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { Visit } from "../models/Visit.js";
import { istDate, sendCsv } from "../services/csv.js";

// Dashboards → Visitors: who is on the site, what they looked at, and their email once they have
// signed in, signed up or ordered. This is our own log (see models/Visit.js) — Microsoft Clarity
// reports totals and recordings, never a person's details.
export const adminVisitorsRouter = Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dayMs = 24 * 60 * 60 * 1000;
const since = (days) => new Date(Date.now() - days * dayMs);

function query(req) {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  return {
    days,
    q: typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "",
    who: ["known", "anon"].includes(req.query.who) ? req.query.who : "all",
    sort: req.query.sort === "views" ? { pageViews: -1 } : req.query.sort === "first" ? { firstSeen: -1 } : { lastSeen: -1 },
    page: Math.max(1, Number(req.query.page) || 1),
    limit: Math.min(100, Math.max(5, Number(req.query.limit) || 20)),
  };
}

function filter({ days, q, who }) {
  const match = { lastSeen: { $gte: since(days) } };
  if (who === "known") match.email = { $ne: "" };
  if (who === "anon") match.email = "";
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    match.$or = [{ email: re }, { name: re }, { phone: re }, { lastPath: re }, { source: re }, { visitorId: re }];
  }
  return match;
}

/** Orders and account status for the emails on this page, so the list can show "3 orders · account". */
async function enrich(rows) {
  const emails = [...new Set(rows.map((r) => r.email).filter(Boolean))];
  if (!emails.length) return rows.map((r) => ({ ...r, orders: 0, hasAccount: false }));
  const [orders, accounts] = await Promise.all([
    Order.aggregate([{ $match: { "customer.email": { $in: emails } } }, { $group: { _id: "$customer.email", n: { $sum: 1 } } }]),
    Customer.find({ email: { $in: emails } }).select("email").lean(),
  ]);
  const byEmail = new Map(orders.map((o) => [o._id, o.n]));
  const hasAccount = new Set(accounts.map((a) => a.email));
  return rows.map((r) => ({ ...r, orders: byEmail.get(r.email) ?? 0, hasAccount: hasAccount.has(r.email) }));
}

const listProjection = {
  _id: 0,
  id: { $toString: "$_id" },
  visitorId: 1,
  email: 1,
  name: 1,
  phone: 1,
  identifiedVia: 1,
  identifiedAt: 1,
  sessions: 1,
  pageViews: 1,
  landingPath: 1,
  lastPath: 1,
  source: 1,
  referrer: 1,
  utm: 1,
  device: 1,
  browser: 1,
  os: 1,
  country: 1,
  firstSeen: 1,
  lastSeen: 1,
  pages: { $slice: ["$pages", -8] },
};

adminVisitorsRouter.get("/export", async (req, res, next) => {
  try {
    const opts = query(req);
    const rows = await Visit.aggregate([{ $match: filter(opts) }, { $sort: opts.sort }, { $limit: 5000 }, { $project: listProjection }]);
    const withOrders = await enrich(rows);
    sendCsv(res, "visitors", withOrders, [
      { label: "Name", value: (v) => v.name },
      { label: "Email", value: (v) => v.email },
      { label: "Mobile", value: (v) => v.phone },
      { label: "Known from", value: (v) => v.identifiedVia },
      { label: "Has account", value: (v) => (v.hasAccount ? "Yes" : "No") },
      { label: "Orders", value: (v) => v.orders },
      { label: "Visits", value: (v) => v.sessions },
      { label: "Page views", value: (v) => v.pageViews },
      { label: "Source", value: (v) => v.source },
      { label: "Campaign", value: (v) => v.utm?.campaign ?? "" },
      { label: "Landed on", value: (v) => v.landingPath },
      { label: "Last page", value: (v) => v.lastPath },
      { label: "Device", value: (v) => v.device },
      { label: "Browser", value: (v) => v.browser },
      { label: "First seen (IST)", value: (v) => istDate(v.firstSeen) },
      { label: "Last seen (IST)", value: (v) => istDate(v.lastSeen) },
      { label: "Visitor id", value: (v) => v.visitorId },
    ]);
  } catch (err) {
    next(err);
  }
});

/** Headline numbers, the daily curve and the top pages / sources / devices. */
adminVisitorsRouter.get("/summary", async (req, res, next) => {
  try {
    const { days } = query(req);
    const from = since(days);
    const [totals, daily, pages, sources, devices, live] = await Promise.all([
      Visit.aggregate([
        { $match: { lastSeen: { $gte: from } } },
        {
          $group: {
            _id: null,
            visitors: { $sum: 1 },
            pageViews: { $sum: "$pageViews" },
            sessions: { $sum: "$sessions" },
            known: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$email", ""] } }, 0] }, 1, 0] } },
            returning: { $sum: { $cond: [{ $gt: ["$sessions", 1] }, 1, 0] } },
          },
        },
      ]),
      Visit.aggregate([
        { $match: { lastSeen: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastSeen", timezone: "Asia/Kolkata" } }, visitors: { $sum: 1 }, views: { $sum: "$pageViews" } } },
        { $sort: { _id: 1 } },
      ]),
      Visit.aggregate([
        { $match: { lastSeen: { $gte: from } } },
        { $unwind: "$pages" },
        { $match: { "pages.at": { $gte: from } } },
        { $group: { _id: "$pages.path", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 8 },
      ]),
      Visit.aggregate([{ $match: { lastSeen: { $gte: from } } }, { $group: { _id: "$source", visitors: { $sum: 1 } } }, { $sort: { visitors: -1 } }, { $limit: 6 }]),
      Visit.aggregate([{ $match: { lastSeen: { $gte: from } } }, { $group: { _id: "$device", visitors: { $sum: 1 } } }, { $sort: { visitors: -1 } }]),
      Visit.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) } }),
    ]);
    const t = totals[0] ?? { visitors: 0, pageViews: 0, sessions: 0, known: 0, returning: 0 };
    res.json({
      days,
      totals: { ...t, live },
      daily: daily.map((d) => ({ date: d._id, visitors: d.visitors, views: d.views })),
      pages: pages.map((p) => ({ path: p._id, views: p.views })),
      sources: sources.map((s) => ({ source: s._id || "Direct", visitors: s.visitors })),
      devices: devices.map((d) => ({ device: d._id, visitors: d.visitors })),
    });
  } catch (err) {
    next(err);
  }
});

adminVisitorsRouter.get("/", async (req, res, next) => {
  try {
    const opts = query(req);
    const match = filter(opts);
    const [rows, total] = await Promise.all([
      Visit.aggregate([{ $match: match }, { $sort: opts.sort }, { $skip: (opts.page - 1) * opts.limit }, { $limit: opts.limit }, { $project: listProjection }]),
      Visit.countDocuments(match),
    ]);
    res.json({
      visitors: await enrich(rows),
      total,
      page: opts.page,
      pages: Math.max(1, Math.ceil(total / opts.limit)),
    });
  } catch (err) {
    next(err);
  }
});
