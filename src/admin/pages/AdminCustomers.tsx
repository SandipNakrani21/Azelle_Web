import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fieldClass } from "@/components/ui/Field";
import { SearchIcon } from "@/components/ui/Icons";
import { formatPrice } from "@/lib/products";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminCommerceApi, type AdminCustomer } from "../adminApi";
import { EmptyState, formatDate, isUnauthorized, messageOf, PageHeader, Pagination } from "../ui";

type Data = { customers: AdminCustomer[]; total: number; page: number; pages: number };

export default function AdminCustomers() {
  const { guard } = useAdminAuth();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const load = useCallback(
    async (q: string, s: string, p: number) => {
      const id = ++requestId.current;
      try {
        const result = await guard(adminCommerceApi.listCustomers({ q, sort: s, page: p }));
        if (id !== requestId.current) return;
        setData(result);
        setError("");
      } catch (err) {
        if (id === requestId.current && !isUnauthorized(err)) setError(messageOf(err, "Could not load customers."));
      }
    },
    [guard],
  );

  useEffect(() => {
    document.title = "Customers — Azelle admin";
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(query.trim(), sort, page), query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [query, sort, page, load]);

  return (
    <div>
      <PageHeader eyebrow="People" title="Customers" subtitle={data ? `${data.total} ${data.total === 1 ? "customer" : "customers"} · grouped by email from their orders` : undefined} />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 mt-1 -translate-y-1/2" width={18} height={18} aria-hidden="true" />
          <label htmlFor="customers-q" className="sr-only">
            Search customers
          </label>
          <input
            id="customers-q"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Name, email or mobile"
            className={`${fieldClass} pl-10`}
          />
        </div>
        <label htmlFor="customers-sort" className="sr-only">
          Sort by
        </label>
        <select
          id="customers-sort"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className={`${fieldClass} sm:w-52`}
        >
          <option value="recent">Most recent order</option>
          <option value="spent">Highest spend</option>
          <option value="orders">Most orders</option>
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
            Loading customers…
          </p>
        ) : data.customers.length === 0 ? (
          <EmptyState title="No customers yet" body={query ? "No one matches that search." : "Customers appear here after their first order."} />
        ) : (
          <>
            <ul className="space-y-3 lg:hidden">
              {data.customers.map((c) => (
                <li key={c.email} className="rounded-[16px] border border-line bg-surface p-4">
                  <p className="font-semibold">{c.name}</p>
                  <p className="break-all text-[13px]">{c.email}</p>
                  <p className="text-[13px] text-soft">
                    +91 {c.phone} · {c.city}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>
                      {c.orders} {c.orders === 1 ? "order" : "orders"} · <span className="font-semibold tabular-nums">{formatPrice(c.spent)}</span>
                    </span>
                    <Link to={`/admin/orders?email=${encodeURIComponent(c.email)}`} className="text-link font-semibold">
                      Orders →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-hidden rounded-[18px] border border-line bg-surface lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface2 text-[11px] uppercase tracking-[0.14em]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Mobile</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 text-right font-semibold">Orders</th>
                    <th className="px-4 py-3 text-right font-semibold">Spent</th>
                    <th className="px-4 py-3 font-semibold">First order</th>
                    <th className="px-4 py-3 font-semibold">Last order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.customers.map((c) => (
                    <tr key={c.email} className="hover:bg-surface2/50">
                      <td className="px-4 py-3">
                        <Link to={`/admin/orders?email=${encodeURIComponent(c.email)}`} className="text-link font-semibold">
                          {c.name}
                        </Link>
                        <p className="text-[12.5px] text-soft">{c.email}</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">+91 {c.phone}</td>
                      <td className="px-4 py-3">
                        {c.city}, {c.state}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.orders}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPrice(c.spent)}</td>
                      <td className="px-4 py-3">{formatDate(c.firstOrderAt)}</td>
                      <td className="px-4 py-3">{formatDate(c.lastOrderAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
