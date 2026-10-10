import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AreaChart, DonutChart, KpiCard } from "../charts";
import { IconClock, IconCustomers, IconEye, IconVisitors } from "../icons";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminVisitorsApi, type AdminVisitor, type VisitorSummary } from "../adminApi";
import { Card, EmptyState, ExportButton, FilterSelect, formatDateTime, isUnauthorized, ListToolbar, messageOf, NoticeBanner, PageHeader, Pagination, useNotice } from "../ui";

// Dashboards → Visitors. Clarity tells us how the site is used; this page tells us who is using it:
// one row per browser, with the email as soon as they sign in, sign up or order.

const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

const number = (v: number) => Math.round(v).toLocaleString("en-IN");

const WHO = [
  { id: "all", label: "Everyone" },
  { id: "known", label: "Known (email)" },
  { id: "anon", label: "Not yet known" },
];

const DEVICE_LABEL: Record<string, string> = { mobile: "Mobile", tablet: "Tablet", desktop: "Desktop" };

function relative(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export default function AdminVisitors() {
  const { guard } = useAdminAuth();
  const [days, setDays] = useState(30);
  const [who, setWho] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<VisitorSummary | null>(null);
  const [list, setList] = useState<{ visitors: AdminVisitor[]; total: number; page: number; pages: number } | null>(null);
  const [open, setOpen] = useState<string>("");
  const [notice, setNotice] = useNotice();
  const requestId = useRef(0);

  const loadSummary = useCallback(
    async (d: number) => {
      try {
        setSummary(await guard(adminVisitorsApi.summary(d)));
      } catch (err) {
        if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not load visitor totals.") });
      }
    },
    [guard, setNotice],
  );

  const loadList = useCallback(
    async (q: string, w: string, d: number, p: number) => {
      const id = ++requestId.current;
      try {
        const result = await guard(adminVisitorsApi.list({ q, who: w, days: d, page: p }));
        if (id === requestId.current) setList(result);
      } catch (err) {
        if (id === requestId.current && !isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not load visitors.") });
      }
    },
    [guard, setNotice],
  );

  useEffect(() => {
    document.title = "Visitors — Azelle admin";
  }, []);

  useEffect(() => {
    void loadSummary(days);
  }, [days, loadSummary]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadList(query.trim(), who, days, page), query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [query, who, days, page, loadList]);

  const totals = summary?.totals;
  const knownShare = totals && totals.visitors > 0 ? Math.round((totals.known / totals.visitors) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Visitors"
        subtitle="Our own record of who comes to the site. An email appears as soon as someone signs in, signs up or places an order — Microsoft Clarity only ever reports totals, never a person."
        actions={<ExportButton path={`/api/admin/visitors/export?days=${days}&who=${who}`} perm="visitors.export" />}
      />
      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      <div className="mt-8 flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            onClick={() => {
              setDays(r.days);
              setPage(1);
            }}
            aria-pressed={days === r.days}
            className={`rounded-full px-4 py-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 ${
              days === r.days ? "bg-ink text-surface" : "border border-line hover:border-ink"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Visitors"
          value={totals?.visitors ?? 0}
          format={number}
          sub={`${number(totals?.returning ?? 0)} came back`}
          icon={IconVisitors}
          gradient="linear-gradient(135deg,#2a78d6,#63a4f0)"
          spark={summary?.daily.map((d) => d.visitors)}
        />
        <KpiCard
          label="Page views"
          value={totals?.pageViews ?? 0}
          format={number}
          sub={`${number(totals?.sessions ?? 0)} visits`}
          icon={IconEye}
          gradient="linear-gradient(135deg,#eb6834,#f2a07c)"
          spark={summary?.daily.map((d) => d.views)}
        />
        <KpiCard
          label="Known visitors"
          value={totals?.known ?? 0}
          format={number}
          sub={`${knownShare}% of everyone — we have their email`}
          icon={IconCustomers}
          gradient="linear-gradient(135deg,#1baf7a,#69d3ab)"
        />
        <KpiCard
          label="On the site now"
          value={totals?.live ?? 0}
          format={number}
          sub="Active in the last 5 minutes"
          icon={IconClock}
          gradient="linear-gradient(135deg,#eda100,#f5c55c)"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Visitors each day" delay={80}>
          {summary && summary.daily.length > 0 ? (
            <AreaChart data={summary.daily.map((d) => ({ label: d.date, value: d.visitors }))} format={number} caption="Visitors each day" />
          ) : (
            <p className="py-10 text-center text-sm text-soft">No visits recorded yet.</p>
          )}
        </Card>
        <Card title="Devices" delay={140}>
          {summary && summary.devices.length > 0 ? (
            <DonutChart
              data={summary.devices.map((d) => ({ label: DEVICE_LABEL[d.device] ?? d.device, value: d.visitors }))}
              caption="Visitors by device"
              center={number(totals?.visitors ?? 0)}
            />
          ) : (
            <p className="py-10 text-center text-sm text-soft">Nothing yet.</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Most viewed pages" delay={180}>
          {summary && summary.pages.length > 0 ? (
            <ul className="divide-y divide-line text-sm">
              {summary.pages.map((p) => (
                <li key={p.path} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="truncate">{p.path}</span>
                  <span className="shrink-0 tabular-nums font-semibold">{number(p.views)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-soft">Nothing yet.</p>
          )}
        </Card>
        <Card title="Where they come from" delay={220}>
          {summary && summary.sources.length > 0 ? (
            <ul className="divide-y divide-line text-sm">
              {summary.sources.map((s) => (
                <li key={s.source} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="truncate">{s.source}</span>
                  <span className="shrink-0 tabular-nums font-semibold">{number(s.visitors)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-soft">Nothing yet.</p>
          )}
        </Card>
      </div>

      {/* ── The list itself ─────────────────────────────────────────────── */}
      <ListToolbar
        query={query}
        onQuery={(v) => {
          setQuery(v);
          setPage(1);
        }}
        placeholder="Search email, name, mobile, page or source"
        right={list ? `${list.total} ${list.total === 1 ? "visitor" : "visitors"}` : undefined}
      >
        <FilterSelect
          label="Filter"
          value={who}
          onChange={(v) => {
            setWho(v);
            setPage(1);
          }}
          options={WHO.map((w) => ({ value: w.id, label: w.label }))}
        />
      </ListToolbar>

      <div className="admin-card admin-rise mt-4 overflow-x-auto rounded-[20px]">
        {!list ? (
          <p className="p-10 text-center text-sm" role="status">
            Loading visitors…
          </p>
        ) : list.visitors.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No visitors in this range"
              body="Open the storefront in another tab and browse a page or two — it shows up here within a few seconds."
            />
          </div>
        ) : (
          <table className="admin-table min-w-[1000px]">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Mobile</th>
                <th className="!text-right">Visits</th>
                <th className="!text-right">Pages</th>
                <th>Source</th>
                <th>Device</th>
                <th className="!text-left">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {list.visitors.map((v, i) => (
                <Fragment key={v.id}>
                  <tr
                    className="admin-rise cursor-pointer"
                    style={{ animationDelay: `${i * 35}ms` }}
                    onClick={() => setOpen(open === v.id ? "" : v.id)}
                  >
                    <td>
                      {v.email ? (
                        <>
                          <p className="font-semibold">
                            {v.name || "Customer"}
                            {v.hasAccount && <span className="ml-2 rounded-full bg-[#dcefe2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1f6a3c]">Account</span>}
                            {v.orders > 0 && <span className="ml-2 rounded-full bg-[#dfe9f7] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1f4f8f]">{v.orders} orders</span>}
                          </p>
                          <p className="text-[12.5px] text-soft">{v.email}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-soft">Not signed in yet</p>
                          <p className="text-[12px] text-soft">{v.visitorId.slice(0, 12)}…</p>
                        </>
                      )}
                    </td>
                    <td className="tabular-nums">{v.phone || "—"}</td>
                    <td className="!text-right tabular-nums">{v.sessions}</td>
                    <td className="!text-right tabular-nums">{v.pageViews}</td>
                    <td>
                      {v.source}
                      {v.utm.campaign && <span className="block text-[12px] text-soft">{v.utm.campaign}</span>}
                    </td>
                    <td>
                      {DEVICE_LABEL[v.device] ?? v.device}
                      <span className="block text-[12px] text-soft">
                        {v.browser} · {v.os}
                      </span>
                    </td>
                    <td>
                      {relative(v.lastSeen)}
                      <span className="block text-[12px] text-soft">{v.lastPath}</span>
                    </td>
                  </tr>
                  {open === v.id && (
                    <tr className="bg-surface2/40">
                      <td colSpan={7} className="!text-left">
                        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-soft">Last pages</p>
                            <ol className="mt-2 space-y-1.5 text-[13px]">
                              {[...v.pages].reverse().map((p, idx) => (
                                <li key={`${p.path}-${idx}`} className="flex justify-between gap-4">
                                  <span className="truncate">{p.title || p.path}</span>
                                  <span className="shrink-0 text-soft">{formatDateTime(p.at)}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                          <dl className="space-y-1.5 text-[13px]">
                            <div className="flex justify-between gap-4">
                              <dt className="text-soft">Landed on</dt>
                              <dd className="truncate">{v.landingPath}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-soft">Referrer</dt>
                              <dd className="truncate">{v.referrer || "Direct"}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-soft">First seen</dt>
                              <dd>{formatDateTime(v.firstSeen)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-soft">Known from</dt>
                              <dd>{v.identifiedVia || "—"}</dd>
                            </div>
                            {v.email && (
                              <div className="pt-2">
                                <Link to={`/admin/orders?email=${encodeURIComponent(v.email)}`} className="abtn abtn-ghost">
                                  See their orders
                                </Link>
                              </div>
                            )}
                          </dl>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {list && <Pagination page={list.page} pages={list.pages} total={list.total} onChange={setPage} />}
    </div>
  );
}
