import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sized } from "@/lib/images";
import { formatPrice } from "@/lib/products";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminCommerceApi, type Dashboard } from "../adminApi";
import { AreaChart, BarChart, DonutChart, KpiCard } from "../charts";
import { IconBox, IconClock, IconCustomers, IconOrders, IconRupee, IconTrend } from "../icons";
import { ActionButton, Card, EmptyState, ExportButton, formatDateTime, isUnauthorized, messageOf, paymentSummary, StatusBadge } from "../ui";

const rupees = (v: number) => formatPrice(Math.round(v));
const whole = (v: number) => Math.round(v).toLocaleString("en-IN");
const compact = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${Math.round(n)}`);
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const GRADIENTS = {
  gold: "linear-gradient(135deg,#e6b45a,#c9772b)",
  rose: "linear-gradient(135deg,#e9a58f,#b46a7a)",
  sage: "linear-gradient(135deg,#9fc2ad,#3f6b58)",
  plum: "linear-gradient(135deg,#b46a7a,#5a2e35)",
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// Azelle dashboard: store sales, orders and products (the visitor side lives on the Clarity dashboard).
export default function AdminDashboard() {
  const { guard, admin } = useAdminAuth();
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
    document.title = "Azelle dashboard — Azelle admin";
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="py-20 text-center">
        <p>{error}</p>
        <ActionButton kind="refresh" className="mt-6" onClick={() => void load()}>
          Try again
        </ActionButton>
      </div>
    );
  }
  if (!data) return <p className="py-20 text-center text-sm" role="status">Loading dashboard…</p>;

  const { needsAction, counts } = data;
  const revenueSeries = data.chart.map((c) => ({ label: day(c.date), value: c.revenue, sub: `${c.orders} orders` }));
  const ordersSeries = data.chart.map((c) => ({ label: day(c.date), value: c.orders, sub: rupees(c.revenue) }));
  // Order status as five slices (the rest fold into "Other").
  const statusSlices = [
    { label: "Pending", value: counts.pending ?? 0 },
    { label: "Accepted", value: counts.accepted ?? 0 },
    { label: "Shipped", value: counts.shipped ?? 0 },
    { label: "Delivered", value: counts.delivered ?? 0 },
    { label: "Other", value: (counts.cancelled ?? 0) + (counts.returned ?? 0) + (counts.awaiting_payment ?? 0) + (counts.payment_failed ?? 0) },
  ];
  const maxTop = Math.max(...data.topProducts.map((p) => p.revenue), 1);

  return (
    <div>
      {/* Welcome banner with floating accents */}
      <section className="admin-rise relative overflow-hidden rounded-[26px] p-7 text-ink shadow-[0_20px_50px_rgba(27,24,21,.12)] md:p-9" style={{ background: "var(--brand-gradient)" }}>
        <span className="admin-float pointer-events-none absolute -right-6 top-6 h-36 w-36 rounded-full bg-white/25 blur-xl" aria-hidden="true" />
        <span className="admin-float pointer-events-none absolute bottom-[-30px] right-40 h-24 w-24 rounded-full bg-[#9fc2ad]/40 blur-lg" style={{ animationDelay: "1.2s" }} aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em]">Azelle dashboard</p>
            <h1 className="admin-title mt-2 font-display text-[2.3rem] leading-none md:text-[3rem]">
              {greeting()}, {admin?.name.split(" ")[0] ?? "there"}
            </h1>
            <p className="mt-3 max-w-xl text-[15px]">
              Today: <strong>{rupees(data.today.revenue)}</strong> from <strong>{data.today.orders}</strong> orders ·{" "}
              <strong>{needsAction.pending}</strong> waiting for you to accept.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton kind="refresh" onClick={() => void load()}>
              Refresh
            </ActionButton>
            <ExportButton path="/api/admin/dashboard/export" perm="dashboard.export" label="Export sales" />
            <Link to="/admin/orders?status=pending" className="abtn abtn-add">
              <IconOrders size={16} /> Accept orders
            </Link>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sales · 30 days" value={data.month.revenue} format={rupees} sub={`${data.week.orders} orders this week`} icon={IconRupee} gradient={GRADIENTS.gold} spark={data.chart.map((c) => c.revenue)} />
        <KpiCard label="Orders · 30 days" value={data.month.orders} format={whole} sub={`${data.today.orders} today`} icon={IconOrders} gradient={GRADIENTS.rose} spark={data.chart.map((c) => c.orders)} delay={80} />
        <KpiCard label="Average order" value={data.averageOrderValue} format={rupees} sub="Last 30 days" icon={IconTrend} gradient={GRADIENTS.sage} delay={160} />
        <KpiCard label="Customers" value={data.customers} format={whole} sub={`${data.products.active} products live`} icon={IconCustomers} gradient={GRADIENTS.plum} delay={240} />
      </div>

      {/* Needs action */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <ActionTile to="/admin/orders?status=pending" count={needsAction.pending} label="Pending — accept & ship" gradient={GRADIENTS.gold} icon={IconClock} />
        <ActionTile to="/admin/orders?status=accepted" count={needsAction.toShip} label="Accepted — awaiting pickup" gradient={GRADIENTS.sage} icon={IconBox} />
        <ActionTile to="/admin/orders?status=awaiting_payment" count={needsAction.awaitingPayment} label="Awaiting online payment" gradient={GRADIENTS.plum} icon={IconRupee} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Sales — last 14 days" delay={100}>
          <AreaChart data={revenueSeries} format={compact} caption="Daily sales, last 14 days" />
        </Card>
        <Card title="Orders by status" delay={180}>
          <DonutChart data={statusSlices} caption="Orders by status" center="Orders" />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card title="Orders per day" delay={120}>
          <BarChart data={ordersSeries} format={(v) => `${v} orders`} caption="Orders per day, last 14 days" />
        </Card>
        <Card title="Top products — 30 days" delay={200}>
          {data.topProducts.length === 0 ? (
            <p className="text-sm">No sales yet.</p>
          ) : (
            <ol className="space-y-3.5">
              {data.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface2 text-[12px] font-bold">{i + 1}</span>
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-surface2">
                    {p.image && <img src={sized(p.image, 120)} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2 text-sm">
                      <span className="truncate font-semibold">{p.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{rupees(p.revenue)}</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 rounded-full bg-surface2" aria-hidden="true">
                      <span className="admin-fade block h-full rounded-full" style={{ width: `${(p.revenue / maxTop) * 100}%`, background: "var(--menu-gradient)" }} />
                    </span>
                    <span className="text-[12px] text-soft">{p.qty} sold</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card
        className="mt-4"
        title="Recent orders"
        delay={140}
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
                <Link to={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[10px] px-2 py-3 transition-colors duration-300 hover:bg-surface2/70">
                  <span className="min-w-[110px] font-semibold">{o.number}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {o.customer.name} · {formatDateTime(o.createdAt)}
                  </span>
                  <span className="hidden text-[13px] text-soft md:inline">{paymentSummary(o.payment)}</span>
                  <StatusBadge status={o.status} />
                  <span className="w-24 text-right font-semibold tabular-nums">{formatPrice(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ActionTile({ to, count, label, gradient, icon: Icon }: { to: string; count: number; label: string; gradient: string; icon: typeof IconClock }) {
  return (
    <Link to={to} className="admin-card admin-rise group flex items-center gap-4 rounded-[20px] p-5">
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] text-white shadow-lg transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" style={{ background: count ? gradient : "#b9b1a7" }}>
        <Icon size={20} />
        {count > 0 && <span className="absolute -right-1.5 -top-1.5 h-3 w-3 animate-ping rounded-full bg-[#e6b45a]" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block font-sans text-2xl font-bold leading-none tabular-nums">{count}</span>
        <span className="mt-1 block text-sm font-semibold leading-snug">{label}</span>
      </span>
    </Link>
  );
}
