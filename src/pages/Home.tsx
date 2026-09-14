import { Atelier } from "@/components/home/Atelier";
import { FollowUs } from "@/components/home/FollowUs";
import { Hero } from "@/components/home/Hero";
import { HouseSplit } from "@/components/home/HouseSplit";
import { PromiseSection } from "@/components/home/Promise";
import { Reviews } from "@/components/home/Reviews";
import { ShopByFamily } from "@/components/home/ShopByFamily";
import { ShopByNote } from "@/components/home/ShopByNote";
import { Stockists } from "@/components/home/Stockists";
import { ProductCard } from "@/components/product/ProductCard";
import { Marquee } from "@/components/ui/Marquee";
import { Ornament } from "@/components/ui/Ornament";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MARQUEE_ITEMS } from "@/lib/content";
import { CatalogueStatus } from "@/components/product/CatalogueStatus";
import { useProducts } from "@/providers/ProductsProvider";

export default function Home() {
  const { products, status, error, reload } = useProducts();

  return (
    <>
      <Hero />
      <Marquee items={MARQUEE_ITEMS} className="bg-accent py-4 text-accent-ink" />

      <section id="collection" aria-labelledby="collection-h" className="py-16 md:py-24">
        <SectionHeading id="collection-h" sub="Composed slowly, worn closely" title="The collection" />
        <CatalogueStatus status={status} error={error} onRetry={reload} />
        <ul className="mx-auto mt-14 grid max-w-[1440px] grid-cols-2 gap-x-5 gap-y-14 px-5 md:grid-cols-3 md:px-10 xl:grid-cols-6">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} order={i} />
          ))}
        </ul>
      </section>

      <HouseSplit />
      <div className="brand-gradient">
        <ShopByNote />
        <div className="mx-auto max-w-[1000px] px-6 pb-12 md:pb-16">
          <Ornament wide tone="light" />
        </div>
        <ShopByFamily />
      </div>
      <Reviews />
      <Stockists />
      <PromiseSection />
      <Atelier />
      <FollowUs />
    </>
  );
}
