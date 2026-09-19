import { Router } from "express";
import { Order } from "../models/Order.js";
import { getClarityInsights } from "../services/clarity.js";
import { SALE_STATUSES } from "../services/orders.js";

// Website analytics for the admin dashboard: Microsoft Clarity figures joined with our own orders.
export const adminAnalyticsRouter = Router();

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
