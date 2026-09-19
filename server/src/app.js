import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import multer from "multer";
import { config } from "./config.js";
import { connectDatabase } from "./db.js";
import { can, requireAdmin, viewOrManage } from "./middleware/requireAdmin.js";
import { seedRolesIfEmpty } from "./models/AdminUser.js";
import { adminUsersRouter } from "./routes/adminUsers.js";
import { adminAuthRouter } from "./routes/adminAuth.js";
import { seedCouponsIfEmpty } from "./models/Coupon.js";
import { adminAnalyticsRouter } from "./routes/adminAnalytics.js";
import { adminCouponsRouter } from "./routes/adminCoupons.js";
import { adminCustomersRouter } from "./routes/adminCustomers.js";
import { adminDashboardRouter } from "./routes/adminDashboard.js";
import { adminOrdersRouter } from "./routes/adminOrders.js";
import { adminProductsRouter } from "./routes/adminProducts.js";
import { adminReviewsRouter } from "./routes/adminReviews.js";
import { adminSettingsRouter } from "./routes/adminSettings.js";
import { hasMockGateway } from "./integrations/payments/index.js";
import { mockPaymentsRouter } from "./routes/mockPayments.js";
import { ordersRouter } from "./routes/orders.js";
import { publicProductsRouter } from "./routes/products.js";
import { reviewsRouter } from "./routes/reviews.js";
import { storeRouter } from "./routes/store.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { seedProductsIfEmpty } from "./seed/seed.js";
import { ON_VERCEL, UPLOADS_DIR } from "./uploads.js";

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Behind Vercel's (or any) proxy, trust it so secure session cookies work over HTTPS.
  app.set("trust proxy", 1);
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  // Local uploads folder. On Vercel the bundled photos are static files and new uploads live in Vercel Blob.
  if (!ON_VERCEL) app.use("/uploads", express.static(UPLOADS_DIR, { dotfiles: "deny", maxAge: "7d" }));

  // Payment webhooks read the raw body (signature checks), so they come before any JSON parser.
  app.use("/api/webhooks", webhooksRouter);

  // Public storefront API.
  app.use("/api/products", publicProductsRouter);
  app.use("/api/store", express.json({ limit: "20kb" }), storeRouter);
  app.use("/api/orders", express.json({ limit: "50kb" }), ordersRouter);
  app.use("/api/reviews", express.json({ limit: "20kb" }), reviewsRouter);
  // Local test-mode payment page (only when a gateway uses dummy keys; never in production).
  if (hasMockGateway()) app.use("/api/mock-payments", express.json({ limit: "5kb" }), mockPaymentsRouter);

  // Admin API: session cookie scoped to /api/admin; rolling 10-minute inactivity window stored in MongoDB.
  app.use(
    "/api/admin",
    session({
      name: config.sessionCookieName,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      proxy: true,
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: "admin_sessions",
        ttl: config.sessionIdleMs / 1000,
        autoRemove: "native",
      }),
      cookie: { httpOnly: true, sameSite: "strict", secure: config.isProd, maxAge: config.sessionIdleMs },
    }),
    express.json({ limit: "1mb" }),
  );
  app.use("/api/admin", adminAuthRouter);
  // Every admin route checks the signed-in admin's role (RBAC, see rbac.js).
  app.use("/api/admin/products", requireAdmin, viewOrManage("products.view", "products.manage"), adminProductsRouter);
  app.use("/api/admin/dashboard", requireAdmin, can("dashboard.view"), adminDashboardRouter);
  app.use("/api/admin/orders", requireAdmin, viewOrManage("orders.view", "orders.manage"), adminOrdersRouter);
  app.use("/api/admin/customers", requireAdmin, can("customers.view"), adminCustomersRouter);
  app.use("/api/admin/coupons", requireAdmin, can("coupons.manage"), adminCouponsRouter);
  app.use("/api/admin/settings", requireAdmin, can("settings.view"), adminSettingsRouter);
  app.use("/api/admin/reviews", requireAdmin, can("reviews.manage"), adminReviewsRouter);
  app.use("/api/admin/analytics", requireAdmin, can("analytics.view"), adminAnalyticsRouter);
  app.use("/api/admin/users", requireAdmin, can("users.manage"), adminUsersRouter);

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "Images must be 5 MB or smaller." : err.message;
      return res.status(400).json({ error: message });
    }
    if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body." });
    if (err?.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    // Partner (payment / shipping) failures and "not available" errors carry a readable message.
    if (err?.status === 502 || err?.status === 503) {
      if (err.status === 502) console.error(err.cause ?? err);
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  });

  return app;
}

let appPromise = null;

/**
 * Connects to MongoDB, seeds an empty database, and builds the Express app — once per process.
 * Serverless functions (Vercel) reuse the same instance across warm invocations.
 */
export function getApp() {
  appPromise ??= (async () => {
    await connectDatabase();
    await seedProductsIfEmpty();
    await seedCouponsIfEmpty();
    await seedRolesIfEmpty();
    return createApp();
  })().catch((err) => {
    appPromise = null; // let the next request retry (e.g. after a database hiccup)
    throw err;
  });
  return appPromise;
}
