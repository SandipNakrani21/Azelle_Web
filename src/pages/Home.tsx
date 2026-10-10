import { DeferredHome } from "@/components/home/DeferredHome";
import { Hero } from "@/components/home/Hero";
import { ProductCard } from "@/components/product/ProductCard";
import { Marquee } from "@/components/ui/Marquee";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MARQUEE_ITEMS } from "@/lib/content";
import { CatalogueStatus } from "@/components/product/CatalogueStatus";
import { useProducts } from "@/providers/ProductsProvider";

export default function Home() {
  const { products, status, error, reload } = useProducts();

  return (
    <div className="glossy-home">
      <Hero />
      <Marquee items={MARQUEE_ITEMS} className="bg-accent py-4 text-accent-ink" />

      <section id="collection" aria-labelledby="collection-h" className="collection-band py-16 md:py-24">
        <SectionHeading id="collection-h" sub="Composed slowly, worn closely" title="The collection" />
        <CatalogueStatus status={status} error={error} onRetry={reload} />
        <ul className="scroll-drift mx-auto mt-14 grid max-w-[1440px] grid-cols-2 gap-x-5 gap-y-14 px-5 md:grid-cols-3 md:px-10 xl:grid-cols-5">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} order={i} />
          ))}
        </ul>
      </section>

      <DeferredHome catalogueReady={status !== "loading"} />
    </div>
  );
}
