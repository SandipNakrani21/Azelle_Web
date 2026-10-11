import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bottle } from "@/components/ui/Bottle";
import { EyeIcon, TrolleyIcon, WishFilledIcon, WishIcon } from "@/components/ui/Icons";
import { Stars } from "@/components/ui/Stars";
import { sized, srcSet } from "@/lib/images";
import { DEFAULT_SIZE_ID, formatPrice, unitPrice, type Product } from "@/lib/products";
import { revealOrder } from "@/lib/reveal";
import { useCart } from "@/providers/CartProvider";
import { useWishlist } from "@/providers/WishlistProvider";
import { useAuth } from "@/providers/AuthProvider";

const transparentProducts = new Set(["white-oud", "imperium", "imperium-2", "urban-voyage", "desire-edge", "conqueror"]);

// Hover (desktop): bottle tilts 10°, title underlines, action icons turn a full clockwise circle
// (and back anti-clockwise when the pointer leaves) while the brand gradient fills the button.
export function ProductCard({ product, order = 0, raised = true }: { product: Product; order?: number; raised?: boolean }) {
  const { add, closeCart } = useCart();
  const { isAuthenticated, openAuth } = useAuth();
  const navigate = useNavigate();
  const buyNow = () => {
    add(product.id, DEFAULT_SIZE_ID, 1);
    closeCart();
    if (isAuthenticated) navigate("/checkout");
    else openAuth(() => navigate("/checkout"));
  };
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  const href = `/product/${product.slug}`;
  const [previewPhoto, setPreviewPhoto] = useState(false);
  const transparentPhoto = transparentProducts.has(product.slug);
  const cardPhoto = transparentPhoto ? `/images/products/${product.slug === "imperium-2" ? "imperium" : product.slug}-matched-bottle.webp` : product.images[0];
  const alternatePhoto = transparentPhoto ? undefined : product.images[1];
  const cardRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const card = cardRef.current;
    const photo = card?.querySelector<HTMLImageElement>(".card-photo");
    if (!card || !photo) return;
    let top = 0, bottom = 1;
    const position = () => {
      if (!photo.naturalWidth) return;
      const media = card.querySelector<HTMLElement>(".card-media")!;
      const frame = photo.parentElement!;
      const height = transparentPhoto ? Math.min(photo.clientHeight, photo.clientWidth * photo.naturalHeight / photo.naturalWidth) : photo.clientHeight;
      const inset = (photo.clientHeight - height) / 2;
      card.style.setProperty("--bottle-panel-top", `${media.offsetTop + frame.offsetTop + inset + height * (top + (bottom - top) * .75)}px`);
    };
    const measure = () => {
      // Ignore transparent image padding when locating the visible bottle.
      if (transparentPhoto && photo.naturalWidth) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 64; canvas.height = 64;
          const context = canvas.getContext("2d")!;
          context.drawImage(photo, 0, 0, 64, 64);
          const pixels = context.getImageData(0, 0, 64, 64).data;
          let first = 64, last = -1;
          for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
            if (pixels[(y * 64 + x) * 4 + 3] > 100) { first = Math.min(first, y); last = Math.max(last, y); }
          }
          if (last >= first) { top = first / 64; bottom = (last + 1) / 64; }
        } catch { /* Full image bounds remain the fallback for external photos. */ }
      }
      position();
    };
    const observer = new ResizeObserver(position);
    observer.observe(photo);
    photo.addEventListener("load", measure);
    if (photo.complete) measure();
    return () => { observer.disconnect(); photo.removeEventListener("load", measure); };
  }, [cardPhoto, transparentPhoto]);

  return (
    <li ref={cardRef} data-product-slug={product.slug} data-reveal="slide" style={revealOrder(order)} className="product-card flex flex-col items-center text-center" onPointerEnter={(event) => { if (event.pointerType !== "touch") setPreviewPhoto(true); }}>
      <Link to={href} className="card-media relative block w-full" tabIndex={-1} aria-hidden="true">
        {cardPhoto ? (
          // Real product photo (first image); the second photo fades in on hover when there is one.
          // No tile or shadow behind it — the photo sits straight on the section colour.
          <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden">
            <img src={sized(cardPhoto, 560)} srcSet={srcSet(cardPhoto)} sizes="(min-width: 1280px) 230px, (min-width: 768px) 30vw, 45vw" width="560" height="560" alt="" loading="lazy" decoding="async" className={`card-photo absolute inset-0 h-full w-full ${transparentPhoto ? "object-contain" : "object-cover"}`} />
            {previewPhoto && alternatePhoto && (
              <img src={sized(alternatePhoto, 560)} srcSet={srcSet(alternatePhoto)} sizes="(min-width: 1280px) 230px, (min-width: 768px) 30vw, 45vw" width="560" height="560" alt="" loading="lazy" decoding="async" className="card-photo-alt absolute inset-0 h-full w-full object-cover" />
            )}
          </div>
        ) : (
          <div className="mx-auto aspect-[5/8] w-[72%] max-w-[200px]">
            <Bottle tint={product.tint} name={product.name} decorative className="h-full w-full" />
          </div>
        )}
        {!product.inStock && <span className="sold-badge">Sold out</span>}
      </Link>
      {/* Name and price share one line, at the same size and weight. */}
      <h3 className="mt-5 text-balance text-[15px] font-bold uppercase leading-snug tracking-[0.05em]">
        {/* .card-title and .link-underline get extra padding below lg (index.css) for a tap-sized target. */}
        <Link to={href} className="card-title text-gradient">
          {product.name}
        </Link>
        {!raised && <span className="card-sep" aria-hidden="true">
          -
        </span>}
        {!raised && <span className="card-price">{formatPrice(unitPrice(product, DEFAULT_SIZE_ID))}</span>}
      </h3>
      {/* Rating from approved reviews */}
      {product.ratingCount ? (
        <Link to={`${href}#reviews`} className="mt-1.5 flex items-center gap-1.5 text-[12.5px]" aria-label={`Rated ${product.ratingAvg} out of 5 from ${product.ratingCount} reviews`}>
          <span className="font-semibold">{product.ratingAvg?.toFixed(1)}</span>
          <span className="text-soft">({product.ratingCount})</span>
          <Stars value={product.ratingAvg ?? 0} size={14} />
        </Link>
      ) : (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-soft">
          <Stars value={0} size={14} />
          No reviews yet
        </p>
      )}
      <div className="mt-4 flex items-center justify-center gap-3">
        <Link to={href} className="pcard-btn" data-label="Discover" aria-label={`Discover ${product.name}`}>
          <EyeIcon width={20} height={20} />
        </Link>
        <button
          type="button"
          className={`pcard-btn ${saved ? "is-saved" : ""}`}
          data-label={saved ? "Saved" : "Wishlist"}
          aria-pressed={saved}
          onClick={() => toggle(product.id)}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        >
          {saved ? <WishFilledIcon width={20} height={20} /> : <WishIcon width={20} height={20} />}
        </button>
        <button
          type="button"
          className="pcard-btn"
          data-label={product.inStock ? "Add to cart" : "Sold out"}
          disabled={!product.inStock}
          onClick={() => add(product.id, DEFAULT_SIZE_ID)}
          aria-label={product.inStock ? `Add ${product.name}, 50 ml, to cart` : `${product.name} is sold out`}
        >
          <TrolleyIcon width={20} height={20} />
        </button>
      </div>
      {raised && <button type="button" className="home-card-buy" disabled={!product.inStock} onClick={buyNow} aria-label={`Buy ${product.name} now`}>Buy now</button>}
      {raised && <span className="home-card-price">{formatPrice(unitPrice(product, DEFAULT_SIZE_ID))}</span>}
    </li>
  );
}
