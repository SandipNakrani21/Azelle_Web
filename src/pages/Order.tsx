import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MiniBottle } from "@/components/ui/Bottle";
import { fieldClass, labelClass } from "@/components/ui/Field";
import { CheckCircleIcon } from "@/components/ui/Icons";
import { trackEvent } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { sized } from "@/lib/images";
import {
  fetchOrder,
  lookupOrder,
  orderKey,
  PAYMENT_LABELS,
  rememberOrder,
  retryPayment,
  STATUS_LABELS,
  verifyPayment,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { openPayment } from "@/lib/payments";
import { formatPrice } from "@/lib/products";
import { revealOrder } from "@/lib/reveal";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order placed" },
  { status: "accepted", label: "Accepted" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];
const STEP_INDEX: Partial<Record<OrderStatus, number>> = { pending: 0, accepted: 1, shipped: 2, delivered: 3 };

const formatDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) });

function headline(order: Order, firstName: string): { title: string; body: string } {
  switch (order.status) {
    case "awaiting_payment":
      return { title: "Complete your payment", body: "Your order is saved. Finish the payment to send it to our team." };
    case "payment_failed":
      return { title: "Payment not completed", body: "No money was taken for this order. You can try the payment again below." };
    case "pending":
      return {
        title: `Thank you, ${firstName}.`,
        body: "Your order is pending — our team will review and accept it shortly. We'll email you when it ships.",
      };
    case "accepted":
      return { title: "Your order is accepted", body: "It's being packed in our studio and will be handed to the courier soon." };
    case "shipped":
      return { title: "Your order is on its way", body: "Track the parcel with the courier link below." };
    case "delivered":
      return { title: "Delivered", body: "We hope you love it. Thank you for choosing Azelle." };
    case "cancelled":
      return { title: "Order cancelled", body: order.cancelReason || "This order was cancelled." };
    case "returned":
      return { title: "Order returned", body: "This parcel came back to us. Our team will be in touch." };
  }
}

export default function OrderPage() {
  const { id = "" } = useParams();
  const number = id.toUpperCase();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [key, setKey] = useState(() => params.get("key") || orderKey(number));
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(key ? "loading" : "missing");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? "");

  // A key in the URL (payment return / emailed link) is saved on this device, then removed from the address bar.
  useEffect(() => {
    const urlKey = params.get("key");
    if (urlKey) {
      rememberOrder(number, urlKey);
      navigate(`/order/${number}`, { replace: true, state: location.state });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read once: the address bar is cleaned up right after the first render.
  const [returning] = useState(() => params.get("return"));

  const load = useCallback(async () => {
    if (!key) return;
    try {
      // Back from the payment page: confirm the payment with the gateway first.
      const data = returning ? await verifyPayment(number, key) : await fetchOrder(number, key);
      if (returning && data.order.payment.status === "paid") trackEvent("purchase");
      setOrder(data.order);
      setState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setState("missing");
      else {
        setError(err instanceof Error ? err.message : "Could not load this order.");
        setState("error");
      }
    }
  }, [key, number, returning]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    document.title = `Order ${number} — Azelle Fragrances`;
  }, [number]);

  const payNow = async () => {
    if (!order) return;
    setPaying(true);
    setNotice("");
    try {
      const { payment } = await retryPayment(order.number, key);
      const outcome = await openPayment(payment);
      if (outcome.kind === "redirected") return;
      if (outcome.kind === "razorpay_success") {
        const { order: updated } = await verifyPayment(order.number, key, outcome.response);
        setOrder(updated);
      } else {
        setNotice("Payment was not completed. You can try again whenever you're ready.");
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "We couldn't start the payment. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (state === "missing") return <FindOrder number={number} onFound={(k) => (setKey(k), setState("loading"))} />;

  if (state !== "ready" || !order) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 pt-[var(--header-h)] text-center" role="status">
        {state === "error" ? (
          <div>
            <p>{error}</p>
            <button type="button" className="btn btn-primary mt-6" onClick={() => (setState("loading"), void load())}>
              Try again
            </button>
          </div>
        ) : (
          <p>Loading your order…</p>
        )}
      </div>
    );
  }

  const firstName = order.customer.name.split(" ")[0] || order.customer.name;
  const { title, body } = headline(order, firstName);
  const { address } = order;
  const needsPayment = order.status === "awaiting_payment" || order.status === "payment_failed";
  const stepIndex = STEP_INDEX[order.status];
  const stepDate = (status: OrderStatus) => order.timeline.find((t) => t.status === status)?.at;

  return (
    <div>
      <section className="relative overflow-hidden" aria-labelledby="order-h">
        <div className="hero__bg" aria-hidden="true" />
        <div className="relative mx-auto max-w-[900px] px-6 pb-14 pt-[calc(var(--header-h)+4rem)] text-center">
          <CheckCircleIcon data-reveal="fade" className="mx-auto h-14 w-14" />
          <p data-reveal="slide" style={revealOrder(1)} className="mt-6 text-[12px] font-medium uppercase tracking-[0.3em]">
            Order {order.number} · {STATUS_LABELS[order.status]}
          </p>
          <h1 id="order-h" data-reveal="slide" style={revealOrder(2)} className="mt-4 font-display text-[clamp(2.6rem,6vw,4.75rem)] leading-none">
            {title}
          </h1>
          <p data-reveal="slide" style={revealOrder(3)} className="mx-auto mt-5 max-w-lg text-lg">
            {body}
          </p>
          {notice && (
            <p role="status" className="mx-auto mt-6 max-w-lg rounded-[12px] bg-surface/80 px-4 py-3 text-sm">
              {notice}
            </p>
          )}
          {needsPayment && (
            <button type="button" className="btn btn-primary mt-8" onClick={() => void payNow()} disabled={paying}>
              {paying ? "Opening payment…" : `Pay ${formatPrice(order.total)} now`}
            </button>
          )}
        </div>
      </section>

      {/* Progress: Order placed → Accepted → Shipped → Delivered */}
      {stepIndex !== undefined && (
        <section aria-label="Order progress" className="mx-auto max-w-[1100px] px-5 pt-10 md:px-10">
          <ol className="grid grid-cols-4 gap-2 rounded-[20px] border border-line bg-surface p-5 md:p-7">
            {STEPS.map((step, i) => {
              const done = i <= stepIndex;
              const at = stepDate(step.status);
              return (
                <li key={step.status} className="relative text-center" aria-current={i === stepIndex ? "step" : undefined}>
                  {i > 0 && (
                    <span
                      className="absolute right-1/2 top-[13px] h-[2px] w-full -translate-x-[14px]"
                      style={{ background: i <= stepIndex ? "var(--ink)" : "var(--line)" }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative mx-auto grid h-7 w-7 place-items-center rounded-full border-2 text-[12px] font-bold ${done ? "border-ink bg-ink text-bg" : "border-line bg-surface"}`}
                    aria-hidden="true"
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.1em] md:text-[12px]">{step.label}</span>
                  {at && done && <span className="mt-0.5 block text-[11px] text-soft md:text-[12px]">{formatDate(at)}</span>}
                </li>
              );
            })}
          </ol>
          {order.shipment && (
            <p className="mt-4 text-center text-sm">
              {order.shipment.courierName} · AWB <span className="font-semibold">{order.shipment.awb}</span>
              {order.shipment.trackingUrl && (
                <>
                  {" · "}
                  <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer noopener" className="text-link font-semibold">
                    Track parcel ↗
                  </a>
                </>
              )}
            </p>
          )}
        </section>
      )}

      <div className="mx-auto grid max-w-[1100px] items-start gap-6 px-5 py-10 md:grid-cols-[1.4fr_1fr] md:px-10">
        <section data-reveal="slide" aria-labelledby="items-h" className="rounded-[20px] border border-line bg-surface p-6 md:p-8">
          <h2 id="items-h" className="font-display text-2xl">
            Your items
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {order.lines.map((l) => (
              <li key={`${l.productId}-${l.sizeId}`} className="flex items-center gap-4 py-4">
                <span className="grid h-16 w-14 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-surface2">
                  {l.image ? <img src={sized(l.image, 160)} alt="" className="h-full w-full object-cover" /> : <MiniBottle tint="#c9a27e" className="h-11 w-auto" />}
                </span>
                <span className="flex-1">
                  <span className="block font-display text-lg leading-tight">{l.name}</span>
                  <span className="text-sm">
                    {l.sizeLabel} × {l.qty}
                  </span>
                </span>
                <span className="tabular-nums">{formatPrice(l.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-line pt-4 text-sm">
            <Row label="Subtotal" value={formatPrice(order.subtotal)} />
            {order.discount ? <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`−${formatPrice(order.discount)}`} /> : null}
            <Row label="Shipping" value={order.shipping ? formatPrice(order.shipping) : "Free"} />
            <Row label="GST" value={formatPrice(order.tax)} />
            {order.codFee ? <Row label="Cash on delivery fee" value={formatPrice(order.codFee)} /> : null}
          </dl>
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-display text-2xl">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(order.total)}</span>
          </div>
        </section>

        <section data-reveal="slide" style={revealOrder(1)} aria-labelledby="delivery-h" data-clarity-mask="True" className="rounded-[20px] border border-line bg-surface p-6 md:p-8">
          <h2 id="delivery-h" className="font-display text-2xl">
            Delivery
          </h2>
          <address className="mt-4 not-italic leading-relaxed">
            {order.customer.name}
            <br />
            {address.line1}
            {address.line2 && (
              <>
                <br />
                {address.line2}
              </>
            )}
            <br />
            {address.city}, {address.state} {address.pincode}
            <br />
            {address.country}
          </address>
          <dl className="mt-6 space-y-3 border-t border-line pt-4 text-sm">
            <Row label="Placed" value={formatDate(order.createdAt, true)} />
            <Row label="Payment" value={paymentText(order)} />
            <Row label="Email" value={order.customer.email} />
            <Row label="Mobile" value={`+91 ${order.customer.phone}`} />
          </dl>
        </section>
      </div>

      <div className="flex flex-wrap justify-center gap-3 pb-20">
        <Link to="/collection" className="btn btn-primary">
          Continue shopping
        </Link>
        <Link to="/pages/contact-us" className="btn btn-secondary">
          Need help?
        </Link>
      </div>
    </div>
  );
}

function paymentText(order: Order): string {
  const { method, status } = order.payment;
  if (method === "cod") return status === "cod_collected" ? "Cash on delivery — paid" : "Cash on delivery";
  if (status === "paid") return PAYMENT_LABELS[method];
  if (status === "refunded") return "Refunded";
  if (status === "failed") return "Payment failed";
  return "Awaiting payment";
}

/** Without this device's key, the customer proves ownership with the email or mobile used at checkout. */
function FindOrder({ number, onFound }: { number: string; onFound: (key: string) => void }) {
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { accessKey } = await lookupOrder(number, contact.trim());
      onFound(accessKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't find that order.");
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[70vh] place-items-center px-6 pt-[var(--header-h)]">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-[24px] border border-line bg-surface p-7 text-center md:p-9">
        <h1 className="font-display text-4xl">Order {number}</h1>
        <p className="mt-3">Enter the email or mobile number used at checkout to view this order.</p>
        <div className="mt-6 text-left">
          <label htmlFor="find-contact" className={labelClass}>
            Email or mobile
          </label>
          <input id="find-contact" value={contact} onChange={(e) => setContact(e.target.value)} required className={fieldClass} autoComplete="email" />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-left text-sm text-[#b3261e]">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy}>
          {busy ? "Finding…" : "View order"}
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="break-all text-right tabular-nums">{value}</dd>
    </div>
  );
}
