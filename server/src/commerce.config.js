// ─────────────────────────────────────────────────────────────────────────────
// Azelle commerce configuration — the one place for store charges, payment
// partners (Cashfree, Razorpay) and shipping partners (Shiprocket, Delhivery).
//
// Secrets never live in this file. Each partner lists the ENVIRONMENT VARIABLES
// that hold its keys (server/.env locally, Vercel → Settings → Environment
// Variables in production). A partner whose keys are missing is simply switched
// off: checkout and the admin only offer partners that are fully configured.
// ─────────────────────────────────────────────────────────────────────────────

const env = (name) => (process.env[name] ?? "").trim();

export const commerce = {
  /** Charges shown in the cart and re-checked by the server on every order. */
  store: {
    currency: "INR",
    /** GST charged on the product price after any coupon discount. */
    gstRate: 0.18,
    /** Flat shipping charge per order (a free-shipping coupon removes it). */
    shippingFee: 100,
    /** Largest quantity of one product/size in a single order. */
    maxQtyPerLine: 10,
    /** Public site URL used for payment return links. Falls back to the request's own origin. */
    siteUrl: env("PUBLIC_SITE_URL"),
  },

  // ── Analytics (Microsoft Clarity) ──────────────────────────────────────────
  analytics: {
    clarity: {
      label: "Microsoft Clarity",
      enabled: true,
      // Project ID from Clarity → Settings → Overview (it goes into the public tracking script).
      projectId: env("CLARITY_PROJECT_ID"),
      // Clarity → Settings → Data Export → Generate new API token. Used only by the server.
      keys: { apiToken: env("CLARITY_API_TOKEN") },
      envVars: ["CLARITY_API_TOKEN", "CLARITY_PROJECT_ID"],
      // Clarity allows 10 export requests per project per day, so data is fetched at most this often.
      refreshHours: 3,
      dashboardUrl: "https://clarity.microsoft.com/projects",
    },
  },

  // ── Reviews ────────────────────────────────────────────────────────────────
  reviews: {
    /** New reviews wait for approval in Admin → Reviews before they appear on the site. */
    requireApproval: true,
  },

  // ── Payments ───────────────────────────────────────────────────────────────
  payments: {
    /**
     * Gateways are tried in this order when a customer pays online: if the first is
     * not configured, or it fails to start a payment, the next one is used.
     */
    order: ["cashfree", "razorpay"],

    cashfree: {
      label: "Cashfree",
      enabled: true,
      // "sandbox" for test payments, "production" for real money.
      environment: env("CASHFREE_ENV") === "production" ? "production" : "sandbox",
      apiVersion: "2025-01-01",
      keys: { appId: env("CASHFREE_APP_ID"), secretKey: env("CASHFREE_SECRET_KEY") },
      envVars: ["CASHFREE_APP_ID", "CASHFREE_SECRET_KEY", "CASHFREE_ENV"],
      // Webhooks are signed with the secret key; set this URL in Cashfree → Developers → Webhooks.
      webhookPath: "/api/webhooks/cashfree",
    },

    razorpay: {
      label: "Razorpay",
      enabled: true,
      keys: { keyId: env("RAZORPAY_KEY_ID"), keySecret: env("RAZORPAY_KEY_SECRET"), webhookSecret: env("RAZORPAY_WEBHOOK_SECRET") },
      envVars: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
      // Set this URL in Razorpay → Settings → Webhooks (events: payment.captured, payment.failed).
      webhookPath: "/api/webhooks/razorpay",
      // Shown in Razorpay's checkout window.
      brandName: "Azelle Fragrances",
      themeColor: "#1b1815",
    },

    /** Cash on delivery. No partner keys needed — the courier collects the money. */
    cod: {
      enabled: true,
      label: "Cash on delivery",
      /** Orders above this total must be paid online. */
      maxOrderValue: 5000,
      /** Extra charge for COD orders (0 = none). */
      fee: 0,
    },
  },

  // ── Shipping ───────────────────────────────────────────────────────────────
  shipping: {
    /** Partner pre-selected when the admin accepts an order. */
    defaultPartner: "shiprocket",

    /** Where parcels are collected from. `name` must match the pickup location / warehouse
        name registered in each partner's dashboard. */
    pickup: {
      name: env("PICKUP_LOCATION_NAME") || "Primary",
      postcode: env("PICKUP_PINCODE"),
    },

    /** Parcel defaults. Weight is per bottle (kg, incl. box); the admin can override at acceptance. */
    parcel: {
      weightPerSizeKg: { 30: 0.2, 50: 0.3, 100: 0.45 },
      packagingKg: 0.1,
      dimensionsCm: { length: 15, breadth: 10, height: 8 },
      hsnCode: "3303",
      productDescription: "Perfume (non-flammable packed, surface only)",
    },

    shiprocket: {
      label: "Shiprocket",
      enabled: true,
      // Create a dedicated API user in Shiprocket → Settings → API → Configure.
      keys: { email: env("SHIPROCKET_EMAIL"), password: env("SHIPROCKET_PASSWORD") },
      envVars: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD"],
      baseUrl: "https://apiv2.shiprocket.in/v1/external",
      trackingUrl: (awb) => `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`,
    },

    delhivery: {
      label: "Delhivery",
      enabled: true,
      // "staging" for test shipments, "production" for real ones.
      environment: env("DELHIVERY_ENV") === "production" ? "production" : "staging",
      keys: { token: env("DELHIVERY_API_TOKEN") },
      envVars: ["DELHIVERY_API_TOKEN", "DELHIVERY_ENV"],
      baseUrls: { staging: "https://staging-express.delhivery.com", production: "https://track.delhivery.com" },
      // Perfume goes by road.
      shippingMode: "Surface",
      trackingUrl: (awb) => `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`,
    },

    /** Always available: the admin types the courier name and tracking number by hand. */
    manual: { label: "Manual (enter AWB yourself)", enabled: true },
  },
};

const isProd = process.env.NODE_ENV === "production";

/**
 * Test mode: when a partner's keys start with "dummy" (e.g. CASHFREE_APP_ID=dummy_app), that partner is
 * simulated locally — a fake payment page, fake couriers, AWBs and tracking. Never active in production.
 */
export function isDummy(partner) {
  return !isProd && Object.values(partner?.keys ?? {}).some((v) => String(v).toLowerCase().startsWith("dummy"));
}

/** True when every key a partner needs is present. Dummy keys never count in production. */
export function hasKeys(partner) {
  if (!partner?.enabled) return false;
  if (isProd && Object.values(partner.keys ?? {}).some((v) => String(v).toLowerCase().startsWith("dummy"))) return false;
  return Object.entries(partner.keys ?? {}).every(([name, value]) => name === "webhookSecret" || Boolean(value));
}

/** Env vars a partner still needs (for the admin Settings page — names only, never values). */
export function missingEnvVars(partner) {
  const missing = [];
  for (const [name, value] of Object.entries(partner?.keys ?? {})) {
    if (!value) missing.push(partner.envVars.find((v) => v.toLowerCase().replace(/_/g, "").includes(name.toLowerCase())) ?? name);
  }
  return missing;
}
