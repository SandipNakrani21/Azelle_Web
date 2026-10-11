import { analyticsConsent } from "./consent";
// First-party visit log. Microsoft Clarity shows how the site is used but never who is using it,
// so every page view is also sent to our own API: one row per browser, with the email attached the
// moment the shopper signs in, signs up or orders (see server/src/models/Visit.js).
// Never runs on /admin.

const VISITOR_KEY = "azelle.visitor";
const SESSION_KEY = "azelle.visit.session";
const IDENTITY_KEY = "azelle.visit.identity";

type Identity = { email: string; name?: string; phone?: string; via: "signin" | "signup" | "order" | "newsletter" };

const randomId = (prefix: string) => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
};

function stored(area: Storage, key: string, make: () => string): string {
  try {
    const found = area.getItem(key);
    if (found) return found;
    const made = make();
    area.setItem(key, made);
    return made;
  } catch {
    // Private mode or storage turned off: this visit simply isn't linked to the next one.
    return make();
  }
}

/** Stable per browser. */
const visitorId = () => stored(localStorage, VISITOR_KEY, () => randomId("v"));
/** New after the tab is closed — that is what counts as a separate visit. */
const sessionId = () => stored(sessionStorage, SESSION_KEY, () => randomId("s"));

function identity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

/** Remembers who this browser belongs to, so later page views carry the email too. */
export function identifyVisitor(next: Identity) {
  if (!analyticsConsent() || !next?.email) return;
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(next));
  } catch {
    // Not stored — the beacon below still sends it for this page view.
  }
  void sendVisit(window.location.pathname, next);
}

/** Forgets the identity on sign-out; the anonymous visitor id stays. */
export function forgetVisitorIdentity() {
  try {
    localStorage.removeItem(IDENTITY_KEY);
  } catch {
    // nothing to clean up
  }
}

function campaign() {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source") ?? "",
    medium: params.get("utm_medium") ?? "",
    campaign: params.get("utm_campaign") ?? "",
  };
}

/** One page view. Fire-and-forget: a failure here must never affect the page. */
export async function sendVisit(path: string, who: Identity | null = identity()) {
  if (!analyticsConsent() || /^\/(admin|mock-payment)/.test(path)) return;
  const body = JSON.stringify({
    visitorId: visitorId(),
    sessionId: sessionId(),
    path,
    title: document.title.slice(0, 120),
    referrer: document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : "",
    utm: campaign(),
    ...(who ? { identity: who } : {}),
  });
  try {
    await fetch("/api/store/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    // Offline or blocked — the visit just isn't logged.
  }
}
