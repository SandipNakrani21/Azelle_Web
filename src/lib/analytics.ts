// Microsoft Clarity on the storefront: page views, heatmaps and recordings come from its script;
// a few custom events (add to cart, checkout, purchase, review) make the funnel visible in Clarity.
// Never loaded on /admin (and admin pages are masked anyway, see AdminLayout).

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

let mode: "off" | "live" | "test" = "off";

/** Injects the official Clarity tag. In test mode (dummy project id) events are only logged to the console. */
export function initAnalytics({ projectId, enabled, test }: { projectId: string; enabled: boolean; test: boolean }) {
  if (mode !== "off" || !enabled || !projectId) return;
  if (/^\/(admin|mock-payment)/.test(window.location.pathname)) return;
  if (test) {
    mode = "test";
    console.info("[analytics] Microsoft Clarity in test mode — events are logged here instead of being sent.");
    return;
  }
  mode = "live";
  // Official snippet from Clarity → Settings → Setup, written out.
  const clarity: ClarityFn = (...args: unknown[]) => {
    (clarity.q = clarity.q || []).push(args);
  };
  window.clarity = window.clarity || clarity;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  document.head.appendChild(script);
}

/** Custom event, e.g. "add_to_cart" — filterable in Clarity's dashboard and recordings. */
export function trackEvent(name: string) {
  if (mode === "live") window.clarity?.("event", name);
  else if (mode === "test") console.info("[analytics] event:", name);
}

/** Custom tag on the current session, e.g. ("order_value", "1278.82"). */
export function setTag(key: string, value: string) {
  if (mode === "live") window.clarity?.("set", key, value);
  else if (mode === "test") console.info("[analytics] tag:", key, "=", value);
}
