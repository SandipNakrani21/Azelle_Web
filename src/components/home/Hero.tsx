import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Bottle } from "@/components/ui/Bottle";
import { Ornament } from "@/components/ui/Ornament";
import { HERO_VIDEO_SRC } from "@/lib/media";
import { useProducts } from "@/providers/ProductsProvider";
import { revealOrder } from "@/lib/reveal";

const PETALS = [
  { x: "6%", y: "72%", s: 22, d: 0, r: -20 },
  { x: "84%", y: "8%", s: 18, d: 0.6, r: 30 },
  { x: "78%", y: "82%", s: 26, d: 1.2, r: 60 },
  { x: "46%", y: "4%", s: 14, d: 0.3, r: -40 },
  { x: "4%", y: "18%", s: 16, d: 0.9, r: 15 },
];

type VideoState = "loading" | "ready" | "error";

const TAGLINE = "Fragrance Beyond Words";

// ⚠ Placeholder figures — replace with Azelle's real, verifiable numbers before launch. Advertised
// claims must be accurate under the Consumer Protection Act, 2019. (The fragrance count is live.)
const HERO_STATS = { ordersDelivered: 10000, citiesServed: 250 };

// Counts from 0 up to `target` with an ease-out curve (jumps straight there with reduced motion).
function useCountUp(target: number, duration = 1800, delay = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let interval: number | undefined;
    const start = window.setTimeout(() => {
      const startedAt = performance.now();
      interval = window.setInterval(() => {
        const progress = Math.min(1, (performance.now() - startedAt) / duration);
        setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
        if (progress >= 1) window.clearInterval(interval);
      }, 30);
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [target, duration, delay]);
  return value;
}

// Reveals `text` one character at a time (instantly when the visitor prefers reduced motion).
function useTypewriter(text: string, delay = 450, speed = 85) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let typed = 0;
    let interval: number | undefined;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        typed += 1;
        setCount(typed);
        if (typed >= text.length) window.clearInterval(interval);
      }, speed);
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [text, delay, speed]);
  return count;
}

export function Hero() {
  const { products } = useProducts();
  const front = products[0] ?? { name: "White Oud", tint: "#c8b9a3" };
  const back = products[2] ?? products[1] ?? { name: "Urban Voyage", tint: "#b5553f" };
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoState, setVideoState] = useState<VideoState>("loading");
  const [playing, setPlaying] = useState(false);
  const typed = useTypewriter(TAGLINE);
  const orders = useCountUp(HERO_STATS.ordersDelivered);
  const cities = useCountUp(HERO_STATS.citiesServed);
  const fragrances = useCountUp(products.length);
  const stats = [
    { value: fragrances, target: products.length, suffix: "", label: "Products" },
    { value: cities, target: HERO_STATS.citiesServed, suffix: "+", label: "Cities Delivered" },
    { value: orders, target: HERO_STATS.ordersDelivered, suffix: "+", label: "Orders Delivered" },
  ];
  const doneTyping = typed >= TAGLINE.length;
  // After typing, the caret blinks a few more times, then is removed.
  const [caretGone, setCaretGone] = useState(false);
  useEffect(() => {
    if (!doneTyping) return;
    const timer = window.setTimeout(() => setCaretGone(true), 2700);
    return () => window.clearTimeout(timer);
  }, [doneTyping]);

  // Autoplay (muted) unless the visitor prefers reduced motion.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.play().catch(() => setPlaying(false));
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setPlaying(false));
    else video.pause();
  };

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-h">
      <div className="hero__bg" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-6 pb-12 pt-[calc(var(--header-h)+2rem)] md:px-12 md:pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] lg:gap-14">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
          <p data-reveal="slide" className="text-[12px] font-semibold uppercase tracking-[0.3em]">
            Luxury fragrance house
          </p>
          {/* Tagline: types itself in on load. Every character is rendered from the start (untyped ones
              invisible), so the line never reflows while typing; the caret is zero-width. */}
          <h1
            id="hero-h"
            aria-label={TAGLINE}
            style={{ textShadow: "0 2px 18px rgba(27,24,21,.38), 0 1px 2px rgba(27,24,21,.25)" }}
            className="hero-tagline mt-5 text-[clamp(2.5rem,3.9vw,3.6rem)] font-bold leading-[1.12] text-white"
          >
            {TAGLINE.split("").map((char, i) => (
              <span key={i} aria-hidden="true">
                {i === typed && <span className="hero-caret" />}
                <span className={i < typed ? undefined : "invisible"}>{char}</span>
              </span>
            ))}
            {doneTyping && !caretGone && <span aria-hidden="true" className="hero-caret" />}
          </h1>
          <p data-reveal="slide" style={revealOrder(2)} className="mx-auto mt-6 max-w-[480px] text-lg leading-relaxed lg:mx-0">
            Long-lasting extrait de parfum, crafted in India with up to 31% perfume oil. Rich oud, bold aromatics and fresh
            citrus — blended in small batches to stay with you from morning to night.
          </p>
          {/* Buttons stacked on two lines, equal width. */}
          <div data-reveal="slide" style={revealOrder(3)} className="mt-8 flex flex-col items-center gap-3 lg:items-start">
            <Link to="/collection" className="btn btn-primary !h-[56px] w-full max-w-[320px] !text-[16px] !tracking-[0.12em]">
              Shop the collection
            </Link>
            <Link to="/pages/our-story" className="btn btn-secondary !h-[56px] w-full max-w-[320px] !text-[16px] !tracking-[0.12em]">
              Discover the house
            </Link>
          </div>

          {/* Brand numbers — count up from zero on load. Numbers share one top line, labels one line below. */}
          {/* Numbers sit between two ✦ lines, spaced apart horizontally; each label stays on one line. */}
          <div data-reveal="slide" style={revealOrder(4)} className="mx-auto mt-10 max-w-[520px] lg:mx-0">
            <Ornament wide tone="light" />
          <dl className="my-6 flex flex-nowrap items-start justify-between gap-x-4 sm:gap-x-8">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <dt className="order-2 mt-2.5 whitespace-nowrap text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] xl:text-[11px] xl:tracking-[0.12em]">{s.label}</dt>
                <dd className="hero-tagline order-1 text-[clamp(1.5rem,2.4vw,2.4rem)] font-bold leading-none tabular-nums">
                  {/* White number with a soft shadow for legibility on the light hero. */}
                  <span aria-hidden="true" className="inline-block text-white" style={{ textShadow: "0 2px 14px rgba(27,24,21,.35), 0 1px 2px rgba(27,24,21,.25)" }}>
                    {s.value.toLocaleString("en-IN")}
                    {s.suffix}
                  </span>
                  <span className="sr-only">
                    {s.target.toLocaleString("en-IN")}
                    {s.suffix}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
            <Ornament wide tone="light" />
          </div>
        </div>

        {/* Video frame — plays the bottle film; shows illustrated bottles until it loads (or if it's missing). */}
        <div
          data-reveal="fade"
          className="relative mx-auto h-[340px] w-full max-w-[900px] lg:mr-0 lg:h-[520px] overflow-hidden rounded-[24px] border border-white/40 bg-[color-mix(in_oklab,var(--surface)_28%,transparent)] shadow-[0_24px_60px_rgba(27,24,21,.18)] md:h-[440px]"
        >
          {videoState !== "ready" && (
            <div className="absolute inset-0" aria-hidden="true">
              {PETALS.map((p, i) => (
                <span
                  key={i}
                  className="petal"
                  style={{ left: p.x, top: p.y, width: p.s, height: p.s * 0.62, animationDelay: `${p.d}s`, "--r": `${p.r}deg` } as CSSProperties}
                />
              ))}
              <div className="absolute left-[13%] top-[9%] w-[36%] -rotate-[9deg]">
                <Bottle tint={front.tint} name={front.name} decorative className="float-a w-full" />
              </div>
              <div className="absolute right-[13%] top-[20%] w-[32%] rotate-[11deg]">
                <Bottle tint={back.tint} name={back.name} decorative className="float-b w-full" />
              </div>
            </div>
          )}

          {videoState !== "error" && (
            <video
              ref={videoRef}
              src={HERO_VIDEO_SRC}
              muted
              loop
              playsInline
              preload="auto"
              aria-label="Azelle perfume bottles"
              onLoadedData={() => setVideoState("ready")}
              onError={() => setVideoState("error")}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoState === "ready" ? "opacity-100" : "opacity-0"}`}
            />
          )}

          {videoState === "ready" && (
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playing ? "Pause video" : "Play video"}
              className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-surface text-ink shadow-md hover:scale-105"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
                {playing ? <path d="M7 5h3v14H7zM14 5h3v14h-3z" /> : <path d="M8 5.5v13l11-6.5z" />}
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
