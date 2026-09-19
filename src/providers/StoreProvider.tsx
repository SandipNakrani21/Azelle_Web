import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { initAnalytics } from "@/lib/analytics";
import { api } from "@/lib/api";
import type { Coupon } from "@/lib/coupons";
import { SHIPPING, TAX_RATE } from "@/lib/products";

export type StoreConfig = {
  gstRate: number;
  shippingFee: number;
  maxQtyPerLine: number;
  coupons: Coupon[];
  analytics?: { clarityProjectId: string; enabled: boolean; test: boolean };
  payments: {
    /** At least one online gateway (Cashfree / Razorpay) is configured. */
    online: boolean;
    cod: { enabled: boolean; maxOrderValue: number; fee: number };
  };
};

type StoreContextValue = StoreConfig & { status: "loading" | "ready" | "error" };

// Used until /api/store answers (same values as server/src/commerce.config.js).
const FALLBACK: StoreConfig = {
  gstRate: TAX_RATE,
  shippingFee: SHIPPING,
  maxQtyPerLine: 10,
  coupons: [],
  payments: { online: false, cod: { enabled: false, maxOrderValue: 0, fee: 0 } },
};

const StoreContext = createContext<StoreContextValue | null>(null);

/** Store charges, public coupons and available payment methods — all decided by the server. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StoreConfig>(FALLBACK);
  const [status, setStatus] = useState<StoreContextValue["status"]>("loading");

  useEffect(() => {
    let cancelled = false;
    api<StoreConfig>("/api/store").then(
      (data) => {
        if (cancelled) return;
        setConfig(data);
        setStatus("ready");
        if (data.analytics) initAnalytics({ projectId: data.analytics.clarityProjectId, enabled: data.analytics.enabled, test: data.analytics.test });
      },
      () => {
        if (!cancelled) setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ ...config, status }), [config, status]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
