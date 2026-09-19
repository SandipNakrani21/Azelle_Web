import mongoose from "mongoose";
import { commerce, hasKeys, isDummy } from "../commerce.config.js";
import { partnerFetch } from "../integrations/http.js";

// Microsoft Clarity Data Export API: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api
// Limits: 10 requests per project per day, data for the last 1–3 days only. So every fetch is saved as a
// snapshot, the dashboard reads the latest one, and a new fetch happens at most every `refreshHours`.

const cfg = commerce.analytics.clarity;
const ENDPOINT = "https://www.clarity.ms/export-data/api/v1/project-live-insights";
const DAILY_LIMIT = 10;

const snapshotSchema = new mongoose.Schema(
  {
    source: { type: String, default: "clarity" },
    fetchedAt: { type: Date, default: Date.now, index: true },
    days: { type: Number, default: 1 },
    test: { type: Boolean, default: false },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
  { versionKey: false },
);
export const AnalyticsSnapshot = mongoose.models.AnalyticsSnapshot ?? mongoose.model("AnalyticsSnapshot", snapshotSchema);

export const clarityConfigured = () => hasKeys(cfg);
export const clarityIsTest = () => isDummy(cfg);

const num = (v) => {
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Turns Clarity's response ([{ metricName, information: [...] }]) into dashboard figures.
 * The export format may gain fields over time, so lists are read generically: the first text field is
 * the label and the first numeric field is the value.
 */
export function normalizeClarity(raw) {
  const metrics = new Map((Array.isArray(raw) ? raw : []).map((m) => [String(m.metricName ?? "").replace(/\s|\//g, "").toLowerCase(), m.information ?? []]));
  const first = (name) => metrics.get(name)?.[0] ?? {};
  const pick = (obj, ...keys) => {
    for (const k of Object.keys(obj)) if (keys.includes(k.toLowerCase())) return num(obj[k]);
    return 0;
  };

  const traffic = metrics.get("traffic") ?? [];
  const sum = (key) => traffic.reduce((n, row) => n + pick(row, key), 0);
  const sessions = sum("totalsessioncount");
  const bots = sum("totalbotsessioncount");
  const users = sum("distantusercount") || sum("distinctusercount");
  const pagesPerSession = traffic.length ? pick(traffic[0], "pagespersessionpercentage") : 0;

  const engagement = first("engagementtime");
  const issue = (name) => {
    const row = first(name);
    return { sessions: pick(row, "sessionscount", "subtotal"), percent: pick(row, "sessionswithmetricpercentage") };
  };

  const list = (name, limit = 6) =>
    (metrics.get(name) ?? [])
      .map((row) => {
        const entries = Object.entries(row);
        const label = entries.find(([, v]) => typeof v === "string" && Number.isNaN(Number(v)))?.[1] ?? "Other";
        const value = num(entries.find(([k, v]) => k !== "name" && !Number.isNaN(Number(v)) && v !== "")?.[1]);
        return { label: String(label), value };
      })
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

  return {
    sessions,
    botSessions: bots,
    users,
    pagesPerSession: Math.round(pagesPerSession * 100) / 100,
    engagementSeconds: { total: pick(engagement, "totaltime"), active: pick(engagement, "activetime") },
    scrollDepth: Math.round(pick(first("scrolldepth"), "averagescrolldepth") * 10) / 10,
    issues: {
      rageClicks: issue("rageclickcount"),
      deadClicks: issue("deadclickcount"),
      quickbacks: issue("quickbackclick"),
      excessiveScroll: issue("excessivescroll"),
      scriptErrors: issue("scripterrorcount"),
      errorClicks: issue("errorclickcount"),
    },
    popularPages: list("popularpages"),
    devices: list("device"),
    countries: metrics.has("country") ? list("country") : list("countryregion"),
    browsers: list("browser"),
    referrers: list("referrerurl"),
  };
}

// Plausible sample data for test mode (dummy token) — never used with a real token.
function sampleResponse() {
  const r = (min, max) => String(Math.round(min + Math.random() * (max - min)));
  return [
    { metricName: "Traffic", information: [{ totalSessionCount: r(380, 460), totalBotSessionCount: r(20, 40), distantUserCount: r(300, 360), PagesPerSessionPercentage: 2.7 }] },
    { metricName: "EngagementTime", information: [{ totalTime: r(140, 180), activeTime: r(70, 95) }] },
    { metricName: "ScrollDepth", information: [{ averageScrollDepth: 58.4 }] },
    { metricName: "RageClickCount", information: [{ sessionsCount: r(4, 9), sessionsWithMetricPercentage: 1.6 }] },
    { metricName: "DeadClickCount", information: [{ sessionsCount: r(20, 35), sessionsWithMetricPercentage: 6.8 }] },
    { metricName: "QuickbackClick", information: [{ sessionsCount: r(10, 18), sessionsWithMetricPercentage: 3.4 }] },
    { metricName: "ExcessiveScroll", information: [{ sessionsCount: r(2, 6), sessionsWithMetricPercentage: 1.1 }] },
    { metricName: "ScriptErrorCount", information: [{ sessionsCount: r(0, 3), sessionsWithMetricPercentage: 0.4 }] },
    { metricName: "ErrorClickCount", information: [{ sessionsCount: r(0, 2), sessionsWithMetricPercentage: 0.2 }] },
    {
      metricName: "PopularPages",
      information: [
        { url: "/", visitsCount: r(300, 360) },
        { url: "/collection", visitsCount: r(150, 190) },
        { url: "/product/imperium", visitsCount: r(90, 120) },
        { url: "/product/white-oud", visitsCount: r(70, 95) },
        { url: "/checkout", visitsCount: r(25, 40) },
        { url: "/pages/our-story", visitsCount: r(15, 25) },
      ],
    },
    { metricName: "Device", information: [{ name: "Mobile", sessionsCount: r(250, 300) }, { name: "PC", sessionsCount: r(90, 120) }, { name: "Tablet", sessionsCount: r(15, 25) }] },
    { metricName: "Country", information: [{ name: "India", sessionsCount: r(360, 420) }, { name: "United Arab Emirates", sessionsCount: r(8, 15) }, { name: "United States", sessionsCount: r(4, 9) }] },
    { metricName: "Browser", information: [{ name: "Chrome", sessionsCount: r(280, 330) }, { name: "Safari", sessionsCount: r(60, 80) }, { name: "Samsung Internet", sessionsCount: r(15, 25) }, { name: "Edge", sessionsCount: r(8, 14) }] },
    { metricName: "ReferrerUrl", information: [{ name: "instagram.com", sessionsCount: r(110, 150) }, { name: "google.com", sessionsCount: r(70, 100) }, { name: "wa.me", sessionsCount: r(30, 45) }, { name: "facebook.com", sessionsCount: r(10, 20) }] },
  ];
}

const pickTrend = (n) => ({ sessions: n.sessions, users: n.users });

// Test mode: 14 days of sample visits so the trend chart can be tried out.
function sampleHistory() {
  const out = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000 - i * 24 * 60 * 60 * 1000);
    const base = 300 + Math.round(60 * Math.sin(i / 2)) + (13 - i) * 6;
    out.push({ date: d.toISOString().slice(0, 10), sessions: base, users: Math.round(base * 0.8) });
  }
  return out;
}

async function callsToday() {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  return AnalyticsSnapshot.countDocuments({ source: "clarity", fetchedAt: { $gte: since }, test: false });
}

/**
 * Latest Clarity figures. Fetches a fresh snapshot when the last one is older than `refreshHours`
 * (or when `force` is set and at least 30 minutes have passed), always staying under the daily limit.
 */
export async function getClarityInsights({ force = false } = {}) {
  if (!clarityConfigured()) return { configured: false };

  const test = clarityIsTest();
  const latest = await AnalyticsSnapshot.findOne({ source: "clarity", test }).sort({ fetchedAt: -1 }).lean();
  const ageMs = latest ? Date.now() - latest.fetchedAt.getTime() : Infinity;
  const due = ageMs > cfg.refreshHours * 60 * 60 * 1000 || (force && ageMs > 30 * 60 * 1000);

  let snapshot = latest;
  let warning = "";
  if (due) {
    const used = test ? 0 : await callsToday();
    if (used >= DAILY_LIMIT - 1) {
      warning = "Clarity's daily export limit is almost used up — showing the last saved figures.";
    } else {
      try {
        const raw = test
          ? sampleResponse()
          : await partnerFetch("Microsoft Clarity", `${ENDPOINT}?numOfDays=1`, { headers: { Authorization: `Bearer ${cfg.keys.apiToken}` } });
        snapshot = (await AnalyticsSnapshot.create({ source: "clarity", days: 1, test, raw })).toObject();
      } catch (err) {
        warning = `${err.message} Showing the last saved figures.`;
      }
    }
  }

  // History: one point per day (the latest snapshot of each day), for the trend line.
  const history = await AnalyticsSnapshot.aggregate([
    { $match: { source: "clarity", test } },
    { $sort: { fetchedAt: 1 } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$fetchedAt", timezone: "Asia/Kolkata" } }, raw: { $last: "$raw" } } },
    { $sort: { _id: -1 } },
    { $limit: 14 },
  ]);

  return {
    configured: true,
    test,
    projectId: cfg.projectId,
    dashboardUrl: cfg.dashboardUrl,
    refreshHours: cfg.refreshHours,
    fetchedAt: snapshot?.fetchedAt ?? null,
    warning,
    last24h: snapshot ? normalizeClarity(snapshot.raw) : null,
    history: test ? sampleHistory() : history.map((h) => ({ date: h._id, ...pickTrend(normalizeClarity(h.raw)) })).reverse(),
  };
}
