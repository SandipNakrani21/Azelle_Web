import crypto from "node:crypto";
import { Router } from "express";
import { config } from "../config.js";

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

const sessionPayload = (req) => ({ email: req.session.admin.email, idleTimeoutMs: config.sessionIdleMs });

adminAuthRouter.post("/login", (req, res, next) => {
  const ip = req.ip ?? "unknown";
  if (isLockedOut(ip)) {
    return res.status(429).json({ error: "Too many sign-in attempts. Please try again in 15 minutes." });
  }

  const { email, password } = req.body ?? {};
  const emailOk = safeEqual(String(email ?? "").trim().toLowerCase(), config.admin.email.toLowerCase());
  const passwordOk = safeEqual(String(password ?? ""), config.admin.password);
  if (!(emailOk && passwordOk)) {
    recordFailure(ip);
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  failures.delete(ip);
  // New session id on sign-in (prevents session fixation).
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.admin = { email: config.admin.email, signedInAt: Date.now() };
    req.session.save((saveErr) => (saveErr ? next(saveErr) : res.json(sessionPayload(req))));
  });
});

// Also acts as a keep-alive: the session is rolling, so any authenticated request resets the idle timer.
adminAuthRouter.get("/session", (req, res) => {
  if (!req.session.admin) return res.status(401).json({ error: "Not signed in." });
  res.json(sessionPayload(req));
});

adminAuthRouter.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(config.sessionCookieName, { httpOnly: true, sameSite: "strict", secure: config.isProd });
    res.json({ ok: true });
  });
});
