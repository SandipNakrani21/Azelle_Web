import { useId, useState } from "react";
import { BaseNotesIcon, HeartNotesIcon, TopNotesIcon } from "@/components/ui/Icons";
import type { Product } from "@/lib/products";

// Light tones picked from the site gradient (gold, rose, terracotta). Each tier has a deeper shade
// for chips, icons and labels so text stays readable: dark text on the light rows, white on the chips.
const TIERS = [
  {
    key: "top",
    index: "01",
    label: "Top notes",
    stage: "The opening",
    timing: "First 15 minutes",
    blurb: "Bright and fleeting — the first impression on skin.",
    Icon: TopNotesIcon,
    from: "#f6dfb0",
    to: "#eec79c",
    deep: "#8f6224",
  },
  {
    key: "heart",
    index: "02",
    label: "Heart notes",
    stage: "The heart",
    timing: "30 minutes to 3 hours",
    blurb: "The true character of the scent as it settles.",
    Icon: HeartNotesIcon,
    from: "#f3cfd0",
    to: "#e7b3bd",
    deep: "#924759",
  },
  {
    key: "base",
    index: "03",
    label: "Base notes",
    stage: "The dry-down",
    timing: "3 hours and beyond",
    blurb: "Deep, lasting notes that stay close to skin.",
    Icon: BaseNotesIcon,
    from: "#efcdbd",
    to: "#dfab93",
    deep: "#8a4632",
  },
] as const;

const SHAPES = ["150,12 196,96 104,96", "104,96 196,96 242,182 58,182", "58,182 242,182 290,270 10,270"];
const LABEL_Y = [74, 146, 236];
const INK = "#1b1815";

// Fragrance pyramid. Hovering (or tapping) a tier row or a pyramid layer pops up both together.
export function NotesPyramid({ product }: { product: Product }) {
  const [active, setActive] = useState<number | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  // Paint the active layer last so its enlarged shape sits above its neighbours.
  const layerOrder = TIERS.map((_, i) => i).sort((a, b) => Number(a === active) - Number(b === active));

  return (
    <div className="grid items-center gap-10 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-14" onMouseLeave={() => setActive(null)}>
      <svg data-reveal="fade" viewBox="0 0 300 282" className="mx-auto w-full max-w-[300px] overflow-visible" aria-hidden="true">
        <defs>
          {TIERS.map((t, i) => (
            <linearGradient key={t.key} id={`${uid}-tier${i}`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor={t.from} />
              <stop offset="1" stopColor={t.to} />
            </linearGradient>
          ))}
        </defs>
        {layerOrder.map((i) => {
          const t = TIERS[i];
          const isActive = active === i;
          return (
          <g
            key={t.key}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
            className="cursor-pointer"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              transform: isActive ? "translateY(-6px) scale(1.1)" : "none",
              filter: isActive ? "drop-shadow(0 14px 18px rgba(27,24,21,.28))" : "none",
              transition: "transform 0.5s cubic-bezier(.2,.8,.2,1), filter 0.5s",
            }}
          >
            <polygon points={SHAPES[i]} fill={`url(#${uid}-tier${i})`} style={{ stroke: "var(--bg)" }} strokeWidth="5" strokeLinejoin="round" />
            <text
              x="150"
              y={LABEL_Y[i]}
              textAnchor="middle"
              fontSize="11"
              letterSpacing="2.5"
              fill={t.deep}
              style={{ fontFamily: "var(--font-sans)", fontWeight: 700 }}
            >
              {t.key.toUpperCase()}
            </text>
          </g>
          );
        })}
      </svg>

      <ol className="space-y-3.5">
        {TIERS.map((t, i) => {
          const notes = product.pyramid[t.key]
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          const isActive = active === i;
          return (
            <li
              key={t.key}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`relative cursor-pointer overflow-hidden rounded-[20px] p-5 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] md:p-6 ${isActive ? "z-10 -translate-y-1.5 scale-[1.03] shadow-[0_26px_50px_rgba(27,24,21,.22)]" : "shadow-[0_10px_24px_rgba(27,24,21,.08)]"}`}
              style={{ background: `linear-gradient(120deg, ${t.from}, ${t.to})`, color: INK }}
            >
              <div className="relative flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/70 shadow-sm" style={{ color: t.deep }} aria-hidden="true">
                  <t.Icon />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <h3 className="font-display text-2xl leading-tight">{t.label}</h3>
                    <p className="rounded-full bg-white/65 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: t.deep }}>
                      {t.stage} · {t.timing}
                    </p>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed">{t.blurb}</p>
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${t.label}: ${notes.join(", ")}`}>
                    {notes.map((note) => (
                      <li key={note} className="rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-sm" style={{ background: t.deep }}>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
