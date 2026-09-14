import crypto from "node:crypto";

const isProd = process.env.NODE_ENV === "production";

export const config = {
  isProd,
  // 4000 by default — Windows reserves 5000–5004 on many machines.
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/azelle",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  sessionCookieName: "azelle.admin.sid",
  // Admin is signed out after this long without any request.
  sessionIdleMs: 10 * 60 * 1000,
  // Admin credentials come only from the environment (server/.env locally, project settings on Vercel).
  admin: {
    email: process.env.ADMIN_EMAIL ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
  },
};

if (!config.admin.email || !config.admin.password) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set (server/.env locally, or the Vercel project's environment variables).");
}

if (!config.sessionSecret || config.sessionSecret === "change-me") {
  if (isProd) throw new Error("SESSION_SECRET must be set in production.");
  config.sessionSecret = crypto.randomBytes(32).toString("hex");
  console.warn("SESSION_SECRET not set — using a temporary secret (admin sessions reset when the server restarts).");
}
