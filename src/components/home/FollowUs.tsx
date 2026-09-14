import { SectionHeading } from "@/components/ui/SectionHeading";
import { sized } from "@/lib/images";
import { useProducts } from "@/providers/ProductsProvider";
import { revealOrder } from "@/lib/reveal";

export function FollowUs() {
  const { products } = useProducts();
  const tiles = products.filter((p) => p.images.length > 0).slice(0, 6);

  return (
    <section aria-labelledby="follow-h" className="py-16 md:py-24">
      <SectionHeading id="follow-h" sub="Share the ritual" title="Follow the house" />
      <ul className="mx-auto mt-10 grid max-w-[1440px] grid-cols-2 gap-3 px-5 md:grid-cols-3 md:px-10 lg:grid-cols-6">
        {tiles.map((p, i) => (
          <li key={p.id} data-reveal="slide" style={revealOrder(i)} className="follow-tile overflow-hidden rounded-[14px] bg-surface2">
            <img src={sized(p.images[2] ?? p.images[0], 500)} alt={`${p.name} styled on a table`} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
          </li>
        ))}
      </ul>
    </section>
  );
}
