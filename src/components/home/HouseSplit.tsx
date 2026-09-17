import { Link } from "react-router-dom";
import { Ornament } from "@/components/ui/Ornament";
import { sized, srcSet } from "@/lib/images";
import { useProducts } from "@/providers/ProductsProvider";

export function HouseSplit() {
  const { products } = useProducts();
  const image = products[0]?.images[2] ?? products.flatMap((p) => p.images)[0];

  return (
    <section id="house" aria-labelledby="house-h" className="mx-auto max-w-[1200px] px-6 py-16 md:px-10 md:py-24">
      {/* Two columns from lg only — at tablet widths the text column became too narrow beside the photo. */}
      <div data-reveal="slide" className="grid items-stretch gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-24">
        <div>
          <p className="section-sub">About the house</p>
          <Ornament align="left" className="mb-4 mt-2" />
          <h2 id="house-h" className="font-display text-[clamp(2.2rem,4.5vw,3.75rem)] leading-[1.05]">
            Perfume that takes its time.
          </h2>
          <p className="mt-6 font-semibold">Fewer bottles, better made.</p>
          <div className="mt-4 space-y-4 leading-relaxed">
            <p>
              Azelle began with a single osmanthus absolute and a refusal to rush it. Every fragrance is composed, macerated
              and finished in batches small enough to judge by nose.
            </p>
            <p>
              No shortcuts, no seasonal launches — just a short collection of scents made to be worn for years.{" "}
              <strong>Composed slowly, worn closely.</strong>
            </p>
          </div>
          <Link to="/collection" className="link-underline mt-8">
            Read more
          </Link>
        </div>
        <div className="zoom-tile relative min-h-[320px] overflow-hidden rounded-[20px] bg-surface2 md:min-h-[380px] lg:min-h-0">
          {image && (
          <img
            src={sized(image, 1200)}
            srcSet={srcSet(image)}
            sizes="(min-width: 768px) 400px, 100vw"
            alt="An Azelle bottle on a stone surface"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          )}
        </div>
      </div>
    </section>
  );
}
