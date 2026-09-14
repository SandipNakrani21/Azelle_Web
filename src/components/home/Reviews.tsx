import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, QuoteBlob } from "@/components/ui/Icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { REVIEWS, type Review } from "@/lib/content";

const SPEED = 600; // ms per slide, as on the reference slider
const GAP = 24;
const BLOBS = [
  "color-mix(in oklab, var(--accent) 60%, var(--surface))",
  "color-mix(in oklab, #e8cf6f 70%, var(--surface))",
  "color-mix(in oklab, #8fb08a 70%, var(--surface))",
];

// Infinite slider: clones perView slides at each end and silently re-centres after each move.
export function Reviews() {
  const isMobile = useMediaQuery("(max-width: 749px)");
  const isTablet = useMediaQuery("(max-width: 989px)");
  const perView = isMobile ? 1 : isTablet ? 2 : 3;
  const n = REVIEWS.length;

  const [index, setIndex] = useState(perView);
  const [animate, setAnimate] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    setAnimate(false);
    setIndex(perView);
  }, [perView]);

  // Re-enable transitions two frames after a silent jump.
  useEffect(() => {
    if (animate) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [animate]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      busy.current = false;
      if (index >= n + perView) {
        setAnimate(false);
        setIndex(index - n);
      } else if (index < perView) {
        setAnimate(false);
        setIndex(index + n);
      }
    }, SPEED + 40);
    return () => window.clearTimeout(t);
  }, [index, n, perView]);

  const go = (dir: 1 | -1) => {
    if (busy.current) return;
    busy.current = true;
    setIndex((i) => i + dir);
  };

  const slides = [...REVIEWS.slice(-perView), ...REVIEWS, ...REVIEWS.slice(0, perView)];

  return (
    <section id="reviews" aria-labelledby="reviews-h" className="py-16 md:py-24">
      <SectionHeading id="reviews-h" sub="Worn and loved" title="What they say" />
      <div data-reveal="slide" className="relative mx-auto mt-12 max-w-[1200px] px-12 md:px-16" aria-roledescription="carousel">
        <div className="overflow-hidden">
          <ul
            className="flex"
            style={{
              gap: GAP,
              transform: `translateX(calc(${-index} * (100% + ${GAP}px) / ${perView}))`,
              transition: animate ? `transform ${SPEED}ms ease` : "none",
            }}
          >
            {slides.map((review, k) => {
              const visible = k >= index && k < index + perView;
              const original = (k - perView + n) % n;
              return (
                <li
                  key={k}
                  className="shrink-0"
                  style={{ flexBasis: `calc((100% - ${GAP * (perView - 1)}px) / ${perView})` }}
                  aria-roledescription="slide"
                  aria-hidden={!visible}
                  inert={!visible}
                >
                  <ReviewCard review={review} blob={BLOBS[original % BLOBS.length]} />
                </li>
              );
            })}
          </ul>
        </div>
        <button type="button" className="slider-arrow absolute left-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center" onClick={() => go(-1)} aria-label="Previous reviews">
          <ChevronLeftIcon />
        </button>
        <button type="button" className="slider-arrow absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center" onClick={() => go(1)} aria-label="Next reviews">
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  );
}

function ReviewCard({ review, blob }: { review: Review; blob: string }) {
  return (
    <article className="flex h-full flex-col items-center px-2 text-center">
      <QuoteBlob color={blob} className="h-16 w-16" />
      <h3 className="mt-6 text-[17px] font-semibold uppercase leading-snug tracking-[0.04em]">{review.title}</h3>
      <p className="mt-5 leading-relaxed">{review.body}</p>
      <div className="mt-auto flex items-center gap-3 pt-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ink font-display text-lg text-bg" aria-hidden="true">
          {review.name[0]}
        </span>
        <span className="text-sm uppercase tracking-[0.12em]">{review.name}</span>
      </div>
    </article>
  );
}
