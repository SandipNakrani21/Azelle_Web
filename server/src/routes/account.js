import { createHash, randomBytes } from "node:crypto";
import { PasswordReset } from "../models/PasswordReset.js";
import {
  sendMail,
  emailEnabled,
  localEmailMode,
  recoveryOrigin,
} from "../services/mail.js";
import { Router } from "express";
import { config } from "../config.js";
import { Customer, hashPassword } from "../models/Customer.js";
import { rateLimit } from "../middleware/rateLimit.js";

// Storefront accounts: sign up, sign in, sign out and "who am I". The session lives in a cookie
// scoped to /api/account (see app.js); the admin panel has its own, separate session.
export const accountRouter = Router();

const EMAIL =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
/** 10 digits starting with 6–9 — the +91 country code is fixed in the form. */
const MOBILE = /^[6-9]\d{9}$/;
/** 8+ characters with upper and lower case, a number and a symbol (same rule as the sign-up form). */
const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const text = (v, max) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
const digits = (v) =>
  typeof v === "string" ? v.replace(/\D/g, "").slice(-10) : "";
const invalid = (res, fields) =>
  res.status(400).json({ error: "Please fix the highlighted fields.", fields });

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
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Too many sign-up attempts. Please try again later.",
  }),
  async (req, res, next) => {
    try {
      const fields = {};
      const name = text(req.body?.name, 60);
      const email = text(req.body?.email, 120).toLowerCase();
      const phone = digits(req.body?.phone);
      const password =
        typeof req.body?.password === "string" ? req.body.password : "";
      if (name.length < 2) fields.name = "Enter your full name.";
      if (!EMAIL.test(email)) fields.email = "Enter a valid email address.";
      if (!MOBILE.test(phone))
        fields.phone = "Enter a valid 10-digit Indian mobile number.";
      if (!PASSWORD.test(password))
        fields.password =
          "Use at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.";
      if (Object.keys(fields).length) return invalid(res, fields);

      if (await Customer.exists({ email }))
        return invalid(res, {
          email: "An account with this email already exists. Sign in instead.",
        });

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
      if (err?.code === 11000)
        return invalid(res, {
          email: "An account with this email already exists. Sign in instead.",
        });
      next(err);
    }
  },
);

accountRouter.post(
  "/login",
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: "Too many sign-in attempts. Please try again in a few minutes.",
  }),
  async (req, res, next) => {
    try {
      const email = text(req.body?.email, 120).toLowerCase();
      const password =
        typeof req.body?.password === "string" ? req.body.password : "";
      if (!EMAIL.test(email) || !password)
        return invalid(res, {
          email: EMAIL.test(email) ? undefined : "Enter a valid email address.",
          password: password ? undefined : "Enter your password.",
        });

      const customer = await Customer.findOne({ email }).select(
        "+passwordHash",
      );
      // The same message either way, so the form never reveals which emails have an account.
      if (!customer || !customer.verifyPassword(password))
        return res
          .status(401)
          .json({ error: "That email and password don't match." });
      if (!customer.active)
        return res.status(403).json({
          error: "This account has been disabled. Please contact us.",
        });

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
    if (!MOBILE.test(phone))
      fields.phone = "Enter a valid 10-digit Indian mobile number.";
    if (Object.keys(fields).length) return invalid(res, fields);

    const customer = await Customer.findByIdAndUpdate(
      id,
      { name, phone, marketing: req.body?.marketing === true },
      { new: true, runValidators: true },
    );
    if (!customer)
      return res.status(401).json({ error: "Please sign in again." });
    res.json({ customer: customer.toPublic() });
  } catch (err) {
    next(err);
  }
});

accountRouter.post(
  "/forgot-password",
  rateLimit({
    windowMs: 3600000,
    max: 5,
    message: "Too many recovery requests. Please try later.",
  }),
  async (req, res, next) => {
    try {
      if (!emailEnabled())
        return res.status(503).json({
          error:
            "Email recovery is unavailable. Please contact Azelle customer support.",
        });
      const email = text(req.body?.email, 120).toLowerCase();
      if (!EMAIL.test(email))
        return res.status(400).json({ error: "Enter a valid email address." });
      const customer = await Customer.findOne({ email, active: true });
      if (customer) {
        const token = randomBytes(32).toString("hex"),
          hash = createHash("sha256").update(token).digest("hex");
        const reset = await PasswordReset.create({
          customer: customer.id,
          hash,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });
        const origin = recoveryOrigin();
        if (!origin) {
          await reset.deleteOne();
          return res.status(503).json({
            error:
              "Email recovery is unavailable. Please contact customer support.",
          });
        }
        try {
          await sendMail({
            to: customer.email,
            subject: "Reset your Azelle password",
            text:
              "Use this link within 30 minutes to reset your password: " +
              origin.replace(/\/$/, "") +
              "/reset-password?token=" +
              token +
              "\nIf you did not request this, ignore this email.",
          });
        } catch (error) {
          await reset.deleteOne();
          throw error;
        }
      }
      res.json({
        message: localEmailMode()
          ? "Local test mode: if an active account uses this email, a recovery link is saved in the local test outbox. No email is sent."
          : "If an active account uses this email, a recovery link will be sent.",
      });
    } catch (error) {
      next(error);
    }
  },
);
accountRouter.post(
  "/reset-password",
  rateLimit({
    windowMs: 3600000,
    max: 10,
    message: "Too many reset attempts. Please try later.",
  }),
  async (req, res, next) => {
    try {
      const password =
          typeof req.body?.password === "string" ? req.body.password : "",
        token = text(req.body?.token, 64);
      if (!PASSWORD.test(password) || !/^[a-f0-9]{64}$/.test(token))
        return res
          .status(400)
          .json({ error: "Use a valid reset link and a strong password." });
      const hash = createHash("sha256").update(token).digest("hex");
      // Atomic consumption prevents a token being reused by concurrent requests.
      const reset = await PasswordReset.findOneAndDelete({
        hash,
        expiresAt: { $gt: new Date() },
      });
      if (!reset)
        return res
          .status(400)
          .json({ error: "This reset link has expired or was already used." });
      await Customer.updateOne(
        { _id: reset.customer, active: true },
        { $set: { passwordHash: hashPassword(password) } },
      );
      await PasswordReset.deleteMany({ customer: reset.customer });
      await mongooseSessionRevoke(reset.customer);
      res.json({
        message:
          "Your password has been updated. Sign in with your new password.",
      });
    } catch (error) {
      next(error);
    }
  },
);
async function mongooseSessionRevoke(customerId) {
  const { default: mongoose } = await import("mongoose");
  // Session JSON is matched structurally after reading, never by a user-supplied regex.
  const collection = mongoose.connection.collection("customer_sessions");
  const sessions = await collection.find({}).toArray();
  const ids = sessions
    .filter((s) => {
      try {
        return String(JSON.parse(s.session).customerId) === String(customerId);
      } catch {
        return false;
      }
    })
    .map((s) => s._id);
  if (ids.length) await collection.deleteMany({ _id: { $in: ids } });
}
