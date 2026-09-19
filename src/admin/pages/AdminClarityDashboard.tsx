import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/products";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminAnalyticsApi, type Analytics, type ClarityList } from "../adminApi";
import { AreaChart, DonutChart, KpiCard } from "../charts";
import { IconClarity, IconClock, IconCustomers, IconEye, IconTrend } from "../icons";
import { ActionButton, Card, ExportButton, formatDateTime, isUnauthorized, messageOf, PageHeader } from "../ui";

const whole = (v: number) => Math.round(v).toLocaleString("en-IN");
const oneDecimal = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const percent = (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)}%`;
const duration = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// Clarity dashboard: visitors and behaviour from Microsoft Clarity (last 24 hours), with the conversion
// rate worked out from our own orders.
export default function AdminClarityDashboard() {
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
    document.title = "Clarity dashboard — Azelle admin";
    void load();
  }, [load]);

  if (error) return <p className="py-20 text-center">{error}</p>;
  if (!data) return <p className="py-20 text-center text-sm" role="status">Loading analytics…</p>;

  const { clarity } = data;
  if (!clarity.configured) {
    return (
      <div>
        <PageHeader eyebrow="Microsoft Clarity" title="Clarity dashboard" />
        <Card className="mt-8">
          <p className="font-semibold">Connect Microsoft Clarity to see visitors here.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>Create a free project at clarity.microsoft.com.</li>
            <li>Copy the Project ID (Settings → Overview) into CLARITY_PROJECT_ID.</li>
            <li>Generate an API token (Settings → Data Export) into CLARITY_API_TOKEN.</li>
            <li>Redeploy. Visitors appear within about two hours.</li>
          </ol>
        </Card>
      </div>
    );
  }

  const d = clarity.last24h;
  const trend = clarity.history.map((h) => ({ label: day(h.date), value: h.sessions, sub: `${whole(h.users)} visitors` }));

  return (
    <div>
      <PageHeader
        eyebrow="Microsoft Clarity · last 24 hours"
        title="Clarity dashboard"
        subtitle={
          <>
            {clarity.test && <span className="mr-2 rounded-full bg-[#fff4d6] px-2 py-0.5 text-[11px] font-bold uppercase text-[#7a5200]">Test data</span>}
            Updated {formatDateTime(clarity.fetchedAt)} · refreshes every {clarity.refreshHours} hours (Clarity allows 10 updates a day).
          </>
        }
        actions={
          <>
            <ActionButton kind="refresh" disabled={refreshing} onClick={() => void load(true)}>
              {refreshing ? "Updating…" : "Update now"}
            </ActionButton>
            <ExportButton path="/api/admin/analytics/export" perm="analytics.export" />
            <a href={clarity.dashboardUrl} target="_blank" rel="noreferrer noopener" className="abtn abtn-add">
              <IconClarity size={16} /> Heatmaps & recordings
            </a>
          </>
        }
      />
      {clarity.warning && <p className="mt-4 rounded-[10px] bg-[#fbecc8] px-3 py-2 text-sm text-[#7a5200]">{clarity.warning}</p>}

      {!d ? (
        <Card className="mt-8">
          <p className="text-sm">No data yet — Clarity usually shows the first visits about two hours after the tracking code goes live.</p>
        </Card>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Visits" value={d.sessions} format={whole} sub={`${whole(d.botSessions)} bots filtered out`} icon={IconEye} gradient="linear-gradient(135deg,#e6b45a,#c9772b)" spark={clarity.history.map((h) => h.sessions)} />
            <KpiCard label="Visitors" value={d.users} format={whole} sub={`${oneDecimal(d.pagesPerSession)} pages per visit`} icon={IconCustomers} gradient="linear-gradient(135deg,#e9a58f,#b46a7a)" spark={clarity.history.map((h) => h.users)} delay={80} />
            <KpiCard label="Active time" value={d.engagementSeconds.active} format={duration} sub={`of ${duration(d.engagementSeconds.total)} on site · ${d.scrollDepth}% scrolled`} icon={IconClock} gradient="linear-gradient(135deg,#9fc2ad,#3f6b58)" delay={160} />
            <KpiCard
              label="Conversion"
              value={data.conversionRate ?? 0}
              format={percent}
              sub={`${data.orders24h.orders} orders · ${formatPrice(data.orders24h.revenue)}`}
              icon={IconTrend}
              gradient="linear-gradient(135deg,#b46a7a,#5a2e35)"
              delay={240}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card title="Visits — last 14 days" delay={100}>
              {trend.length < 2 ? <p className="text-sm">The trend builds up day by day as Clarity data is saved.</p> : <AreaChart data={trend} format={whole} caption="Visits per day" />}
            </Card>
            <Card title="Devices" delay={180}>
              <DonutChart data={d.devices.slice(0, 5)} caption="Visits by device" center="Visits" />
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card title="Visitor experience" delay={120}>
              <p className="mb-4 text-[13px] text-soft">Share of visits with each problem — watch them in Clarity recordings.</p>
              <ul className="space-y-3.5">
                <Issue label="Rage clicks" hint="repeated angry clicks" v={d.issues.rageClicks} />
                <Issue label="Dead clicks" hint="clicks that do nothing" v={d.issues.deadClicks} />
                <Issue label="Quick backs" hint="left a page right away" v={d.issues.quickbacks} />
                <Issue label="Excessive scrolling" hint="searching for something" v={d.issues.excessiveScroll} />
                <Issue label="JavaScript errors" hint="" v={d.issues.scriptErrors} />
              </ul>
            </Card>
            <Card title="Traffic sources" delay={200}>
              <DonutChart data={d.referrers.slice(0, 5)} caption="Visits by traffic source" center="Visits" />
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ListCard title="Top pages" rows={d.popularPages} delay={120} />
            <ListCard title="Countries" rows={d.countries} delay={180} />
            <ListCard title="Browsers" rows={d.browsers} delay={240} />
          </div>
        </>
      )}
    </div>
  );
}

function Issue({ label, hint, v }: { label: string; hint: string; v: { sessions: number; percent: number } }) {
  const width = Math.min(100, v.percent * 5); // 20% of visits fills the bar
  return (
    <li className="text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span>
          {label}
          {hint && <span className="text-[12px] text-soft"> · {hint}</span>}
        </span>
        <span className="shrink-0 font-semibold tabular-nums">
          {v.percent}% <span className="font-normal text-soft">({whole(v.sessions)})</span>
        </span>
      </div>
      <span className="mt-1.5 block h-1.5 rounded-full bg-surface2" aria-hidden="true">
        <span className="admin-fade block h-full rounded-full" style={{ width: `${width}%`, background: "var(--menu-gradient)" }} />
      </span>
    </li>
  );
}

// One-hue horizontal bars with the value written beside each.
function ListCard({ title, rows, delay }: { title: string; rows: ClarityList; delay: number }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Card title={title} delay={delay}>
      {rows.length === 0 ? (
        <p className="text-sm">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.label} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{whole(r.value)}</span>
              </div>
              <span className="mt-1 block h-1.5 rounded-full bg-surface2" aria-hidden="true">
                <span className="admin-fade block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: "var(--accent)", animationDelay: `${i * 60}ms` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
