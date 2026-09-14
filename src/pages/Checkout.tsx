import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MiniBottle } from "@/components/ui/Bottle";
import { Field, fieldClass, labelClass } from "@/components/ui/Field";
import { placeOrder } from "@/lib/orders";
import { TAX_RATE, formatPrice } from "@/lib/products";
import { revealOrder } from "@/lib/reveal";
import { useAuth } from "@/providers/AuthProvider";
import { useCart } from "@/providers/CartProvider";

const COUNTRIES = ["India", "United Arab Emirates", "United States", "United Kingdom", "Canada", "Australia", "Singapore"];

export default function Checkout() {
  const { user, openAuth } = useAuth();
  const { lines, subtotal, discount, coupon, freeShipping, tax, shipping, total, clear } = useCart();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return (
      <Notice title="Sign in to check out" body="Your cart is saved. Sign in or create an account to continue.">
        <button type="button" className="btn btn-primary" onClick={() => openAuth()}>
          Sign in
        </button>
      </Notice>
    );
  }

  if (lines.length === 0) {
    return (
      <Notice title="Your cart is empty" body="Add a fragrance to begin checkout.">
        <Link to="/collection" className="btn btn-primary">
          Shop the collection
        </Link>
      </Notice>
    );
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();

    setPlacing(true);
    setError("");
    try {
      const order = await placeOrder({
        email: get("email"),
        phone: get("phone"),
        name: get("name"),
        address: {
          line1: get("line1"),
          line2: get("line2"),
          city: get("city"),
          region: get("region"),
          postal: get("postal"),
          country: get("country"),
        },
        lines: lines.map((l) => ({
          key: l.key,
          productId: l.productId,
          name: l.product.name,
          sizeLabel: l.size.label,
          qty: l.qty,
          unit: l.unit,
          total: l.total,
        })),
        subtotal,
        discount,
        couponCode: coupon && (discount > 0 || freeShipping) ? coupon.code : undefined,
        tax,
        shipping,
        total,
      });
      clear();
      navigate(`/order/${order.id}`, { replace: true });
    } catch {
      setError("We couldn't place your order. Please try again.");
      setPlacing(false);
    }
  };

  return (
    <div className="pt-[var(--header-h)]">
      <div className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-14">
        <p data-reveal="slide" className="text-[12px] font-medium uppercase tracking-[0.24em]">
          Signed in as {user.email}
        </p>
        <h1 data-reveal="slide" style={revealOrder(1)} className="mt-3 font-display text-[clamp(2.4rem,5vw,4rem)] leading-none">
          Checkout
        </h1>

        <form onSubmit={onSubmit} className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_400px] lg:gap-14">
          <div className="space-y-6">
            <Step n={1} title="Contact" order={2}>
              <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={user.email} required />
              <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
            </Step>

            <Step n={2} title="Delivery" order={3}>
              <Field label="Full name" name="name" autoComplete="name" defaultValue={user.name} required className="sm:col-span-2" />
              <Field label="Address" name="line1" autoComplete="address-line1" required className="sm:col-span-2" />
              <Field label="Apartment, suite" name="line2" autoComplete="address-line2" className="sm:col-span-2" />
              <Field label="City" name="city" autoComplete="address-level2" required />
              <Field label="State" name="region" autoComplete="address-level1" required />
              <Field label="PIN / postal code" name="postal" autoComplete="postal-code" required />
              <div>
                <label htmlFor="country" className={labelClass}>
                  Country
                </label>
                <select id="country" name="country" autoComplete="country-name" defaultValue={COUNTRIES[0]} className={fieldClass}>
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </Step>

            {/* Demo payment UI: these inputs have no `name`, so they are never read, sent or stored.
                Replace with the payment provider's hosted fields. */}
            <Step n={3} title="Payment" order={4}>
              <p className="rounded-[10px] bg-surface2 px-4 py-3 text-sm sm:col-span-2">Demo checkout — no payment is taken.</p>
              <Field label="Name on card" autoComplete="cc-name" required className="sm:col-span-2" />
              <Field label="Card number" autoComplete="cc-number" inputMode="numeric" placeholder="1234 1234 1234 1234" required className="sm:col-span-2" />
              <Field label="Expiry" autoComplete="cc-exp" placeholder="MM / YY" required />
              <Field label="Security code" autoComplete="cc-csc" inputMode="numeric" placeholder="CVC" required />
            </Step>
          </div>

          <aside
            data-reveal="slide"
            style={revealOrder(2)}
            aria-labelledby="summary-h"
            className="rounded-[20px] border border-line bg-surface p-6 md:p-8 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]"
          >
            <h2 id="summary-h" className="font-display text-2xl">
              Order summary
            </h2>
            <ul className="mt-4 divide-y divide-line">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center gap-4 py-4">
                  <span className="relative grid h-16 w-14 shrink-0 place-items-center rounded-[10px] bg-surface2">
                    <MiniBottle tint={l.product.tint} className="h-11 w-auto" />
                    <span className="absolute -right-2 -top-2 grid h-5 min-w-[20px] place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold text-bg">
                      {l.qty}
                    </span>
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-lg leading-tight">{l.product.name}</span>
                    <span className="text-sm">{l.size.label}</span>
                  </span>
                  <span className="tabular-nums">{formatPrice(l.total)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-line pt-4 text-sm">
              <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
              {discount > 0 && coupon && <SummaryRow label={`Discount (${coupon.code})`} value={`−${formatPrice(discount)}`} />}
              <SummaryRow label="Shipping" value={freeShipping ? "Free" : formatPrice(shipping)} />
              <SummaryRow label={`GST (${Math.round(TAX_RATE * 100)}%)`} value={formatPrice(tax)} />
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[12px] font-semibold uppercase tracking-[0.2em]">Total</span>
              <span className="font-sans text-[1.9rem] font-bold leading-none tracking-tight tabular-nums" style={{ color: "color-mix(in oklab, var(--accent) 70%, var(--ink))" }}>
                {formatPrice(total)}
              </span>
            </div>
            {error && (
              <p role="alert" className="mt-4 border-l-2 border-[#b3261e] pl-3 text-sm">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary mt-6 w-full" disabled={placing}>
              {placing ? "Placing order…" : `Place order — ${formatPrice(total)}`}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
}

function Step({ n, title, order, children }: { n: number; title: string; order: number; children: ReactNode }) {
  const id = `checkout-step-${n}`;
  return (
    <section aria-labelledby={id} data-reveal="slide" style={revealOrder(order)} className="rounded-[20px] border border-line bg-surface p-6 md:p-8">
      <h2 id={id} className="flex items-center gap-3 font-display text-2xl">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ink font-sans text-sm text-bg" aria-hidden="true">
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Notice({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 pt-[var(--header-h)] text-center">
      <div data-reveal="slide">
        <h1 className="font-display text-[clamp(2.4rem,5vw,3.75rem)] leading-none">{title}</h1>
        <p className="mx-auto mt-4 max-w-sm">{body}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
