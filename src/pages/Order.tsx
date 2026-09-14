import { Link, useParams } from "react-router-dom";
import { MiniBottle } from "@/components/ui/Bottle";
import { CheckCircleIcon } from "@/components/ui/Icons";
import { getOrder } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { useProducts } from "@/providers/ProductsProvider";
import { revealOrder } from "@/lib/reveal";

export default function OrderPage() {
  const { id = "" } = useParams();
  const order = getOrder(id);
  const { getById } = useProducts();

  if (!order) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 pt-[var(--header-h)] text-center">
        <div>
          <h1 className="font-display text-5xl">Order not found</h1>
          <p className="mt-4">We couldn't find order {id} on this device.</p>
          <Link to="/collection" className="btn btn-primary mt-8">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  const firstName = order.name.split(" ")[0] || order.name;
  const placedOn = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const { address } = order;

  return (
    <div>
      <section className="relative overflow-hidden" aria-labelledby="order-h">
        <div className="hero__bg" aria-hidden="true" />
        <div className="relative mx-auto max-w-[900px] px-6 pb-14 pt-[calc(var(--header-h)+4rem)] text-center">
          <CheckCircleIcon data-reveal="fade" className="mx-auto h-14 w-14" />
          <p data-reveal="slide" style={revealOrder(1)} className="mt-6 text-[12px] font-medium uppercase tracking-[0.3em]">
            Order {order.id}
          </p>
          <h1 id="order-h" data-reveal="slide" style={revealOrder(2)} className="mt-4 font-display text-[clamp(2.6rem,6vw,4.75rem)] leading-none">
            Thank you, {firstName}.
          </h1>
          <p data-reveal="slide" style={revealOrder(3)} className="mx-auto mt-5 max-w-lg text-lg">
            Your order is confirmed and will be prepared in our studio. Your receipt is below.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1100px] items-start gap-6 px-5 py-12 md:grid-cols-[1.4fr_1fr] md:px-10">
        <section data-reveal="slide" aria-labelledby="items-h" className="rounded-[20px] border border-line bg-surface p-6 md:p-8">
          <h2 id="items-h" className="font-display text-2xl">
            Your items
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {order.lines.map((l) => (
              <li key={l.key} className="flex items-center gap-4 py-4">
                <span className="grid h-16 w-14 shrink-0 place-items-center rounded-[10px] bg-surface2">
                  <MiniBottle tint={getById(l.productId)?.tint ?? "#c9a27e"} className="h-11 w-auto" />
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
          </dl>
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-display text-2xl">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(order.total)}</span>
          </div>
        </section>

        <section data-reveal="slide" style={revealOrder(1)} aria-labelledby="delivery-h" className="rounded-[20px] border border-line bg-surface p-6 md:p-8">
          <h2 id="delivery-h" className="font-display text-2xl">
            Delivery
          </h2>
          <address className="mt-4 not-italic leading-relaxed">
            {order.name}
            <br />
            {address.line1}
            {address.line2 && (
              <>
                <br />
                {address.line2}
              </>
            )}
            <br />
            {address.city}, {address.region} {address.postal}
            <br />
            {address.country}
          </address>
          <dl className="mt-6 space-y-3 border-t border-line pt-4 text-sm">
            <Row label="Placed" value={placedOn} />
            <Row label="Email" value={order.email} />
            {order.phone && <Row label="Phone" value={order.phone} />}
          </dl>
        </section>
      </div>

      <div className="pb-20 text-center">
        <Link to="/collection" className="btn btn-primary">
          Continue shopping
        </Link>
      </div>
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
