import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sized } from "@/lib/images";
import { formatPrice } from "@/lib/products";
import { useAdminAuth } from "../AdminAuthProvider";
import { WebsiteAnalytics } from "../WebsiteAnalytics";
import { adminCommerceApi, type Dashboard } from "../adminApi";
import { Card, EmptyState, formatDateTime, isUnauthorized, messageOf, PageHeader, paymentSummary, StatusBadge } from "../ui";

const compact = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : formatPrice(n));

export default function AdminDashboard() {
  const { guard } = useAdminAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await guard(adminCommerceApi.dashboard()));
      setError("");
    } catch (err) {
      if (!isUnauthorized(err)) setError(messageOf(err, "Could not load the dashboard."));
    }
  }, [guard]);

  useEffect(() => {
    document.title = "Dashboard — Azelle admin";
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="py-20 text-center">
        <p>{error}</p>
        <button type="button" className="btn btn-primary mt-6" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }
  if (!data) return <p className="py-20 text-center text-sm" role="status">Loading dashboard…</p>;

  const { needsAction } = data;

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Sales count orders that are pending, accepted, shipped or delivered."
        actions={
          <button type="button" className="btn btn-secondary !h-10 !min-w-0 !px-4 !text-[12px]" onClick={() => void load()}>
            Refresh
          </button>
        }
      />

      {/* Needs action */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <ActionTile to="/admin/orders?status=pending" count={needsAction.pending} label="Pending — accept & ship" tone="#c9772b" />
        <ActionTile to="/admin/orders?status=accepted" count={needsAction.toShip} label="Accepted — awaiting pickup" tone="#1f4f8f" />
        <ActionTile to="/admin/orders?status=awaiting_payment" count={needsAction.awaitingPayment} label="Awaiting online payment" tone="#5b5249" />
      </div>

      {/* Sales figures */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Today" value={formatPrice(data.today.revenue)} sub={`${data.today.orders} orders`} />
        <Stat label="Last 7 days" value={formatPrice(data.week.revenue)} sub={`${data.week.orders} orders`} />
        <Stat label="Last 30 days" value={formatPrice(data.month.revenue)} sub={`${data.month.orders} orders`} />
        <Stat label="Avg. order (30 days)" value={formatPrice(data.averageOrderValue)} sub={`${data.customers} customers all time`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Sales — last 14 days">
          <SalesChart chart={data.chart} />
        </Card>
        <Card title="Top products — 30 days">
          {data.topProducts.length === 0 ? (
            <p className="text-sm">No sales yet.</p>
          ) : (
            <ol className="space-y-3">
              {data.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-semibold text-soft">{i + 1}</span>
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-surface2">
                    {p.image && <img src={sized(p.image, 120)} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="text-[13px] text-soft">{p.qty} sold</span>
                  </span>
                  <span className="tabular-nums text-sm font-semibold">{formatPrice(p.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card
          title="Recent orders"
          actions={
            <Link to="/admin/orders" className="text-link text-sm font-semibold">
              All orders →
            </Link>
          }
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" body="Orders placed on the store appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-surface2/60">
                    <span className="min-w-[110px] font-semibold">{o.number}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {o.customer.name} · {formatDateTime(o.createdAt)}
                    </span>
                    <span className="hidden text-[13px] text-soft md:inline">{paymentSummary(o.payment)}</span>
                    <StatusBadge status={o.status} />
                    <span className="w-24 text-right tabular-nums font-semibold">{formatPrice(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Store">
          <dl className="space-y-3 text-sm">
            <Row label="All-time sales" value={formatPrice(data.allTime.revenue)} />
            <Row label="All-time orders" value={String(data.allTime.orders)} />
            <Row label="Products live" value={`${data.products.active} of ${data.products.total}`} />
            <Row label="Sold out" value={String(data.products.soldOut)} />
            <Row label="Delivered" value={String(data.counts.delivered ?? 0)} />
            <Row label="Cancelled" value={String(data.counts.cancelled ?? 0)} />
            <Row label="Returned" value={String(data.counts.returned ?? 0)} />
          </dl>
        </Card>
      </div>

      {/* Microsoft Clarity visitors, joined with orders for the conversion rate */}
      <WebsiteAnalytics />
    </div>
  );
}

function ActionTile({ to, count, label, tone }: { to: string; count: number; label: string; tone: string }) {
  return (
    <Link to={to} className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-5 transition-colors duration-300 hover:border-ink">
      <span className="grid h-12 min-w-[48px] place-items-center rounded-full px-2 font-sans text-xl font-bold text-white tabular-nums" style={{ background: count ? tone : "#b9b1a7" }}>
        {count}
      </span>
      <span className="text-sm font-semibold leading-snug">{label}</span>
    </Link>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 font-sans text-[1.6rem] font-bold leading-none tracking-tight tabular-nums">{value}</p>
      <p className="mt-1.5 text-[13px] text-soft">{sub}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

// One series (daily sales), so no legend: the card title names it. Bars have a hover tooltip and
// the same figures are in a screen-reader table.
function SalesChart({ chart }: { chart: Dashboard["chart"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...chart.map((d) => d.revenue), 1);
  const W = 560;
  const H = 200;
  const pad = { top: 12, bottom: 26, left: 44 };
  const plotW = W - pad.left;
  const plotH = H - pad.top - pad.bottom;
  const slot = plotW / chart.length;
  const barW = Math.max(6, slot - 8);
  const r = (h: number) => Math.min(4, barW / 2, h);
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const active = hover !== null ? chart[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Daily sales for the last 14 days" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => {
          const y = pad.top + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={W} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--soft)">
                {compact(Math.round(t))}
              </text>
            </g>
          );
        })}
        {chart.map((d, i) => {
          const h = (d.revenue / max) * plotH;
          const x = pad.left + i * slot + (slot - barW) / 2;
          const y = pad.top + plotH - h;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${dayLabel(d.date)}: ${formatPrice(d.revenue)}, ${d.orders} orders`}>
              {/* Hit area larger than the bar */}
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={plotH} fill="transparent" />
              {d.revenue > 0 && (
                // Rounded top (4px), square base on the axis.
                <path
                  d={`M${x},${y + h} V${y + r(h)} Q${x},${y} ${x + r(h)},${y} H${x + barW - r(h)} Q${x + barW},${y} ${x + barW},${y + r(h)} V${y + h} Z`}
                  fill="var(--accent)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {(i % 2 === 0 || chart.length <= 7) && (
                <text x={pad.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--soft)">
                  {dayLabel(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {active && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-[10px] border border-line bg-surface px-3 py-2 text-[12.5px] shadow-md"
          style={{ left: `${((pad.left + hover * slot + slot / 2) / W) * 100}%` }}
        >
          <p className="font-semibold">{dayLabel(active.date)}</p>
          <p className="tabular-nums">{formatPrice(active.revenue)}</p>
          <p className="text-soft">{active.orders} orders</p>
        </div>
      )}
      <table className="sr-only">
        <caption>Daily sales</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Sales</th>
            <th>Orders</th>
          </tr>
        </thead>
        <tbody>
          {chart.map((d) => (
            <tr key={d.date}>
              <td>{dayLabel(d.date)}</td>
              <td>{formatPrice(d.revenue)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
