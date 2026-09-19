import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MiniBottle } from "@/components/ui/Bottle";
import { Field, fieldClass, fieldErrorClass, labelClass } from "@/components/ui/Field";
import { setTag, trackEvent } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { placeOrder, verifyPayment } from "@/lib/orders";
import { openPayment } from "@/lib/payments";
import { formatPrice } from "@/lib/products";
import { revealOrder } from "@/lib/reveal";
import { EMAIL_RE, INDIAN_MOBILE_RE, useAuth } from "@/providers/AuthProvider";
import { useCart } from "@/providers/CartProvider";
import { useStore } from "@/providers/StoreProvider";

// Shipping partners deliver within India only.
const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
const PINCODE_RE = /^[1-9]\d{5}$/;

type Method = "online" | "cod";
type Errors = Partial<Record<"email" | "phone" | "name" | "line1" | "city" | "state" | "pincode" | "payment", string>>;

export default function Checkout() {
  const { user, openAuth } = useAuth();
  const { lines, subtotal, discount, coupon, freeShipping, tax, shipping, total, gstRate, clear } = useCart();
  const store = useStore();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const { online, cod } = store.payments;
  const codAvailable = cod.enabled && total + cod.fee <= cod.maxOrderValue;
  const [method, setMethod] = useState<Method | null>(null);
  // Online first when it's available; otherwise cash on delivery.
  const chosen: Method | null = method ?? (online ? "online" : codAvailable ? "cod" : null);
  const codFee = chosen === "cod" ? cod.fee : 0;
  const grandTotal = total + codFee;

  useEffect(() => {
    if (user && lines.length > 0) trackEvent("begin_checkout");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const input = {
      customer: { name: get("name"), email: get("email"), phone: get("phone").replace(/\D/g, "") },
      address: { line1: get("line1"), line2: get("line2"), city: get("city"), state: get("state"), pincode: get("pincode") },
    };

    const found: Errors = {};
    if (!EMAIL_RE.test(input.customer.email)) found.email = "Enter a valid email address.";
    if (!INDIAN_MOBILE_RE.test(input.customer.phone)) found.phone = "Enter a 10-digit mobile number starting with 6–9.";
    if (input.customer.name.length < 2) found.name = "Enter your full name.";
    if (input.address.line1.length < 3) found.line1 = "Enter your street address.";
    if (!input.address.city) found.city = "Enter your city.";
    if (!input.address.state) found.state = "Choose your state.";
    if (!PINCODE_RE.test(input.address.pincode)) found.pincode = "Enter a 6-digit PIN code.";
    if (!chosen) found.payment = "Choose a payment method.";
    setErrors(found);
    if (Object.keys(found).length) {
      setError("Please check the highlighted fields.");
      return;
    }

    setPlacing(true);
    setError("");
    try {
      const { order, accessKey, payment, paymentError } = await placeOrder({
        ...input,
        items: lines.map((l) => ({ productId: l.productId, sizeId: l.sizeId, qty: l.qty })),
        couponCode: coupon && (discount > 0 || freeShipping) ? coupon.code : undefined,
        paymentMethod: chosen!,
      });
      clear();
      trackEvent(chosen === "cod" ? "purchase_cod" : "purchase_started");
      setTag("order_value", String(order.total));
      const orderUrl = `/order/${order.number}`;

      if (!payment) {
        // Cash on delivery — or no gateway answered; the order page offers "Pay now" again.
        navigate(orderUrl, { replace: true, state: paymentError ? { notice: paymentError } : undefined });
        return;
      }

      const outcome = await openPayment(payment);
      if (outcome.kind === "redirected") return; // Cashfree brings the customer back to the order page.
      if (outcome.kind === "razorpay_success") {
        await verifyPayment(order.number, accessKey, outcome.response).catch(() => null);
        navigate(orderUrl, { replace: true });
        return;
      }
      navigate(orderUrl, { replace: true, state: { notice: "Payment was not completed. You can pay now from this page." } });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields as Errors);
      setError(err instanceof Error ? err.message : "We couldn't place your order. Please try again.");
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

        <form onSubmit={onSubmit} noValidate data-clarity-mask="True" className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_400px] lg:gap-14">
          <div className="space-y-6">
            <Step n={1} title="Contact" order={2}>
              <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={user.email} required error={errors.email} />
              <div>
                <label htmlFor="checkout-phone" className={labelClass}>
                  Mobile number
                </label>
                <div className="mt-2 flex">
                  <span className="grid h-12 place-items-center rounded-l-[10px] border border-r-0 border-line bg-surface2 px-3 text-base text-soft" aria-hidden="true">
                    +91
                  </span>
                  <input
                    id="checkout-phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    defaultValue={user.phone ?? ""}
                    required
                    aria-invalid={errors.phone ? true : undefined}
                    aria-describedby={errors.phone ? "checkout-phone-error" : "checkout-phone-hint"}
                    className={`${fieldClass} !mt-0 rounded-l-none ${errors.phone ? "!border-[#b3261e]" : ""}`}
                  />
                </div>
                {errors.phone ? (
                  <p id="checkout-phone-error" className={fieldErrorClass}>
                    {errors.phone}
                  </p>
                ) : (
                  <p id="checkout-phone-hint" className="mt-1.5 text-[13px] text-soft">
                    For delivery updates from the courier.
                  </p>
                )}
              </div>
            </Step>

            <Step n={2} title="Delivery" order={3}>
              <Field label="Full name" name="name" autoComplete="name" defaultValue={user.name} required error={errors.name} className="sm:col-span-2" />
              <Field label="Address" name="line1" autoComplete="address-line1" required error={errors.line1} className="sm:col-span-2" placeholder="House no., building, street" />
              <Field label="Area, landmark" name="line2" autoComplete="address-line2" className="sm:col-span-2" />
              <Field label="City" name="city" autoComplete="address-level2" required error={errors.city} />
              <div>
                <label htmlFor="checkout-state" className={labelClass}>
                  State
                </label>
                <select
                  id="checkout-state"
                  name="state"
                  autoComplete="address-level1"
                  defaultValue=""
                  required
                  aria-invalid={errors.state ? true : undefined}
                  className={`${fieldClass} ${errors.state ? "!border-[#b3261e]" : ""}`}
                >
                  <option value="" disabled>
                    Choose a state
                  </option>
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                {errors.state && <p className={fieldErrorClass}>{errors.state}</p>}
              </div>
              <Field label="PIN code" name="pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" required error={errors.pincode} />
              <div>
                <p className={labelClass}>Country</p>
                <p className={`${fieldClass} flex items-center bg-surface2 text-soft`}>India</p>
              </div>
            </Step>

            <Step n={3} title="Payment" order={4}>
              <fieldset className="sm:col-span-2">
                <legend className="sr-only">Payment method</legend>
                <div className="grid gap-3">
                  {online && (
                    <PaymentOption
                      checked={chosen === "online"}
                      onSelect={() => setMethod("online")}
                      title="Pay online"
                      text="UPI, cards, net banking and wallets — on a secure payment page."
                    />
                  )}
                  {cod.enabled && (
                    <PaymentOption
                      checked={chosen === "cod"}
                      onSelect={() => setMethod("cod")}
                      disabled={!codAvailable}
                      title={cod.fee > 0 ? `Cash on delivery (+${formatPrice(cod.fee)})` : "Cash on delivery"}
                      text={codAvailable ? "Pay in cash or UPI when your order arrives." : `Available on orders up to ${formatPrice(cod.maxOrderValue)}.`}
                    />
                  )}
                  {!online && !cod.enabled && (
                    <p className="rounded-[10px] bg-surface2 px-4 py-3 text-sm">{store.status === "loading" ? "Loading payment options…" : "Payments are temporarily unavailable. Please try again soon."}</p>
                  )}
                </div>
                {errors.payment && <p className={fieldErrorClass}>{errors.payment}</p>}
              </fieldset>
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
              <SummaryRow label={`GST (${Math.round(gstRate * 100)}%)`} value={formatPrice(tax)} />
              {codFee > 0 && <SummaryRow label="Cash on delivery fee" value={formatPrice(codFee)} />}
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[12px] font-semibold uppercase tracking-[0.2em]">Total</span>
              <span className="font-sans text-[1.9rem] font-bold leading-none tracking-tight tabular-nums" style={{ color: "color-mix(in oklab, var(--accent) 70%, var(--ink))" }}>
                {formatPrice(grandTotal)}
              </span>
            </div>
            {error && (
              <p role="alert" className="mt-4 border-l-2 border-[#b3261e] pl-3 text-sm">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary mt-6 w-full" disabled={placing || !chosen}>
              {placing ? "Placing order…" : chosen === "cod" ? `Place order — ${formatPrice(grandTotal)}` : `Pay ${formatPrice(grandTotal)}`}
            </button>
            <p className="mt-3 text-center text-[12.5px] text-soft">Your order is confirmed by our team before it ships.</p>
          </aside>
        </form>
      </div>
    </div>
  );
}

function PaymentOption({ checked, onSelect, title, text, disabled = false }: { checked: boolean; onSelect: () => void; title: string; text: string; disabled?: boolean }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[14px] border p-4 transition-colors duration-300 ${
        checked ? "border-ink bg-[color-mix(in_oklab,var(--accent)_7%,var(--surface))]" : "border-line"
      } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
    >
      <input type="radio" name="payment" checked={checked} onChange={onSelect} disabled={disabled} className="mt-1 h-4 w-4 accent-[var(--ink)]" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm">{text}</span>
      </span>
    </label>
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
