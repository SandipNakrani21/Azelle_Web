import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const BESTSELLERS = [
  { name: "Imperium", slug: "imperium" },
  { name: "Conqueror", slug: "conqueror" },
  { name: "White Oud", slug: "white-oud" },
];

export function HouseSplit() {
  const bottleRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [pageVisible, setPageVisible] = useState(typeof document === "undefined" || !document.hidden);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const playing = visible && loaded && pageVisible && !interacting && !reducedMotion;
  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % BESTSELLERS.length), 6500);
    return () => window.clearInterval(timer);
  }, [playing, active]);
  useEffect(() => {
    const bottle = bottleRef.current;
    if (!bottle) return;
    const observer = new IntersectionObserver(entries => {
      setVisible(entries.some(entry => entry.isIntersecting));
    }, { threshold: .2 });
    observer.observe(bottle);
    return () => observer.disconnect();
  }, []);
  return (
    <section id="house" aria-labelledby="house-h" className={`house-light-section mx-auto max-w-[1200px] px-6 py-16 md:px-10 md:py-24 ${visible && pageVisible ? "is-illuminated" : ""}`}>
      <div className="house-light-background" aria-hidden="true"><i /><i /><i /><span /></div>
      {/* Two columns from lg only — at tablet widths the text column became too narrow beside the photo. */}
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-24">
        <div data-reveal="left">
          <SectionHeading id="house-h" sub="About the house" title="Perfume that takes its time." align="left" />
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
          <Link to="/pages/our-story" className="link-underline mt-8">
            Read more
          </Link>
        </div>
        <div ref={bottleRef} data-reveal="right" className="house-bottle-visual house-bestsellers"
          role="region" aria-roledescription="carousel" aria-label="Our top three bestsellers"
          onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
          onFocus={() => setInteracting(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
          <div className={`house-cinematic-stage house-cinematic-stage--${active} ${playing ? "is-playing" : ""}`}>
          <div className="house-cinematic-light" aria-hidden="true"><i /><i /></div>
          <span className="house-cinematic-shadow" aria-hidden="true" />
          {BESTSELLERS.map((product, index) => <Link key={product.slug}
            to={`/product/${product.slug}`} className={`house-bestseller-slide ${(index - active + 3) % 3 === 0 ? "is-active" : (index - active + 3) % 3 === 1 ? "is-next" : "is-previous"}`}
            onFocus={() => setActive(index)}
            aria-label={`Discover ${product.name}, bestseller number ${index + 1}`}>
          <img
            src={`/images/products/${product.slug}-matched-bottle.webp`}
            width="900"
            height="900"
            alt={`Azelle ${product.name} perfume bottle`}
            loading="lazy"
            decoding="async"
            className="house-trio-bottle"
            onLoad={() => { if (index === 0) setLoaded(true); }}
          />
          </Link>)}
          </div>
        </div>
      </div>
    </section>
  );
}
