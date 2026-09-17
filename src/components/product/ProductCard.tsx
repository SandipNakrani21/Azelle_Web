import { Link } from "react-router-dom";
import { Bottle } from "@/components/ui/Bottle";
import { sized } from "@/lib/images";
import { DEFAULT_SIZE_ID, formatPrice, unitPrice, type Product } from "@/lib/products";
import { revealOrder } from "@/lib/reveal";
import { useCart } from "@/providers/CartProvider";

// Hover (desktop): bottle tilts 10°, title underlines, outline button fills — all 0.5s.
export function ProductCard({ product, order = 0 }: { product: Product; order?: number }) {
  const { add } = useCart();
  const href = `/product/${product.slug}`;

  return (
    <li data-reveal="slide" style={revealOrder(order)} className="product-card flex flex-col items-center text-center">
      <Link to={href} className="card-media relative block w-full" tabIndex={-1} aria-hidden="true">
        {product.images[0] ? (
          // Real product photo (first image); the second photo fades in on hover when there is one.
          <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-[18px] bg-[#fbfaf7] shadow-[0_12px_30px_rgba(27,24,21,.08)]">
            <img src={sized(product.images[0], 560)} alt="" loading="lazy" decoding="async" className="card-photo absolute inset-0 h-full w-full object-cover" />
            {product.images[1] && (
              <img src={sized(product.images[1], 560)} alt="" loading="lazy" decoding="async" className="card-photo-alt absolute inset-0 h-full w-full object-cover" />
            )}
          </div>
        ) : (
          <div className="mx-auto aspect-[5/8] w-[72%] max-w-[200px]">
            <Bottle tint={product.tint} name={product.name} decorative className="h-full w-full" />
          </div>
        )}
        {!product.inStock && <span className="sold-badge">Sold out</span>}
      </Link>
      <h3 className="mt-5 text-[15px] font-medium uppercase leading-snug tracking-[0.06em]">
        {/* .card-title and .link-underline get extra padding below lg (index.css) for a tap-sized target. */}
        <Link to={href} className="card-title text-gradient">
          {product.name}
        </Link>
      </h3>
      <p className="mt-1 text-[13px]">{product.family}</p>
      <p className="mt-2 font-display text-xl">{formatPrice(unitPrice(product, DEFAULT_SIZE_ID))}</p>
      <button
        type="button"
        className="btn btn-secondary card-btn mt-4 w-full max-w-[200px] !min-w-0 !px-3"
        disabled={!product.inStock}
        onClick={() => add(product.id, DEFAULT_SIZE_ID)}
        aria-label={product.inStock ? `Add ${product.name}, 50 ml, to cart` : `${product.name} is sold out`}
      >
        {product.inStock ? "Add to cart" : "Sold out"}
      </button>
      <Link to={href} className="link-underline mt-3" aria-label={`Discover ${product.name}`}>
        Discover
      </Link>
    </li>
  );
}
