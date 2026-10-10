import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CatalogueStatus } from "@/components/product/CatalogueStatus";
import { ProductCard } from "@/components/product/ProductCard";
import { Ornament } from "@/components/ui/Ornament";
import { useProducts } from "@/providers/ProductsProvider";
import { useWishlist } from "@/providers/WishlistProvider";

// The fragrances saved with the heart button on a product card (kept in this browser).
export default function WishlistPage() {
  const { ids, count, clear } = useWishlist();
  const { products, status, error, reload } = useProducts();

  useEffect(() => {
    document.title = "Wishlist — Azelle Fragrances";
  }, []);

  const saved = ids.map((id) => products.find((p) => p.id === id)).filter((p) => p !== undefined);

  return (
    <section className="relative overflow-hidden">
      <div className="hero__bg opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1200px] px-5 pb-24 pt-[calc(var(--header-h)+3rem)] md:px-10">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.16em]">
          <Link to="/" className="text-link">
            Home
          </Link>{" "}
          / <span className="font-semibold">Wishlist</span>
        </nav>
        <p className="section-sub mt-10">Saved for later</p>
        <Ornament align="left" className="my-3" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.05]">Wishlist</h1>
          {count > 0 && (
            <button type="button" onClick={clear} className="text-link text-sm font-semibold uppercase tracking-[0.14em]">
              Clear wishlist
            </button>
          )}
        </div>

        {status !== "ready" && products.length === 0 ? (
          <div className="mt-16">
            <CatalogueStatus status={status} error={error} onRetry={reload} />
          </div>
        ) : saved.length === 0 ? (
          <div className="mt-10 rounded-[20px] border border-line bg-surface p-8 text-center md:p-12">
            <p className="font-display text-3xl">Nothing saved yet</p>
            <p className="mx-auto mt-3 max-w-md leading-relaxed">Tap the heart on any fragrance to keep it here while you decide.</p>
            <Link to="/collection" className="btn btn-primary mt-8">
              Shop the collection
            </Link>
          </div>
        ) : (
          <ul className="mt-12 grid grid-cols-2 gap-x-5 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
            {saved.map((product, i) => (
              <ProductCard key={product.id} product={product} order={i} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
