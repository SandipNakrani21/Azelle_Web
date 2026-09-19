import crypto from "node:crypto";
import { Router } from "express";
import { config } from "../config.js";
import { loadAdmin } from "../middleware/requireAdmin.js";
import { AdminUser } from "../models/AdminUser.js";
import { verifyPassword } from "../rbac.js";

export const adminAuthRouter = Router();

// Basic brute-force protection: 5 failed attempts per IP per 15 minutes.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const failures = new Map();

const digest = (value) => crypto.createHash("sha256").update(String(value)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

function isLockedOut(ip) {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const entry = failures.get(ip);
  if (!entry || Date.now() - entry.firstAt > WINDOW_MS) failures.set(ip, { count: 1, firstAt: Date.now() });
  else entry.count += 1;
}

// What the admin UI needs: who is signed in and what they may do.
const sessionPayload = (admin) => ({
  email: admin.email,
  name: admin.name,
  role: admin.roleName,
  owner: admin.owner,
  permissions: admin.permissions,
  idleTimeoutMs: config.sessionIdleMs,
});

adminAuthRouter.post("/login", async (req, res, next) => {
  const ip = req.ip ?? "unknown";
  if (isLockedOut(ip)) {
    return res.status(429).json({ error: "Too many sign-in attempts. Please try again in 15 minutes." });
  }

  const { email, password } = req.body ?? {};
  const cleanEmail = String(email ?? "").trim().toLowerCase();

  // 1. The owner (environment credentials). 2. Admin users created in Admin → Users & roles.
  let identity = null;
  try {
    if (safeEqual(cleanEmail, config.admin.email.toLowerCase()) && safeEqual(String(password ?? ""), config.admin.password)) {
      identity = { owner: true };
    } else {
      const user = await AdminUser.findOne({ email: cleanEmail, active: true }).select("+passwordHash");
      if (user && verifyPassword(password, user.passwordHash)) {
        identity = { owner: false, id: String(user._id) };
        await AdminUser.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
      }
    }
  } catch (err) {
    return next(err);
  }

  if (!identity) {
    recordFailure(ip);
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  failures.delete(ip);
  // New session id on sign-in (prevents session fixation).
  req.session.regenerate(async (err) => {
    if (err) return next(err);
    req.session.admin = { ...identity, signedInAt: Date.now() };
    try {
      const admin = await loadAdmin(req.session);
      req.session.save((saveErr) => (saveErr ? next(saveErr) : res.json(sessionPayload(admin))));
    } catch (loadErr) {
      next(loadErr);
    }
  });
});

// Also acts as a keep-alive: the session is rolling, so any authenticated request resets the idle timer.
adminAuthRouter.get("/session", async (req, res, next) => {
  try {
    const admin = await loadAdmin(req.session);
    if (!admin) return res.status(401).json({ error: "Not signed in." });
    res.json(sessionPayload(admin));
  } catch (err) {
    next(err);
  }
});

adminAuthRouter.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(config.sessionCookieName, { httpOnly: true, sameSite: "strict", secure: config.isProd });
    res.json({ ok: true });
  });
});
