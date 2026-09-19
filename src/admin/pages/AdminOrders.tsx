import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fieldClass } from "@/components/ui/Field";
import { SearchIcon } from "@/components/ui/Icons";
import type { OrderStatus } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminCommerceApi, type OrderList } from "../adminApi";
import { EmptyState, formatDateTime, isUnauthorized, messageOf, ORDER_STATUS_LABELS, PageHeader, Pagination, paymentSummary, StatusBadge } from "../ui";

const TABS: (OrderStatus | "")[] = ["", "pending", "accepted", "shipped", "delivered", "awaiting_payment", "payment_failed", "cancelled", "returned"];

export default function AdminOrders() {
  const { guard } = useAdminAuth();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as OrderStatus | "";
  const payment = params.get("payment") ?? "";
  const email = params.get("email") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [data, setData] = useState<OrderList | null>(null);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await guard(adminCommerceApi.listOrders({ status, payment, email, q: params.get("q") ?? "", page }));
      if (id !== requestId.current) return;
      setData(result);
      setError("");
    } catch (err) {
      if (id === requestId.current && !isUnauthorized(err)) setError(messageOf(err, "Could not load orders."));
    }
  }, [guard, status, payment, email, page, params]);

  useEffect(() => {
    document.title = "Orders — Azelle admin";
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Debounced search into the URL.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if ((params.get("q") ?? "") !== query.trim()) update({ q: query.trim() });
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const counts = data?.counts ?? {};
  const allCount = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        subtitle={email ? <>Showing orders from <span className="font-semibold">{email}</span> · <button type="button" className="text-link" onClick={() => update({ email: "" })}>Show all</button></> : "Accept pending orders and choose how they ship."}
        actions={
          <button type="button" className="btn btn-secondary !h-10 !min-w-0 !px-4 !text-[12px]" onClick={() => void load()}>
            Refresh
          </button>
        }
      />

      {/* Status tabs */}
      <div className="row-scroll -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Order status">
        {TABS.map((tab) => {
          const on = tab === status;
          const n = tab ? counts[tab] ?? 0 : allCount;
          return (
            <button
              key={tab || "all"}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => update({ status: tab })}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors duration-300 ${on ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink"}`}
            >
              {tab ? ORDER_STATUS_LABELS[tab] : "All"}
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? "bg-bg/20" : "bg-surface2"} ${tab === "pending" && n ? "!bg-[#c9772b] text-white" : ""}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 mt-1 -translate-y-1/2" width={18} height={18} aria-hidden="true" />
          <label htmlFor="orders-q" className="sr-only">
            Search orders
          </label>
          <input
            id="orders-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order number, name, email, mobile or AWB"
            className={`${fieldClass} pl-10`}
          />
        </div>
        <label htmlFor="orders-payment" className="sr-only">
          Payment type
        </label>
        <select id="orders-payment" value={payment} onChange={(e) => update({ payment: e.target.value })} className={`${fieldClass} sm:w-52`}>
          <option value="">All payments</option>
          <option value="online">Paid online</option>
          <option value="cod">Cash on delivery</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-[12px] bg-[#b3261e] px-4 py-3 text-sm text-white">
          {error}
        </p>
      )}

      <div className="mt-6">
        {!data ? (
          <p className="py-16 text-center text-sm" role="status">
            Loading orders…
          </p>
        ) : data.orders.length === 0 ? (
          <EmptyState title="No orders here" body={status || params.get("q") ? "Try another status or search." : "Orders placed on the store will appear here."} />
        ) : (
          <>
            {/* Cards on phones and tablets */}
            <ul className="space-y-3 lg:hidden">
              {data.orders.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="block rounded-[16px] border border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{o.number}</p>
                        <p className="text-[13px] text-soft">{formatDateTime(o.createdAt)}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">{o.customer.name}</p>
                        <p className="text-[13px] text-soft">
                          {o.address.city} · {paymentSummary(o.payment)}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums">{formatPrice(o.total)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Table on desktop */}
            <div className="hidden overflow-hidden rounded-[18px] border border-line bg-surface lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface2 text-[11px] uppercase tracking-[0.14em]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Shipping</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-surface2/50">
                      <td className="px-4 py-3">
                        <Link to={`/admin/orders/${o.id}`} className="text-link font-semibold">
                          {o.number}
                        </Link>
                        <p className="text-[12.5px] text-soft">{formatDateTime(o.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{o.customer.name}</p>
                        <p className="text-[12.5px] text-soft">
                          {o.address.city}, {o.address.pincode}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{o.lines.reduce((n, l) => n + l.qty, 0)}</td>
                      <td className="px-4 py-3">{paymentSummary(o.payment)}</td>
                      <td className="px-4 py-3">{o.shipment.courierName ? `${o.shipment.courierName}${o.shipment.awb ? ` · ${o.shipment.awb}` : ""}` : "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPrice(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} onChange={(p) => update({ page: String(p) })} />
          </>
        )}
      </div>
    </div>
  );
}
