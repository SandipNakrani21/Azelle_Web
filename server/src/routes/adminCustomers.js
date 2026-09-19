import { Router } from "express";
import { Order } from "../models/Order.js";
import { SALE_STATUSES } from "../services/orders.js";
import { istDate, sendCsv } from "../services/csv.js";

// Customers are built from orders (the storefront has no server-side customer accounts yet).
export const adminCustomersRouter = Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

adminCustomersRouter.get("/export", async (_req, res, next) => {
  try {
    const rows = await Order.aggregate([
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$customer.email",
          name: { $last: "$customer.name" },
          phone: { $last: "$customer.phone" },
          city: { $last: "$address.city" },
          state: { $last: "$address.state" },
          orders: { $sum: 1 },
          spent: { $sum: { $cond: [{ $in: ["$status", SALE_STATUSES] }, "$total", 0] } },
          firstOrderAt: { $first: "$createdAt" },
          lastOrderAt: { $last: "$createdAt" },
        },
      },
      { $sort: { lastOrderAt: -1 } },
    ]);
    sendCsv(res, "customers", rows, [
      { label: "Name", value: (c) => c.name },
      { label: "Email", value: (c) => c._id },
      { label: "Mobile", value: (c) => c.phone },
      { label: "City", value: (c) => c.city },
      { label: "State", value: (c) => c.state },
      { label: "Orders", value: (c) => c.orders },
      { label: "Spent", value: (c) => Math.round(c.spent * 100) / 100 },
      { label: "First order (IST)", value: (c) => istDate(c.firstOrderAt) },
      { label: "Last order (IST)", value: (c) => istDate(c.lastOrderAt) },
    ]);
  } catch (err) {
    next(err);
  }
});

adminCustomersRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 20));
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    const sort = req.query.sort === "spent" ? { spent: -1 } : req.query.sort === "orders" ? { orders: -1 } : { lastOrderAt: -1 };

    const match = q
      ? { $or: ["customer.name", "customer.email", "customer.phone"].map((f) => ({ [f]: new RegExp(escapeRegex(q), "i") })) }
      : {};

    const [result] = await Order.aggregate([
      { $match: match },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$customer.email",
          name: { $last: "$customer.name" },
          phone: { $last: "$customer.phone" },
          city: { $last: "$address.city" },
          state: { $last: "$address.state" },
          orders: { $sum: 1 },
          spent: { $sum: { $cond: [{ $in: ["$status", SALE_STATUSES] }, "$total", 0] } },
          firstOrderAt: { $first: "$createdAt" },
          lastOrderAt: { $last: "$createdAt" },
        },
      },
      { $sort: sort },
      { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: "n" }] } },
    ]);

    const total = result.total[0]?.n ?? 0;
    res.json({
      customers: result.rows.map(({ _id, ...rest }) => ({ email: _id, ...rest })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});
