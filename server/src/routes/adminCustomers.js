import mongoose from "mongoose";
import { Router } from "express";
import { Customer } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { hashPassword, STRONG_PASSWORD, SUPER_ADMIN_KEY } from "../rbac.js";
import { SALE_STATUSES } from "../services/orders.js";
import { istDate, sendCsv } from "../services/csv.js";

// Two kinds of customer:
//   accounts — people who signed up on the storefront (or were added here);
//   guests   — people who ordered without an account, grouped by the email on their orders.
// Adding, changing and deleting an account is Super Admin only (see the check below); Admin and
// Manager can read and export the list.
export const adminCustomersRouter = Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const MOBILE = /^[6-9]\d{9}$/;
const text = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const digits = (v) => (typeof v === "string" ? v.replace(/\D/g, "").slice(-10) : "");
const invalid = (res, fields) => res.status(400).json({ error: "Please fix the highlighted fields.", fields });

/** Personal details can only be changed by a Super Admin, whatever the role's permissions say. */
function requireSuperAdmin(req, res, next) {
  if (req.admin?.roleKey !== SUPER_ADMIN_KEY) {
    return res.status(403).json({ error: "Only a Super Admin can add, change or delete a customer account." });
  }
  next();
}

/** Orders placed with this email: how many, how much, and when the last one was. */
const orderStats = () => [
  {
    $lookup: {
      from: "orders",
      let: { email: "$email" },
      pipeline: [
        { $match: { $expr: { $eq: ["$customer.email", "$$email"] } } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            spent: { $sum: { $cond: [{ $in: ["$status", SALE_STATUSES] }, "$total", 0] } },
            lastOrderAt: { $max: "$createdAt" },
          },
        },
      ],
      as: "stats",
    },
  },
  {
    $addFields: {
      id: { $toString: "$_id" },
      orders: { $ifNull: [{ $first: "$stats.orders" }, 0] },
      spent: { $ifNull: [{ $first: "$stats.spent" }, 0] },
      lastOrderAt: { $first: "$stats.lastOrderAt" },
    },
  },
  { $project: { _id: 0, stats: 0, passwordHash: 0, __v: 0 } },
];

const accountSort = (sort) =>
  sort === "spent" ? { spent: -1 } : sort === "orders" ? { orders: -1 } : sort === "name" ? { name: 1 } : { createdAt: -1 };

async function listAccounts({ q, sort, page, limit }) {
  const match = q ? { $or: ["name", "email", "phone"].map((f) => ({ [f]: new RegExp(escapeRegex(q), "i") })) } : {};
  const [result] = await Customer.aggregate([
    { $match: match },
    ...orderStats(),
    { $sort: accountSort(sort) },
    { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: "n" }] } },
  ]);
  return { rows: result.rows, total: result.total[0]?.n ?? 0 };
}

/** Everyone who ordered with an email that has no account. */
async function listGuests({ q, sort, page, limit }) {
  const match = q ? { $or: ["customer.name", "customer.email", "customer.phone"].map((f) => ({ [f]: new RegExp(escapeRegex(q), "i") })) } : {};
  const order = sort === "spent" ? { spent: -1 } : sort === "orders" ? { orders: -1 } : sort === "name" ? { name: 1 } : { lastOrderAt: -1 };
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
    { $lookup: { from: "customers", localField: "_id", foreignField: "email", as: "account" } },
    { $match: { account: { $size: 0 } } },
    {
      $project: {
        _id: 0,
        email: "$_id",
        name: 1,
        phone: 1,
        city: 1,
        state: 1,
        orders: 1,
        spent: 1,
        firstOrderAt: 1,
        lastOrderAt: 1,
      },
    },
    { $sort: order },
    { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: "n" }] } },
  ]);
  return { rows: result.rows, total: result.total[0]?.n ?? 0 };
}

function query(req) {
  return {
    q: typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "",
    sort: String(req.query.sort ?? "recent"),
    page: Math.max(1, Number(req.query.page) || 1),
    limit: Math.min(100, Math.max(5, Number(req.query.limit) || 20)),
    type: req.query.type === "guests" ? "guests" : "accounts",
  };
}

/** How many people ordered without ever creating an account. */
async function countGuests() {
  const emails = await Order.distinct("customer.email");
  if (!emails.length) return 0;
  const withAccounts = await Customer.distinct("email", { email: { $in: emails } });
  return emails.length - withAccounts.length;
}

// ── List ────────────────────────────────────────────────────────────────────
adminCustomersRouter.get("/export", async (req, res, next) => {
  try {
    const { type, q, sort } = query(req);
    const { rows } = type === "guests" ? await listGuests({ q, sort, page: 1, limit: 5000 }) : await listAccounts({ q, sort, page: 1, limit: 5000 });
    const columns = [
      { label: "Name", value: (c) => c.name },
      { label: "Email", value: (c) => c.email },
      { label: "Mobile", value: (c) => c.phone },
      { label: "Orders", value: (c) => c.orders },
      { label: "Spent", value: (c) => Math.round((c.spent ?? 0) * 100) / 100 },
      { label: "Last order (IST)", value: (c) => istDate(c.lastOrderAt) },
    ];
    const extra =
      type === "guests"
        ? [
            { label: "City", value: (c) => c.city },
            { label: "State", value: (c) => c.state },
            { label: "First order (IST)", value: (c) => istDate(c.firstOrderAt) },
          ]
        : [
            { label: "Offers opt-in", value: (c) => (c.marketing ? "Yes" : "No") },
            { label: "Status", value: (c) => (c.active ? "Active" : "Disabled") },
            { label: "Signed up (IST)", value: (c) => istDate(c.createdAt) },
            { label: "Last sign-in (IST)", value: (c) => istDate(c.lastLoginAt) },
          ];
    sendCsv(res, type === "guests" ? "guest-customers" : "customers", rows, [...columns, ...extra]);
  } catch (err) {
    next(err);
  }
});

adminCustomersRouter.get("/", async (req, res, next) => {
  try {
    const { type, q, sort, page, limit } = query(req);
    const [list, accounts, guests] = await Promise.all([
      type === "guests" ? listGuests({ q, sort, page, limit }) : listAccounts({ q, sort, page, limit }),
      Customer.countDocuments(),
      countGuests(),
    ]);
    res.json({
      type,
      customers: list.rows,
      total: list.total,
      page,
      pages: Math.max(1, Math.ceil(list.total / limit)),
      counts: { accounts, guests },
      // The UI hides the add / edit / delete buttons for everyone else; the routes check too.
      canManage: req.admin?.roleKey === SUPER_ADMIN_KEY,
    });
  } catch (err) {
    next(err);
  }
});

// ── Create / update / delete (Super Admin only) ─────────────────────────────
function parse(body = {}, { creating }) {
  const fields = {};
  const name = text(body.name, 60);
  const email = text(body.email, 120).toLowerCase();
  const phone = digits(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2) fields.name = "Enter the customer's name.";
  if (!EMAIL.test(email)) fields.email = "Enter a valid email address.";
  if (phone && !MOBILE.test(phone)) fields.phone = "Enter a valid 10-digit Indian mobile number.";
  if ((creating || password) && !STRONG_PASSWORD.test(password)) {
    fields.password = "8+ characters with upper and lower case, a number and a symbol.";
  }
  return {
    fields,
    data: { name, email, phone, active: body.active !== false, marketing: body.marketing === true, notes: text(body.notes, 300) },
    password,
  };
}

adminCustomersRouter.post("/", requireSuperAdmin, async (req, res, next) => {
  try {
    const { fields, data, password } = parse(req.body, { creating: true });
    if (Object.keys(fields).length) return invalid(res, fields);
    const customer = await Customer.create({ ...data, passwordHash: hashPassword(password), source: "admin" });
    res.status(201).json({ customer: customer.toJSON() });
  } catch (err) {
    if (err?.code === 11000) return invalid(res, { email: "A customer with this email already exists." });
    next(err);
  }
});

adminCustomersRouter.put("/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Customer not found." });
    const { fields, data, password } = parse(req.body, { creating: false });
    if (Object.keys(fields).length) return invalid(res, fields);
    const update = { ...data, ...(password ? { passwordHash: hashPassword(password) } : {}) };
    const customer = await Customer.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ error: "Customer not found." });
    res.json({ customer: customer.toJSON() });
  } catch (err) {
    if (err?.code === 11000) return invalid(res, { email: "A customer with this email already exists." });
    next(err);
  }
});

adminCustomersRouter.delete("/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Customer not found." });
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Customer not found." });
    // Their orders stay in the shop's records; only the sign-in account is removed.
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
