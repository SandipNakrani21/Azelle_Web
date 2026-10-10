import { Router } from "express";
import { config } from "../config.js";
import { Customer, hashPassword } from "../models/Customer.js";
import { rateLimit } from "../middleware/rateLimit.js";

// Storefront accounts: sign up, sign in, sign out and "who am I". The session lives in a cookie
// scoped to /api/account (see app.js); the admin panel has its own, separate session.
export const accountRouter = Router();

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
/** 10 digits starting with 6–9 — the +91 country code is fixed in the form. */
const MOBILE = /^[6-9]\d{9}$/;
/** 8+ characters with upper and lower case, a number and a symbol (same rule as the sign-up form). */
const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const text = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const digits = (v) => (typeof v === "string" ? v.replace(/\D/g, "").slice(-10) : "");
const invalid = (res, fields) => res.status(400).json({ error: "Please fix the highlighted fields.", fields });

/** Rebuilds the session id on sign in / sign up so a fixed cookie can't be reused. */
function startSession(req, customer) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.customerId = customer.id;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

accountRouter.post(
  "/signup",
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: "Too many sign-up attempts. Please try again later." }),
  async (req, res, next) => {
    try {
      const fields = {};
      const name = text(req.body?.name, 60);
      const email = text(req.body?.email, 120).toLowerCase();
      const phone = digits(req.body?.phone);
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      if (name.length < 2) fields.name = "Enter your full name.";
      if (!EMAIL.test(email)) fields.email = "Enter a valid email address.";
      if (!MOBILE.test(phone)) fields.phone = "Enter a valid 10-digit Indian mobile number.";
      if (!PASSWORD.test(password)) fields.password = "Use at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.";
      if (Object.keys(fields).length) return invalid(res, fields);

      if (await Customer.exists({ email })) return invalid(res, { email: "An account with this email already exists. Sign in instead." });

      const customer = await Customer.create({
        name,
        email,
        phone,
        passwordHash: hashPassword(password),
        marketing: req.body?.marketing === true,
        lastLoginAt: new Date(),
      });
      await startSession(req, customer);
      res.status(201).json({ customer: customer.toPublic() });
    } catch (err) {
      if (err?.code === 11000) return invalid(res, { email: "An account with this email already exists. Sign in instead." });
      next(err);
    }
  },
);

accountRouter.post(
  "/login",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: "Too many sign-in attempts. Please try again in a few minutes." }),
  async (req, res, next) => {
    try {
      const email = text(req.body?.email, 120).toLowerCase();
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      if (!EMAIL.test(email) || !password) return invalid(res, { email: EMAIL.test(email) ? undefined : "Enter a valid email address.", password: password ? undefined : "Enter your password." });

      const customer = await Customer.findOne({ email }).select("+passwordHash");
      // The same message either way, so the form never reveals which emails have an account.
      if (!customer || !customer.verifyPassword(password)) return res.status(401).json({ error: "That email and password don't match." });
      if (!customer.active) return res.status(403).json({ error: "This account has been disabled. Please contact us." });

      customer.lastLoginAt = new Date();
      await customer.save();
      await startSession(req, customer);
      res.json({ customer: customer.toPublic() });
    } catch (err) {
      next(err);
    }
  },
);

accountRouter.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(config.customerCookieName, { path: "/api/account" });
    res.json({ ok: true });
  });
});

/** The signed-in shopper, or null. Called once when the storefront loads. */
accountRouter.get("/me", async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    const id = req.session?.customerId;
    if (!id) return res.json({ customer: null });
    const customer = await Customer.findById(id);
    if (!customer || !customer.active) {
      req.session.destroy(() => {});
      return res.json({ customer: null });
    }
    res.json({ customer: customer.toPublic() });
  } catch (err) {
    next(err);
  }
});

/** Name, mobile and the offers opt-in, from the account page. */
accountRouter.put("/me", async (req, res, next) => {
  try {
    const id = req.session?.customerId;
    if (!id) return res.status(401).json({ error: "Please sign in again." });
    const fields = {};
    const name = text(req.body?.name, 60);
    const phone = digits(req.body?.phone);
    if (name.length < 2) fields.name = "Enter your full name.";
    if (!MOBILE.test(phone)) fields.phone = "Enter a valid 10-digit Indian mobile number.";
    if (Object.keys(fields).length) return invalid(res, fields);

    const customer = await Customer.findByIdAndUpdate(
      id,
      { name, phone, marketing: req.body?.marketing === true },
      { new: true, runValidators: true },
    );
    if (!customer) return res.status(401).json({ error: "Please sign in again." });
    res.json({ customer: customer.toPublic() });
  } catch (err) {
    next(err);
  }
});
