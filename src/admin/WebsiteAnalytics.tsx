import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/products";
import { useAdminAuth } from "./AdminAuthProvider";
import { adminAnalyticsApi, type Analytics, type ClarityList } from "./adminApi";
import { Card, formatDateTime, isUnauthorized, messageOf } from "./ui";

const n = (v: number) => v.toLocaleString("en-IN");
const duration = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);

// Dashboard section: Microsoft Clarity figures (last 24 hours) next to our own orders.
export function WebsiteAnalytics() {
  const { guard } = useAdminAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      setRefreshing(refresh);
      try {
        setData(await guard(adminAnalyticsApi.get(refresh)));
        setError("");
      } catch (err) {
        if (!isUnauthorized(err)) setError(messageOf(err, "Could not load website analytics."));
      } finally {
        setRefreshing(false);
      }
    },
    [guard],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">Website analytics</p>
        <h2 className="mt-1 font-display text-[1.9rem] leading-none">Visitors · Microsoft Clarity</h2>
      </div>
    </div>
  );

  if (error) {
    return (
      <section className="mt-10">
        {header}
        <p className="mt-4 text-sm text-[#b3261e]">{error}</p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="mt-10">
        {header}
        <p className="mt-4 text-sm" role="status">
          Loading analytics…
        </p>
      </section>
    );
  }

  const { clarity } = data;
  if (!clarity.configured) {
    return (
      <section className="mt-10">
        {header}
        <Card className="mt-4">
          <p className="font-semibold">Connect Microsoft Clarity to see visitors here.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>Create a free project at clarity.microsoft.com for your website.</li>
            <li>Copy the Project ID (Settings → Overview) into CLARITY_PROJECT_ID.</li>
            <li>Generate an API token (Settings → Data Export) into CLARITY_API_TOKEN.</li>
            <li>Redeploy. Visitors start appearing within about two hours.</li>
          </ol>
        </Card>
      </section>
    );
  }

  const d = clarity.last24h;
  const maxHistory = Math.max(...clarity.history.map((h) => h.sessions), 1);

  return (
    <section className="mt-10" aria-labelledby="analytics-h">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">Website analytics · last 24 hours</p>
          <h2 id="analytics-h" className="mt-1 flex flex-wrap items-center gap-3 font-display text-[1.9rem] leading-none">
            Visitors · Microsoft Clarity
            {clarity.test && <span className="rounded-full bg-[#fff4d6] px-2.5 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-[#7a5200]">Test data</span>}
          </h2>
          <p className="mt-2 text-[13px] text-soft">
            Updated {formatDateTime(clarity.fetchedAt)} · refreshes every {clarity.refreshHours} hours (Clarity allows 10 updates a day)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary !h-10 !min-w-0 !px-4 !text-[12px]" disabled={refreshing} onClick={() => void load(true)}>
            {refreshing ? "Updating…" : "Update now"}
          </button>
          <a href={clarity.dashboardUrl} target="_blank" rel="noreferrer noopener" className="btn btn-primary !h-10 !min-w-0 !px-4 !text-[12px]">
            Heatmaps & recordings ↗
          </a>
        </div>
      </div>
      {clarity.warning && <p className="mt-3 rounded-[10px] bg-[#fbecc8] px-3 py-2 text-sm text-[#7a5200]">{clarity.warning}</p>}

      {!d ? (
        <Card className="mt-4">
          <p className="text-sm">No data yet — Clarity usually shows the first visits about two hours after the tracking code goes live.</p>
        </Card>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Visits" value={n(d.sessions)} sub={`${n(d.botSessions)} bots filtered`} />
            <Kpi label="Visitors" value={n(d.users)} sub="Unique people" />
            <Kpi label="Pages / visit" value={d.pagesPerSession.toFixed(1)} sub="Pages seen per visit" />
            <Kpi label="Active time" value={duration(d.engagementSeconds.active)} sub={`of ${duration(d.engagementSeconds.total)} on site`} />
            <Kpi label="Scroll depth" value={`${d.scrollDepth}%`} sub="Average per page" />
            <Kpi
              label="Conversion"
              value={data.conversionRate == null ? "—" : `${data.conversionRate}%`}
              sub={`${data.orders24h.orders} orders · ${formatPrice(data.orders24h.revenue)}`}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card title="Visits — last 14 days">
              {clarity.history.length < 2 ? (
                <p className="text-sm">The trend builds up day by day as Clarity data is saved.</p>
              ) : (
                <ol className="flex h-44 items-end gap-1.5" aria-label="Visits per day">
                  {clarity.history.map((h) => (
                    <li key={h.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${h.date}: ${n(h.sessions)} visits, ${n(h.users)} visitors`}>
                      <span className="block rounded-t-[4px]" style={{ height: `${(h.sessions / maxHistory) * 100}%`, background: "var(--accent)" }} />
                      <span className="sr-only">
                        {h.date}: {h.sessions} visits
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {clarity.history.length >= 2 && (
                <div className="mt-2 flex justify-between text-[11px] text-soft">
                  <span>{clarity.history[0].date}</span>
                  <span>{clarity.history[clarity.history.length - 1].date}</span>
                </div>
              )}
            </Card>
            <Card title="Visitor experience">
              <p className="mb-3 text-[13px] text-soft">Share of visits with each problem — watch these in Clarity recordings.</p>
              <dl className="space-y-2 text-sm">
                <Issue label="Rage clicks" hint="repeated angry clicks" v={d.issues.rageClicks} />
                <Issue label="Dead clicks" hint="clicks that do nothing" v={d.issues.deadClicks} />
                <Issue label="Quick backs" hint="left a page right away" v={d.issues.quickbacks} />
                <Issue label="Excessive scrolling" hint="searching for something" v={d.issues.excessiveScroll} />
                <Issue label="JavaScript errors" hint="" v={d.issues.scriptErrors} />
              </dl>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ListCard title="Top pages" rows={d.popularPages} />
            <ListCard title="Traffic sources" rows={d.referrers} />
            <ListCard title="Devices" rows={d.devices} />
            <ListCard title="Countries" rows={d.countries} />
          </div>
        </>
      )}
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 font-sans text-[1.5rem] font-bold leading-none tracking-tight">{value}</p>
      <p className="mt-1.5 text-[12.5px] text-soft">{sub}</p>
    </div>
  );
}

function Issue({ label, hint, v }: { label: string; hint: string; v: { sessions: number; percent: number } }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>
        {label}
        {hint && <span className="text-[12px] text-soft"> · {hint}</span>}
      </dt>
      <dd className="shrink-0 font-semibold tabular-nums">
        {v.percent}% <span className="font-normal text-soft">({n(v.sessions)})</span>
      </dd>
    </div>
  );
}

// Horizontal bars, one hue; the value is written beside each bar.
function ListCard({ title, rows }: { title: string; rows: ClarityList }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <p className="text-sm">No data yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{n(r.value)}</span>
              </div>
              <span className="mt-1 block h-1.5 rounded-full bg-surface2" aria-hidden="true">
                <span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: "var(--accent)" }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
