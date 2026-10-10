import { api } from "./api";

/** A launch, offer or notice, written in the admin panel (Catalogue → Announcements). */
export type Announcement = {
  id: string;
  eyebrow: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  placement: "both" | "popup" | "ribbon";
  tone: "gradient" | "light" | "dark";
  image: string;
  dismissDays: number;
  updatedAt: string;
};

const SEEN_KEY = "azelle.announcements";

type Seen = Record<string, number>;

function seen(): Seen {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Seen) : {};
  } catch {
    return {};
  }
}

/** True while a dismissal is still in force (the admin sets how many days that lasts). */
export function isDismissed(a: Announcement): boolean {
  const until = seen()[a.id];
  return typeof until === "number" && until > Date.now();
}

export function rememberDismissal(a: Announcement) {
  try {
    const days = Number.isFinite(a.dismissDays) ? a.dismissDays : 7;
    // 0 days means "show it again on the next visit", so the popup doesn't nag within one visit only.
    localStorage.setItem(SEEN_KEY, JSON.stringify({ ...seen(), [a.id]: Date.now() + Math.max(0.02, days) * 24 * 60 * 60 * 1000 }));
  } catch {
    // Storage off: the popup may come back on the next page. Nothing breaks.
  }
}

export const announcementsApi = {
  list: () => api<{ announcements: Announcement[] }>("/api/store/announcements"),
  /** Shown / clicked / dismissed — the counts an admin sees next to each announcement. */
  count: (id: string, event: "view" | "click" | "dismiss") => {
    try {
      void fetch(`/api/store/announcements/${encodeURIComponent(id)}/${event}`, { method: "POST", keepalive: true, credentials: "same-origin" }).catch(() => {});
    } catch {
      // Never let a counter get in the way.
    }
  },
};
