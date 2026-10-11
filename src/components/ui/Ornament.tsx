import { useLayoutEffect, useRef, useState } from "react";

type OrnamentProps = {
  align?: "center" | "left";
  /** Stretch to the container instead of a short heading-sized rule. */
  wide?: boolean;
  /** "light" = white, for gradient / coloured backgrounds; "current" follows the text colour. */
  tone?: "current" | "light";
  className?: string;
};

// Line — ✦ — line separator.
export function Ornament({ align = "center", wide = false, tone = "current", className = "" }: OrnamentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [headingWidth, setHeadingWidth] = useState<number>();
  useLayoutEffect(() => {
    const ornament = ref.current;
    if (!ornament) return;
    const selector = ".section-sub, .section-heading-label, .hero-tagline, h1, h2, h3";
    let node: Element | null = ornament;
    let heading: Element | null = null;
    // A separator can follow the heading directly or live in its own wrapper.
    for (let level = 0; node && level < 3 && !heading; level++, node = node.parentElement) {
      const previous = node.previousElementSibling;
      if (previous) heading = previous.matches(selector) ? previous : previous.querySelector(selector);
    }
    if (!heading) return;
    const target = heading;
    const measure = () => {
      const range = document.createRange();
      range.selectNodeContents(target);
      setHeadingWidth(Math.ceil(range.getBoundingClientRect().width));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  const rule = tone === "light" ? "bg-white/85" : "bg-[color-mix(in_oklab,currentColor_35%,transparent)]";
  return (
    <div
      aria-hidden="true"
      ref={ref}
      style={headingWidth ? { width: headingWidth, maxWidth: "100%" } : undefined}
      className={`ornament flex w-full items-center gap-3 ${wide ? "" : "max-w-[220px]"} ${align === "center" ? "mx-auto" : ""} ${tone === "light" ? "text-white" : ""} ${className}`}
    >
      <span className={`h-px flex-1 ${rule}`} />
      <span className="text-[12px] leading-none">✦</span>
      <span className={`h-px flex-1 ${rule}`} />
    </div>
  );
}
