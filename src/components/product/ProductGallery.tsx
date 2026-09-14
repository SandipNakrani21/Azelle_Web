import { useEffect, useState, type KeyboardEvent } from "react";
import { Bottle } from "@/components/ui/Bottle";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";
import { sized, srcSet } from "@/lib/images";
import { MAX_PRODUCT_IMAGES, type Product } from "@/lib/products";

// Square main image (photos are never cropped) with a thumbnail rail pinned to exactly its height.
// ←/→ keys work while focus is inside the gallery.
export function ProductGallery({ product }: { product: Product }) {
  const images = product.images.slice(0, MAX_PRODUCT_IMAGES);
  const count = images.length;
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [product.id]);

  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  // No photos yet (e.g. a new product): show the illustrated bottle instead.
  if (count === 0) {
    return (
      <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-[24px] bg-surface shadow-[0_24px_60px_rgba(27,24,21,.16)]">
        <Bottle tint={product.tint} name={product.name} className="h-[70%] w-auto" />
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={`${product.name} images`}
      onKeyDown={onKeyDown}
      className="flex flex-col-reverse gap-3 md:grid md:grid-cols-[84px_minmax(0,1fr)] lg:h-full"
    >
      {/* Rail: horizontal strip on phones. On larger screens the wrapper stretches to the main image's
          height and the rail fills it absolutely, so six equal rows never make the column taller. */}
      <div className="md:relative">
        <div
          className="row-scroll flex gap-2.5 overflow-x-auto pb-1 md:absolute md:inset-0 md:grid md:overflow-visible md:pb-0"
          style={{ gridTemplateRows: `repeat(${MAX_PRODUCT_IMAGES}, minmax(0, 1fr))` }}
        >
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1} of ${count}`}
              aria-pressed={i === index}
              className={`zoom-tile h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border-2 bg-[#fbfaf7] md:h-full md:min-h-0 md:w-full ${i === index ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <img src={sized(src, 200)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Square on small screens; on desktop it fills the column height (matched to the details card). */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-[#fbfaf7] shadow-[0_24px_60px_rgba(27,24,21,.16)] lg:aspect-auto lg:h-full lg:min-h-[520px]">
        {images.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={sized(src, 1200)}
            srcSet={srcSet(src, [600, 900, 1200])}
            sizes="(min-width: 1024px) 600px, 100vw"
            alt={`${product.name}, image ${i + 1} of ${count}`}
            aria-hidden={i !== index}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
          />
        ))}

        {count > 1 && (
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
            <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold tabular-nums text-ink shadow-sm" aria-live="polite">
              {index + 1} / {count}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => go(-1)} aria-label="Previous image" className="grid h-10 w-10 place-items-center rounded-full bg-surface text-ink shadow-sm hover:scale-105">
                <ChevronLeftIcon width={18} height={18} />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next image" className="grid h-10 w-10 place-items-center rounded-full bg-surface text-ink shadow-sm hover:scale-105">
                <ChevronRightIcon width={18} height={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
