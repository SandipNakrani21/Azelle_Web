import { Router } from "express";
import { Order } from "../models/Order.js";
import { getClarityInsights } from "../services/clarity.js";
import { SALE_STATUSES } from "../services/orders.js";
import { istDate, sendCsv } from "../services/csv.js";

// Website analytics for the admin dashboard: Microsoft Clarity figures joined with our own orders.
export const adminAnalyticsRouter = Router();

// Latest Clarity figures as metric / label / value rows (no new Clarity request is made).
adminAnalyticsRouter.get("/export", async (_req, res, next) => {
  try {
    const { configured, last24h, fetchedAt, history } = await getClarityInsights({ force: false });
    if (!configured || !last24h) return res.status(404).json({ error: "No Clarity data to export yet." });
    const d = last24h;
    const rows = [
      ["Summary", "Visits", d.sessions],
      ["Summary", "Visitors", d.users],
      ["Summary", "Bot visits filtered", d.botSessions],
      ["Summary", "Pages per visit", d.pagesPerSession],
      ["Summary", "Active time (s)", d.engagementSeconds.active],
      ["Summary", "Total time (s)", d.engagementSeconds.total],
      ["Summary", "Scroll depth (%)", d.scrollDepth],
      ...Object.entries(d.issues).map(([k, v]) => ["Visitor experience (% of visits)", k, v.percent]),
      ...d.popularPages.map((r) => ["Top pages", r.label, r.value]),
      ...d.referrers.map((r) => ["Traffic sources", r.label, r.value]),
      ...d.devices.map((r) => ["Devices", r.label, r.value]),
      ...d.countries.map((r) => ["Countries", r.label, r.value]),
      ...d.browsers.map((r) => ["Browsers", r.label, r.value]),
      ...history.map((h) => ["Visits per day", h.date, h.sessions]),
    ];
    sendCsv(res, "clarity", rows, [
      { label: "Section", value: (r) => r[0] },
      { label: "Metric", value: (r) => r[1] },
      { label: "Value", value: (r) => r[2] },
      { label: "Clarity data from (IST)", value: () => istDate(fetchedAt) },
    ]);
  } catch (err) {
    next(err);
  }
});

adminAnalyticsRouter.get("/", async (req, res, next) => {
  try {
    const clarity = await getClarityInsights({ force: req.query.refresh === "1" });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [agg] = await Order.aggregate([
      { $match: { status: { $in: SALE_STATUSES }, createdAt: { $gte: since } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
    ]);
    const orders = agg?.orders ?? 0;
    const sessions = clarity.last24h?.sessions ?? 0;
    res.json({
      clarity,
      orders24h: { orders, revenue: agg?.revenue ?? 0 },
      // Share of visits (last 24 hours) that ended in an order.
      conversionRate: sessions ? Math.round((orders / sessions) * 10000) / 100 : null,
    });
  } catch (err) {
    next(err);
  }
});
