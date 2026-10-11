import { useStore } from "@/providers/StoreProvider";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { sized, srcSet } from "@/lib/images";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  type Product,
  type Size,
  SIZES,
  DEFAULT_SIZE_ID,
  unitPrice,
  formatPrice,
} from "@/lib/products";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useWishlist } from "@/providers/WishlistProvider";
import { Bottle } from "@/components/ui/Bottle";
import { Stars } from "@/components/ui/Stars";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { StockBadge } from "@/components/ui/StockBadge";
import { scrollToReviews } from "@/lib/reviewNavigation";
import { ScrollSection } from "@/components/product/ScrollSection";
import { ProductReviews } from "@/components/product/ProductReviews";
import { NotesPyramid } from "@/components/product/NotesPyramid";
import { ProductCard } from "@/components/product/ProductCard";
import { GoodToKnow } from "@/components/product/GoodToKnow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  DropletIcon,
  ClockIcon,
  RabbitIcon,
  AwardIcon,
  TruckIcon,
  GiftIcon,
  BagIcon,
  WishIcon,
  ShareIcon,
  CheckCircleIcon,
} from "@/components/ui/Icons";

export default function ProductDetails({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const [image, setImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let inView = true;
    const update = () => {
      stage.dataset.motionPaused = String(!inView || document.hidden);
    };
    const observer = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      update();
    });
    observer.observe(stage);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    sceneRef.current?.style.setProperty(
      "--display-y",
      `${((event.clientX - bounds.left) / bounds.width - 0.5) * 12}deg`,
    );
    sceneRef.current?.style.setProperty(
      "--display-x",
      `${-((event.clientY - bounds.top) / bounds.height - 0.5) * 8}deg`,
    );
  };
  const resetTilt = () => {
    sceneRef.current?.style.setProperty("--display-y", "0deg");
    sceneRef.current?.style.setProperty("--display-x", "0deg");
  };
  const [params] = useSearchParams();
  const requestedSize = params.get("size");
  const [size, setSize] = useState<Size["id"]>(
    requestedSize === "30" || requestedSize === "50" || requestedSize === "100"
      ? requestedSize
      : DEFAULT_SIZE_ID,
  );
  const [qty, setQty] = useState(1);
  const [copied, setCopied] = useState(false);
  const { add, closeCart } = useCart();
  const { has, toggle } = useWishlist();
  const { isAuthenticated, openAuth } = useAuth();
  const navigate = useNavigate();
  const bottleSlug = product.slug === "imperium-2" ? "imperium" : product.slug;
  const displayBottle = [
    "imperium",
    "white-oud",
    "conqueror",
    "urban-voyage",
    "desire-edge",
  ].includes(bottleSlug)
    ? `/images/products/${bottleSlug}-matched-bottle.webp`
    : undefined;
  const images = displayBottle
    ? [displayBottle, ...product.images.filter((src) => src !== displayBottle)]
    : product.images;
  const { gstRate, shippingFee } = useStore();
  const price = unitPrice(product, size);
  const buy = () => {
    add(product.id, size, qty);
    closeCart();
    if (isAuthenticated) navigate("/checkout");
    else openAuth(() => navigate("/checkout"));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const features = [
    {
      Icon: DropletIcon,
      title:
        product.perfumeOil != null
          ? `${product.perfumeOil}% perfume oil`
          : product.concentration,
    },
    { Icon: ClockIcon, title: product.longevity || "Long lasting" },
    { Icon: AwardIcon, title: "Premium ingredients" },
    { Icon: RabbitIcon, title: "Cruelty free" },
  ];
  return (
    <div className="product-details-page">
      <section className="i2-wrap" aria-labelledby="i2-title">
        <div className="page-heading-row i2-heading-row">
          <p className="section-sub">The collection</p>
          <nav className="i2-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/collection">Collection</Link>
            <span>/</span>
            <span>{product.name}</span>
          </nav>
        </div>
        <div className="i2-columns">
          <div className="i2-left">
            <div className="i2-panel i2-showcase">
              <span className="i2-tag">{product.concentration}</span>
              <div className="i2-tools i2-gallery-tools">
                <button
                  type="button"
                  onClick={copy}
                  aria-label={
                    copied ? "Product link copied" : `Share ${product.name}`
                  }
                  title={copied ? "Link copied" : "Share product"}
                >
                  {copied ? (
                    <CheckCircleIcon width={22} height={22} />
                  ) : (
                    <ShareIcon width={22} height={22} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => toggle(product.id)}
                  aria-label={`Save ${product.name}`}
                  aria-pressed={has(product.id)}
                  title="Wishlist"
                >
                  <WishIcon width={23} height={23} />
                </button>
              </div>
              <div className="i2-gallery">
                <div className="i2-thumbnails" aria-label="Product images">
                  {images.map((src, i) => (
                    <button
                      key={src}
                      onClick={() => {
                        setImageFailed(false);
                        setImage(i);
                      }}
                      aria-label={`Show ${product.name} image ${i + 1}`}
                      aria-pressed={image === i}
                    >
                      <img
                        src={sized(src, 200)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
                <div
                  ref={stageRef}
                  className={`i2-stage i2-stage--animated ${image === 0 ? "i2-stage--bottle" : ""}`}
                  onPointerMove={tilt}
                  onPointerLeave={resetTilt}
                >
                  <div className="i2-light" />
                  {image === 0 ? (
                    <>
                      <div className="i2-scene" ref={sceneRef}>
                        <div className="i2-floor-shadow" aria-hidden="true" />
                        <div className="i2-bottle">
                          {images[0] && !imageFailed ? (
                            <img
                              src={sized(images[0], 1200)}
                              srcSet={srcSet(images[0])}
                              sizes="(max-width: 700px) 75vw, 450px"
                              alt={`${product.name}, view 1`}
                              onError={() => setImageFailed(true)}
                              fetchPriority="high"
                              loading="eager"
                              decoding="async"
                            />
                          ) : (
                            <Bottle
                              tint={product.tint}
                              name={product.name}
                              className="h-full w-auto"
                            />
                          )}
                        </div>
                        <div className="i2-plinth" aria-hidden="true">
                          <span className="i2-plinth-glow" />
                          <span className="i2-plinth-front" />
                          <span className="i2-plinth-top" />
                          <span className="i2-plinth-edge" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={sized(images[image], 1200)}
                      alt={`${product.name}, view ${image + 1}`}
                      decoding="async"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="i2-panel i2-promises">
              <div>
                <TruckIcon />
                <span>
                  Shipping across India<small>Calculated at checkout</small>
                </span>
              </div>
              <div>
                <GiftIcon />
                <span>
                  Complimentary samples<small>Find your next signature</small>
                </span>
              </div>
              <div>
                <CheckCircleIcon />
                <span>
                  Secure payment<small>Protected checkout</small>
                </span>
              </div>
            </div>
          </div>
          <div className="i2-right">
            <div className="i2-panel i2-details">
              <div className="i2-details-top">
                <span className="i2-eyebrow">
                  {product.tagline || "Azelle Fragrances"}
                </span>
                <StockBadge
                  inStock={product.inStock}
                  className={`i2-stock ${product.inStock ? "i2-stock--available" : ""}`}
                />
              </div>
              <div className="i2-title-row">
                <h1 id="i2-title">{product.name}</h1>
                <div className="i2-title-tags" aria-label="Fragrance family">
                  {product.families.map((family) => (
                    <Link key={family} to={`/collection?group=${family}`}>
                      {family}
                    </Link>
                  ))}
                </div>
              </div>
              <p className="i2-description">{product.description}</p>
              <button className="i2-rating" onClick={scrollToReviews}>
                <Stars value={product.ratingAvg ?? 0} size={18} />
                <span>
                  {product.ratingCount
                    ? `${product.ratingAvg?.toFixed(1)} (${product.ratingCount} reviews)`
                    : "No reviews yet"}
                </span>
              </button>
              <div className="i2-price">{formatPrice(price)}</div>
              <p className="i2-price-note">
                {formatPrice(Math.round(price * (1 + gstRate) * 100) / 100)}{" "}
                including GST. Shipping {formatPrice(shippingFee)} per order;
                eligible coupons apply at checkout.
              </p>
              <hr />
              <fieldset className="i2-sizes">
                <legend>Bottle size</legend>
                <div>
                  {SIZES.map((s) => (
                    <label key={s.id}>
                      <input
                        type="radio"
                        name="product-size"
                        value={s.id}
                        checked={size === s.id}
                        onChange={() => setSize(s.id)}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="i2-quantity">
                <div>
                  <span>Quantity</span>
                  <QtyStepper
                    value={qty}
                    onDec={() => setQty((q) => Math.max(1, q - 1))}
                    onInc={() => setQty((q) => Math.min(10, q + 1))}
                    label="Quantity"
                    size="compact"
                    decDisabled={qty <= 1}
                    incDisabled={qty >= 10}
                  />
                </div>
              </div>
              <div className="i2-buy">
                <button
                  className="btn btn-primary"
                  disabled={!product.inStock}
                  onClick={() => add(product.id, size, qty)}
                >
                  <BagIcon width={19} height={19} />
                  {product.inStock ? "Add to bag" : "Sold out"}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={!product.inStock}
                  onClick={buy}
                >
                  Buy now
                </button>
              </div>
            </div>
            <div className="i2-panel i2-features">
              {features.map(({ Icon, title }) => (
                <div key={title}>
                  <Icon width={25} height={25} />
                  <span>{title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <ScrollSection name="composition-h" height={600}>
        <section className="i2-composition">
          <SectionHeading
            id="composition-h"
            sub="How it unfolds on skin"
            title="The composition"
          />
          <NotesPyramid product={product} glossy />
        </section>
      </ScrollSection>
      <ScrollSection name="details-h" height={820}>
        <GoodToKnow product={product} />
      </ScrollSection>
      <section className="product-answers" aria-labelledby="product-answers-h">
        <h2 id="product-answers-h" className="font-display text-3xl">
          About {product.name}
        </h2>
        <details>
          <summary>What does {product.name} smell like?</summary>
          <p>
            {product.description} Opening notes: {product.pyramid.top}. Heart:{" "}
            {product.pyramid.heart}. Base: {product.pyramid.base}.
          </p>
        </details>
        <details>
          <summary>Which sizes are available?</summary>
          <p>
            Choose 30 ml, 50 ml or 100 ml. All sizes share the same{" "}
            {product.concentration.toLowerCase()} composition.
          </p>
        </details>
        <details>
          <summary>How long does it last?</summary>
          <p>
            {product.longevity ||
              "Wear time varies with skin, weather and application."}{" "}
            Individual wear time varies with skin and conditions.
          </p>
        </details>
        <details>
          <summary>What will I pay?</summary>
          <p>
            The selected bottle costs{" "}
            {formatPrice(Math.round(price * (1 + gstRate) * 100) / 100)}{" "}
            including GST. Shipping is {formatPrice(shippingFee)} per order
            before any eligible shipping coupon. Your final total is shown
            before payment.
          </p>
        </details>
        <Link className="text-link" to="/collection">
          Compare fragrance notes across the collection
        </Link>
      </section>
      <ScrollSection name="reviews" height={500}>
        <ProductReviews product={product} showcase />
      </ScrollSection>
      <ScrollSection name="i2-related-h" height={680}>
        <section
          className="raised-product-section i2-recommendations"
          aria-labelledby="i2-related-h"
        >
          <SectionHeading
            id="i2-related-h"
            sub="Find your next signature"
            title="You may also like"
          />
          <ul className="mx-auto mt-14 grid max-w-[1440px] grid-cols-2 gap-x-5 gap-y-14 px-5 md:grid-cols-3 md:px-10 xl:grid-cols-5">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} order={i} raised />
            ))}
          </ul>
        </section>
      </ScrollSection>
    </div>
  );
}
