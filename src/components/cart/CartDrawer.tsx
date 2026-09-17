import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bottle } from "@/components/ui/Bottle";
import { Drawer } from "@/components/ui/Drawer";
import { ChevronDownIcon, CloseIcon, GiftSmallIcon, SearchIcon } from "@/components/ui/Icons";
import { Modal } from "@/components/ui/Modal";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { COUPONS, evaluateCoupon } from "@/lib/coupons";
import { sized } from "@/lib/images";
import { SHIPPING, TAX_RATE, formatPrice } from "@/lib/products";
import { useAuth } from "@/providers/AuthProvider";
import { useCart, type CouponFeedback } from "@/providers/CartProvider";

// Amounts use the product page's price styling: bold sans numerals in the accent ink.
const priceFont = "font-sans font-bold tracking-tight tabular-nums";
const accentInk = { color: "color-mix(in oklab, var(--accent) 70%, var(--ink))" };
const successInk = "#2f7d4f";

// Shopping cart: full screen on phones, 35% of the window on larger screens (never narrower than 420px).
export function CartDrawer() {
  const { isOpen, closeCart, lines, count, subtotal, discount, tax, shipping, total, coupon, couponShortfall, freeShipping, inc, dec, remove, applyCoupon, removeCoupon } =
    useCart();
  const { isAuthenticated, openAuth } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<CouponFeedback | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponsListOpen, setCouponsListOpen] = useState(false);
  const closeCouponsList = useCallback(() => setCouponsListOpen(false), []);

  // Checkout is gated: without a session, sign in first, then continue to /checkout.
  const checkout = () => {
    closeCart();
    if (isAuthenticated) navigate("/checkout");
    else openAuth(() => navigate("/checkout"));
  };

  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  // Each time the cart closes, reset the coupon form and collapse the section again.
  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setFeedback(null);
      setCouponOpen(false);
      setCouponsListOpen(false);
    }
  }, [isOpen]);

  // A coupon message describes the cart at the moment it was applied; clear it once the cart changes.
  useEffect(() => {
    setFeedback(null);
  }, [subtotal]);

  const submitCoupon = (e?: FormEvent, value = code) => {
    e?.preventDefault();
    const result = applyCoupon(value);
    setFeedback(result);
    if (result.ok) setCode("");
    return result;
  };

  return (
    <>
      <Drawer open={isOpen} onClose={closeCart} label="Shopping cart" panelClassName="w-full md:w-[35vw] md:min-w-[420px]">
        <div className="flex h-full flex-col">
          {/* Compact top bar */}
          <div className="flex items-center justify-between border-b border-line px-5 py-2 sm:px-7">
            <h2 className="flex items-center gap-2.5 font-display text-[1.35rem] leading-none">
              Your cart
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-ink px-1.5 font-sans text-[12px] font-bold text-bg" aria-label={`${count} ${count === 1 ? "item" : "items"}`}>
                {count}
              </span>
            </h2>
            <button
              type="button"
              onClick={closeCart}
              aria-label="Close cart"
              className="-mr-1.5 grid h-10 w-10 place-items-center rounded-full transition-colors duration-300 hover:bg-surface2 lg:h-9 lg:w-9"
            >
              <CloseIcon width={20} height={20} />
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
              <p className="font-display text-3xl">Your cart is empty</p>
              <p>Find the scent that stays with you.</p>
              <Link to="/collection" className="btn btn-primary">
                Shop the collection
              </Link>
            </div>
          ) : (
            <>
              <ul className="flex-1 divide-y divide-line overflow-y-auto px-5 sm:px-7">
                {lines.map((line) => {
                  const image = line.product.images[0];
                  return (
                    <li key={line.key} className="flex gap-4 py-5">
                      <Link
                        to={`/product/${line.product.slug}`}
                        className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[#fbfaf7] sm:h-28 sm:w-28"
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        {image ? (
                          <img src={sized(image, 240)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Bottle tint={line.product.tint} name={line.product.name} decorative className="h-20 w-auto" />
                        )}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <Link to={`/product/${line.product.slug}`} className="text-link py-1.5 font-display text-lg leading-snug lg:py-0">
                              {line.product.name}
                            </Link>
                            <p className="mt-1 text-[14px]">
                              {line.size.label} · <span className={priceFont}>{formatPrice(line.unit)}</span>
                            </p>
                          </div>
                          <p className={`${priceFont} whitespace-nowrap text-[1.15rem]`} style={accentInk}>
                            {formatPrice(line.total)}
                          </p>
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                          {/* Wider quantity control (same height) */}
                          <div className="w-[150px]">
                            <QtyStepper value={line.qty} onInc={() => inc(line.key)} onDec={() => dec(line.key)} label={`Quantity of ${line.product.name}`} fullWidth />
                          </div>
                          <button type="button" onClick={() => remove(line.key)} className="text-link py-2.5 text-xs uppercase tracking-[0.14em] underline underline-offset-2 lg:py-0">
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-line bg-bg px-5 pb-4 pt-3 sm:px-7">
                {/* Coupons — collapsed by default; an applied code still shows in the heading */}
                <section className="border-b border-line pb-3">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={couponOpen}
                      aria-controls="coupon-panel"
                      onClick={() => setCouponOpen((o) => !o)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left lg:py-1.5"
                    >
                      <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]">
                        <GiftSmallIcon width={16} height={16} aria-hidden="true" />
                        Apply coupon
                      </span>
                      <span className="flex items-center gap-2">
                        {coupon && (
                          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-[0.06em]" style={{ color: successInk, background: "rgba(47,125,79,.1)" }}>
                            {coupon.code}
                            {couponShortfall === 0 && discount > 0 ? ` · −${formatPrice(discount)}` : couponShortfall === 0 && freeShipping ? " · Free shipping" : ""}
                          </span>
                        )}
                        <ChevronDownIcon className={`shrink-0 transition-transform duration-300 ${couponOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                      </span>
                    </button>
                  </h3>

                  <div id="coupon-panel" hidden={!couponOpen} className="pt-2">
                    {coupon ? (
                      <div className="flex items-center justify-between gap-3 rounded-[12px] border border-dashed px-4 py-2.5" style={{ borderColor: successInk }}>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-bold tracking-[0.08em]">{coupon.code}</p>
                          <p className="text-[12.5px]" style={couponShortfall > 0 ? undefined : { color: successInk }}>
                            {couponShortfall > 0
                              ? `Add ${formatPrice(couponShortfall)} more to use this coupon.`
                              : freeShipping
                                ? "Applied — free shipping."
                                : `Applied — you save ${formatPrice(discount)}.`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeCoupon();
                            setFeedback(null);
                          }}
                          className="text-link shrink-0 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] underline underline-offset-2 lg:py-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={submitCoupon} className="flex gap-2">
                        <label htmlFor="coupon-code" className="sr-only">
                          Coupon code
                        </label>
                        <input
                          id="coupon-code"
                          value={code}
                          onChange={(e) => {
                            setCode(e.target.value.toUpperCase());
                            setFeedback(null);
                          }}
                          placeholder="Enter coupon code"
                          autoComplete="off"
                          aria-invalid={feedback && !feedback.ok ? true : undefined}
                          aria-describedby={feedback ? "coupon-feedback" : undefined}
                          className="h-10 min-w-0 flex-1 rounded-[10px] border border-line bg-surface px-4 text-[13.5px] uppercase tracking-[0.08em] outline-none placeholder:normal-case placeholder:tracking-normal focus:border-ink focus:ring-1 focus:ring-ink"
                        />
                        <button type="submit" className="btn btn-primary !h-10 !min-w-0 !px-5 !text-[12px]">
                          Apply
                        </button>
                      </form>
                    )}
                    {feedback && (
                      <p id="coupon-feedback" role={feedback.ok ? "status" : "alert"} className="mt-2 text-[12.5px] font-semibold" style={{ color: feedback.ok ? successInk : "#b3261e" }}>
                        {feedback.message}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setCouponsListOpen(true)}
                      className="text-link mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.14em]"
                    >
                      View all coupons →
                    </button>
                  </div>
                </section>

                <dl className="space-y-1.5 pt-3 text-[13.5px]">
                  <Row label="Subtotal" value={formatPrice(subtotal)} />
                  {discount > 0 && coupon && <Row label={`Discount (${coupon.code})`} value={`−${formatPrice(discount)}`} color={successInk} />}
                  <Row label="Shipping" value={freeShipping ? "Free" : formatPrice(shipping)} color={freeShipping ? successInk : undefined} />
                  <Row label={`GST (${Math.round(TAX_RATE * 100)}%)`} value={formatPrice(tax)} />
                  <div className="flex items-baseline justify-between border-t border-line pt-2.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.2em]">Total</dt>
                    <dd className={`${priceFont} text-[1.4rem] leading-none`} style={accentInk}>
                      {formatPrice(total)}
                    </dd>
                  </div>
                </dl>

                {/* Continue shopping + Checkout on one line */}
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-2.5">
                  {/* Smaller label on narrow phones so it isn't clipped beside Checkout. */}
                  <button type="button" onClick={closeCart} className="btn btn-secondary !h-[44px] !min-w-0 !px-2 !text-[10.5px] !tracking-[0.03em] sm:!text-[12px] sm:!tracking-[0.08em]">
                    Continue shopping
                  </button>
                  <button type="button" className="btn btn-primary !h-[44px] !min-w-0 !px-2 !text-[12.5px] !tracking-[0.08em]" onClick={checkout}>
                    Checkout · {formatPrice(total)}
                  </button>
                </div>

                <p className="mt-3 text-center text-[11.5px] leading-snug">GST is 18% of the product price after any discount. Shipping is a flat ₹100 per order.</p>
              </div>
            </>
          )}
        </div>
      </Drawer>

      {/* Rendered outside the drawer so the popup isn't confined by the drawer panel's transform. */}
      <CouponsDialog
        open={couponsListOpen}
        onClose={closeCouponsList}
        subtotal={subtotal}
        appliedCode={coupon?.code ?? null}
        onApply={(value) => {
          const result = submitCoupon(undefined, value);
          if (result.ok) {
            setCouponOpen(true);
            setCouponsListOpen(false);
          }
          return result;
        }}
      />
    </>
  );
}

// "View all coupons" popup: search + every coupon with its details and what it saves on this cart.
function CouponsDialog({
  open,
  onClose,
  subtotal,
  appliedCode,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  subtotal: number;
  appliedCode: string | null;
  onApply: (code: string) => CouponFeedback;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setError(null);
    }
  }, [open]);

  const q = query.trim().toLowerCase();
  const list = COUPONS.filter((c) => !q || c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q));

  return (
    <Modal open={open} onClose={onClose} label="Available coupons" panelClassName="max-w-[520px] overflow-hidden">
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-3 sm:px-6">
          <h2 className="flex items-center gap-2 font-display text-[1.35rem] leading-none">
            <GiftSmallIcon width={18} height={18} aria-hidden="true" />
            Available coupons
          </h2>
          <button type="button" onClick={onClose} aria-label="Close coupons" className="-mr-1.5 grid h-10 w-10 place-items-center rounded-full transition-colors duration-300 hover:bg-surface2 lg:h-9 lg:w-9">
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        <div className="border-b border-line px-5 py-3 sm:px-6">
          <label htmlFor="coupon-search" className="sr-only">
            Search coupons
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" width={18} height={18} aria-hidden="true" />
            <input
              id="coupon-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code or offer"
              autoComplete="off"
              className="h-11 w-full rounded-[10px] border border-line bg-surface pl-10 pr-4 text-[14px] outline-none focus:border-ink focus:ring-1 focus:ring-ink"
            />
          </div>
        </div>

        <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6" aria-live="polite">
          {list.map((c) => {
            const result = evaluateCoupon(c, subtotal);
            const locked = result.shortfall > 0;
            const applied = appliedCode === c.code;
            const saving = c.kind === "shipping" ? SHIPPING : result.discount;
            return (
              <li key={c.code} className={`rounded-[14px] border border-dashed p-4 ${applied ? "bg-[rgba(47,125,79,.06)]" : "bg-surface"}`} style={{ borderColor: applied ? successInk : undefined }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="inline-block rounded-[6px] border border-ink/20 bg-bg px-2 py-0.5 text-[13px] font-bold tracking-[0.1em]">{c.code}</p>
                    <p className="mt-2 text-[14.5px] font-semibold leading-snug">{c.label}</p>
                    <p className="mt-0.5 text-[12.5px]">Min. order {formatPrice(c.minSubtotal)} (product price)</p>
                  </div>
                  <button
                    type="button"
                    disabled={locked || applied}
                    onClick={() => {
                      const res = onApply(c.code);
                      setError(res.ok ? null : { code: c.code, message: res.message });
                    }}
                    className="btn btn-primary !h-10 !min-w-0 shrink-0 !px-4 !text-[11.5px] lg:!h-9"
                  >
                    {applied ? "Applied" : "Apply"}
                  </button>
                </div>
                <p className={`mt-2.5 border-t border-line pt-2.5 text-[13px] font-semibold ${locked ? "" : ""}`} style={locked ? undefined : { color: successInk }}>
                  {locked ? (
                    <>Add {formatPrice(result.shortfall)} more to unlock this offer.</>
                  ) : (
                    <>
                      You save <span className={priceFont}>{formatPrice(saving)}</span>
                      {c.kind === "shipping" ? " on shipping" : ""} on this cart.
                    </>
                  )}
                </p>
                {error?.code === c.code && (
                  <p role="alert" className="mt-1 text-[12.5px] font-semibold text-[#b3261e]">
                    {error.message}
                  </p>
                )}
              </li>
            );
          })}
          {list.length === 0 && <li className="py-8 text-center text-[14px]">No coupons match &ldquo;{query.trim()}&rdquo;.</li>}
        </ul>
      </div>
    </Modal>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt>{label}</dt>
      <dd className={`${priceFont} text-[14px]`} style={color ? { color } : undefined}>
        {value}
      </dd>
    </div>
  );
}
