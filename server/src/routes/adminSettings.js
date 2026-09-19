import { Router } from "express";
import { commerce, hasKeys, isDummy, missingEnvVars } from "../commerce.config.js";
import { siteOrigin } from "../services/orders.js";

// Read-only view of commerce.config.js: which partners are live and which keys are still missing.
// Secret values are never sent — only the names of the environment variables.
export const adminSettingsRouter = Router();

adminSettingsRouter.get("/", (req, res) => {
  const origin = siteOrigin(req);
  const { store, payments, shipping } = commerce;

  res.json({
    store: { gstRate: store.gstRate, shippingFee: store.shippingFee, maxQtyPerLine: store.maxQtyPerLine, siteUrl: origin },
    payments: payments.order.map((id) => {
      const p = payments[id];
      return {
        id,
        label: p.label,
        configured: hasKeys(p),
        environment: isDummy(p) ? "test mode (dummy keys)" : id === "cashfree" ? p.environment : p.keys.keyId.startsWith("rzp_live_") ? "live" : p.keys.keyId ? "test" : "",
        missing: missingEnvVars(p),
        webhookUrl: `${origin}${p.webhookPath}`,
        webhookReady: isDummy(p) || (id === "razorpay" ? Boolean(p.keys.webhookSecret) : hasKeys(p)),
      };
    }),
    cod: payments.cod,
    analytics: {
      label: commerce.analytics.clarity.label,
      configured: hasKeys(commerce.analytics.clarity) && Boolean(commerce.analytics.clarity.projectId),
      environment: isDummy(commerce.analytics.clarity) ? "test mode (dummy keys)" : "live",
      missing: [...missingEnvVars(commerce.analytics.clarity), ...(commerce.analytics.clarity.projectId ? [] : ["CLARITY_PROJECT_ID"])],
      refreshHours: commerce.analytics.clarity.refreshHours,
    },
    shipping: {
      defaultPartner: shipping.defaultPartner,
      pickup: { name: shipping.pickup.name, postcode: shipping.pickup.postcode },
      parcel: { ...shipping.parcel },
      partners: ["shiprocket", "delhivery"].map((id) => {
        const p = shipping[id];
        return { id, label: p.label, configured: hasKeys(p), environment: isDummy(p) ? "test mode (dummy keys)" : p.environment ?? "live", missing: missingEnvVars(p) };
      }),
    },
  });
});
