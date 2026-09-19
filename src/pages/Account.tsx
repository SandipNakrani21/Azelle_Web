import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ornament } from "@/components/ui/Ornament";
import { fetchOrder, rememberedOrders, STATUS_LABELS, type Order } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { useAuth } from "@/providers/AuthProvider";

// Customer account: profile + quick actions when signed in, otherwise a prompt to log in or sign up.
export default function AccountPage() {
  const { user, openAuth, logout } = useAuth();

  useEffect(() => {
    document.title = "Account — Azelle Fragrances";
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="hero__bg opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-[760px] px-6 pb-40 pt-[calc(var(--header-h)+3rem)] md:px-10">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.16em]">
          <Link to="/" className="text-link">
            Home
          </Link>{" "}
          / <span className="font-semibold">Account</span>
        </nav>
        <p className="section-sub mt-10">Our House</p>
        <Ornament align="left" className="my-3" />
        <h1 className="font-display text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.05]">Account</h1>

        {user ? (
          <div className="mt-10 rounded-[20px] border border-line bg-surface p-7 md:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Signed in as</p>
            <p className="mt-2 font-display text-3xl">{user.name}</p>
            <p className="mt-1 break-all">{user.email}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/pages/order-tracking" className="btn btn-primary">
                Track an order
              </Link>
              <button type="button" className="btn btn-secondary" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        ) : null}

        {user && <YourOrders />}

        {user ? null : (
          <div className="mt-10 rounded-[20px] border border-line bg-surface p-7 md:p-9">
            <p className="font-display text-3xl">Welcome to Azelle</p>
            <p className="mt-3 leading-relaxed">Log in or create an account for a faster checkout and easy order tracking.</p>
            <button type="button" className="btn btn-primary mt-8" onClick={() => openAuth()}>
              Login &amp; Signup
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// Orders placed (or looked up) on this device, with their live status.
function YourOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const entries = rememberedOrders().slice(0, 10);
    Promise.all(entries.map((e) => fetchOrder(e.number, e.key).then((d) => d.order).catch(() => null))).then((list) => {
      if (!cancelled) setOrders(list.filter((o): o is Order => o !== null));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="orders-h" className="mt-8 rounded-[20px] border border-line bg-surface p-7 md:p-9">
      <h2 id="orders-h" className="font-display text-3xl">
        Your orders
      </h2>
      {orders === null ? (
        <p className="mt-4 text-sm" role="status">
          Loading…
        </p>
      ) : orders.length === 0 ? (
        <p className="mt-4 leading-relaxed">
          No orders on this device yet. Placed an order elsewhere? Find it with <Link to="/pages/order-tracking" className="text-link font-semibold">Order Tracking</Link>.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {orders.map((o) => (
            <li key={o.number}>
              <Link to={`/order/${o.number}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4">
                <span>
                  <span className="block font-semibold">{o.number}</span>
                  <span className="text-sm">
                    {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.lines.reduce((n, l) => n + l.qty, 0)} item(s)
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="rounded-full border border-line px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">{STATUS_LABELS[o.status]}</span>
                  <span className="tabular-nums font-semibold">{formatPrice(o.total)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
