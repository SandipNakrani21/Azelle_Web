import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CatalogueStatus } from "@/components/product/CatalogueStatus";
import { NotesPyramid } from "@/components/product/NotesPyramid";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { GoodToKnow } from "@/components/product/GoodToKnow";
import { AwardIcon, ClockIcon, DropletIcon, FlagIcon, RabbitIcon } from "@/components/ui/Icons";
import { Ornament } from "@/components/ui/Ornament";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StockBadge } from "@/components/ui/StockBadge";
import { DEFAULT_SIZE_ID, SIZES, formatPrice, getSize, unitPrice, type Product, type Size } from "@/lib/products";
import { revealOrder } from "@/lib/reveal";
import { useAuth } from "@/providers/AuthProvider";
import { useCart } from "@/providers/CartProvider";
import { useProducts } from "@/providers/ProductsProvider";
import NotFound from "./NotFound";

type Feature = { Icon: ComponentType<SVGProps<SVGSVGElement>>; label: string; value: string };

// Feature badges: the product's own facts plus brand-wide promises.
function featuresFor(product: Product): Feature[] {
  const features: Feature[] = [];
  if (product.perfumeOil != null) features.push({ Icon: DropletIcon, label: "Perfume oil", value: `${product.perfumeOil}%` });
  if (product.longevity) features.push({ Icon: ClockIcon, label: "Longevity", value: product.longevity });
  features.push(
    { Icon: FlagIcon, label: "Origin", value: "Made in India" },
    { Icon: RabbitIcon, label: "Ethics", value: "Cruelty free" },
    { Icon: AwardIcon, label: "Quality", value: "Premium" },
  );
  return features;
}

const microLabel = "text-[11px] font-semibold uppercase tracking-[0.2em]";
const accentInk = { color: "color-mix(in oklab, var(--accent) 70%, var(--ink))" };

export default function ProductPage() {
  const { slug = "" } = useParams();
  const { products, status, error, reload, getBySlug } = useProducts();
  const product = getBySlug(slug);
  const { add, closeCart } = useCart();
  const { isAuthenticated, openAuth } = useAuth();
  const navigate = useNavigate();
  const [sizeId, setSizeId] = useState<Size["id"]>(DEFAULT_SIZE_ID);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setSizeId(DEFAULT_SIZE_ID);
    setQty(1);
  }, [slug]);

  if (!product) {
    if (status === "ready") return <NotFound />;
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 pt-[var(--header-h)]">
        <CatalogueStatus status={status} error={error} onRetry={reload} />
      </div>
    );
  }

  const price = unitPrice(product, sizeId);
  const features = featuresFor(product);
  const metaLine = [product.family, product.concentration, product.tagline].filter(Boolean).join(" · ");
  const related = [
    ...products.filter((p) => p.id !== product.id && p.group === product.group),
    ...products.filter((p) => p.group !== product.group),
  ].slice(0, 4);

  // Straight to checkout (sign-in first when needed).
  const buyNow = () => {
    add(product.id, sizeId, qty);
    closeCart();
    if (isAuthenticated) navigate("/checkout");
    else openAuth(() => navigate("/checkout"));
  };

  return (
    <div>
      {/* ── Gallery + purchase card on the hero gradient ── */}
      <section className="relative overflow-hidden" aria-labelledby="product-h">
        <div className="hero__bg" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1320px] px-5 pb-16 pt-[calc(var(--header-h)+1.25rem)] md:px-10 md:pb-20">
          <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.16em]">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link to="/" className="text-link">
                  Home
                </Link>{" "}
                /
              </li>
              <li>
                <Link to="/collection" className="text-link">
                  Collection
                </Link>{" "}
                /
              </li>
              <li aria-current="page" className="font-semibold">
                {product.name}
              </li>
            </ol>
          </nav>

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-8">
            {/* Gallery — on desktop it stretches to the details card so both columns share one height */}
            <div data-reveal="fade" className="mx-auto w-full max-w-[680px] lg:max-w-none lg:self-stretch">
              <ProductGallery product={product} />
            </div>

            <div className="rounded-[24px] border border-white/60 bg-[color-mix(in_oklab,var(--surface)_84%,transparent)] p-6 shadow-[0_24px_60px_rgba(27,24,21,.12)] backdrop-blur-md md:p-9">
              {/* Families + availability */}
              <div data-reveal="slide" className="flex flex-wrap items-center gap-2">
                {product.families.map((family) => (
                  <Link
                    key={family}
                    to={`/collection?group=${family}`}
                    className="rounded-full border border-line bg-surface px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-300 hover:border-ink lg:py-1.5"
                  >
                    {family}
                  </Link>
                ))}
                <StockBadge inStock={product.inStock} className="ml-auto" />
              </div>

              {/* Name, then family · concentration · tagline on one line, description */}
              <h1
                id="product-h"
                data-reveal="slide"
                style={revealOrder(1)}
                className="text-gradient mt-6 pb-[0.08em] font-display text-[clamp(2.4rem,3.8vw,3.25rem)] leading-[1.05]"
              >
                {product.name}
              </h1>
              <p data-reveal="slide" style={revealOrder(1)} className={`mt-3 leading-relaxed ${microLabel}`}>
                {metaLine}
              </p>
              <div data-reveal="slide" style={revealOrder(2)}>
                <Ornament align="left" className="my-6" />
              </div>
              <p data-reveal="slide" style={revealOrder(2)} className="text-[16px] leading-[1.9]">
                {product.description}
              </p>

              {/* Feature badges — one strip, gradient-ringed icons with dividers (always visible) */}
              <ul
                aria-label="Product features"
                className="mt-8 grid grid-cols-3 gap-y-5 rounded-[18px] border border-line bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))] px-2 py-5 sm:grid-cols-5 sm:gap-y-0"
              >
                {features.map(({ Icon, label, value }) => (
                  <li
                    key={label}
                    className="flex flex-col items-center px-1.5 text-center sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-[color-mix(in_oklab,var(--ink)_12%,transparent)]"
                  >
                    <span className="rounded-full p-[2px] shadow-[0_6px_16px_rgba(27,24,21,.12)]" style={{ background: "var(--button-gradient)" }} aria-hidden="true">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-surface" style={accentInk}>
                        <Icon width={19} height={19} />
                      </span>
                    </span>
                    <span className="mt-3 text-[9.5px] font-semibold uppercase tracking-[0.14em]">{label}</span>
                    <span className="mt-1 text-[13px] font-bold leading-tight" style={accentInk}>
                      {value}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Price — label and amount on one line */}
              <div data-reveal="slide" style={revealOrder(3)} className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-7">
                <p className="flex items-baseline gap-3">
                  <span className={microLabel}>Price</span>
                  <span className="whitespace-nowrap font-sans text-[2.25rem] font-bold leading-none tracking-tight tabular-nums" style={accentInk}>
                    {formatPrice(price)}
                  </span>
                </p>
                <p className="text-sm">
                  {getSize(sizeId).label} · {product.concentration}
                </p>
              </div>

              {/* Size (size | price on one line) with the quantity control, each with its own label */}
              <div data-reveal="slide" style={revealOrder(4)} className="mt-7 flex flex-wrap items-end justify-between gap-x-4 gap-y-5">
                <fieldset>
                  <legend className={microLabel}>Size</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SIZES.map((s) => (
                      <label key={s.id} className="cursor-pointer">
                        <input type="radio" name="size" value={s.id} checked={sizeId === s.id} onChange={() => setSizeId(s.id)} className="peer sr-only" />
                        <span className="flex h-11 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-line bg-surface px-3 text-[13px] leading-none transition-colors duration-500 hover:border-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2">
                          <span className="font-semibold">{s.label}</span>
                          <span className="h-3 w-px bg-current opacity-30" aria-hidden="true" />
                          <span className="tabular-nums">{formatPrice(unitPrice(product, s.id))}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <p className={microLabel} aria-hidden="true">
                    Quantity
                  </p>
                  <div className="mt-3 w-[132px]">
                    <QtyStepper
                      value={qty}
                      onDec={() => setQty((q) => Math.max(1, q - 1))}
                      onInc={() => setQty((q) => Math.min(10, q + 1))}
                      label="Quantity"
                      size="compact"
                      fullWidth
                      decDisabled={qty <= 1}
                      incDisabled={qty >= 10}
                    />
                  </div>
                </div>
              </div>

              {/* Add to cart (35%) + Buy it now (65%) */}
              {/* Stacked on phones (side by side would clip "Add to cart"), 35 / 65 from small tablets up. */}
              <div data-reveal="slide" style={revealOrder(5)} className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-[35fr_65fr]">
                <button type="button" className="btn btn-primary !h-[54px] !min-w-0 !px-3" disabled={!product.inStock} onClick={() => add(product.id, sizeId, qty)}>
                  {product.inStock ? "Add to cart" : "Sold out"}
                </button>
                <button type="button" className="btn btn-secondary !h-[54px] !min-w-0 !px-3 font-bold" disabled={!product.inStock} onClick={buyNow}>
                  Buy it now — {formatPrice(price * qty)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The composition (notes pyramid) ── */}
      <section aria-labelledby="composition-h" className="mx-auto max-w-[1100px] px-5 py-16 md:px-10 md:py-24">
        <SectionHeading id="composition-h" sub="How it unfolds on skin" title="The composition" />
        <div className="mt-12">
          <NotesPyramid product={product} />
        </div>
      </section>

      {/* ── Good to know ── */}
      <GoodToKnow product={product} />

      {/* ── Related ── */}
      {related.length > 0 && (
        <section aria-labelledby="related-h" className="py-16 md:py-24">
          <SectionHeading id="related-h" sub="You may also love" title="Pairs well with" />
          <ul className="mx-auto mt-12 grid max-w-[1200px] grid-cols-2 gap-x-5 gap-y-14 px-5 md:grid-cols-4 md:px-10">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} order={i} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
