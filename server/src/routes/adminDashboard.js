import { Router } from "express";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { SALE_STATUSES } from "../services/orders.js";
import { istDate, sendCsv } from "../services/csv.js";

export const adminDashboardRouter = Router();

const TZ = "Asia/Kolkata";
const DAY = 24 * 60 * 60 * 1000;

/** Midnight (IST) `daysAgo` days back, as a Date. */
function istMidnight(daysAgo = 0) {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const midnightUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 60 * 60 * 1000;
  return new Date(midnightUtc - daysAgo * DAY);
}

const sum = (from) => [
  { $match: { status: { $in: SALE_STATUSES }, createdAt: { $gte: from } } },
  { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
];

// Daily sales for the last 90 days (IST).
adminDashboardRouter.get("/export", async (_req, res, next) => {
  try {
    const from = istMidnight(89);
    const daily = await Order.aggregate([
      { $match: { status: { $in: SALE_STATUSES }, createdAt: { $gte: from } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]);
    const byDay = new Map(daily.map((d) => [d._id, d]));
    const rows = [];
    for (let i = 89; i >= 0; i -= 1) {
      const key = new Date(istMidnight(i).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
      rows.push({ date: key, revenue: byDay.get(key)?.revenue ?? 0, orders: byDay.get(key)?.orders ?? 0 });
    }
    sendCsv(res, "daily-sales", rows, [
      { label: "Date", value: (r) => r.date },
      { label: "Orders", value: (r) => r.orders },
      { label: "Sales (INR)", value: (r) => Math.round(r.revenue * 100) / 100 },
      { label: "Average order (INR)", value: (r) => (r.orders ? Math.round((r.revenue / r.orders) * 100) / 100 : 0) },
    ]);
  } catch (err) {
    next(err);
  }
});

adminDashboardRouter.get("/", async (_req, res, next) => {
  try {
    const today = istMidnight(0);
    const week = istMidnight(6);
    const month = istMidnight(29);
    const chartFrom = istMidnight(13);

    const [todayAgg, weekAgg, monthAgg, allAgg, statusCounts, daily, topProducts, recent, customers, productCounts] = await Promise.all([
      Order.aggregate(sum(today)),
      Order.aggregate(sum(week)),
      Order.aggregate(sum(month)),
      Order.aggregate(sum(new Date(0))),
      Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: { $in: SALE_STATUSES }, createdAt: { $gte: chartFrom } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
            revenue: { $sum: "$total" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: { status: { $in: SALE_STATUSES }, createdAt: { $gte: month } } },
        { $unwind: "$lines" },
        { $group: { _id: "$lines.productId", name: { $last: "$lines.name" }, image: { $last: "$lines.image" }, qty: { $sum: "$lines.qty" }, revenue: { $sum: "$lines.total" } } },
        { $sort: { qty: -1, revenue: -1 } },
        { $limit: 5 },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(8),
      Order.distinct("customer.email", { status: { $in: SALE_STATUSES } }),
      Product.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } }, soldOut: { $sum: { $cond: ["$inStock", 0, 1] } } } },
      ]),
    ]);

    const pick = (agg) => ({ revenue: agg[0]?.revenue ?? 0, orders: agg[0]?.orders ?? 0 });
    const byDay = new Map(daily.map((d) => [d._id, d]));
    const chart = [];
    for (let i = 13; i >= 0; i -= 1) {
      const key = new Date(istMidnight(i).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
      chart.push({ date: key, revenue: byDay.get(key)?.revenue ?? 0, orders: byDay.get(key)?.orders ?? 0 });
    }
    const counts = Object.fromEntries(statusCounts.map((s) => [s._id, s.n]));
    const monthly = pick(monthAgg);

    res.json({
      today: pick(todayAgg),
      week: pick(weekAgg),
      month: monthly,
      allTime: pick(allAgg),
      averageOrderValue: monthly.orders ? Math.round((monthly.revenue / monthly.orders) * 100) / 100 : 0,
      counts,
      needsAction: { pending: counts.pending ?? 0, toShip: counts.accepted ?? 0, awaitingPayment: counts.awaiting_payment ?? 0 },
      chart,
      topProducts: topProducts.map((p) => ({ productId: p._id, name: p.name, image: p.image, qty: p.qty, revenue: p.revenue })),
      recentOrders: recent,
      customers: customers.length,
      products: { total: productCounts[0]?.total ?? 0, active: productCounts[0]?.active ?? 0, soldOut: productCounts[0]?.soldOut ?? 0 },
    });
  } catch (err) {
    next(err);
  }
});
