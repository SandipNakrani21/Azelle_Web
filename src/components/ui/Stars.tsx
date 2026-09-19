import { useId } from "react";

const STAR = "M12 2.8l2.83 5.73 6.33.92-4.58 4.46 1.08 6.3L12 17.24l-5.66 2.97 1.08-6.3L2.84 9.45l6.33-.92z";

// Brand gradient (same colours as --menu-gradient: gold → terracotta → rose → sage), drawn
// diagonally across each star for both the fill and the outline.
function GradientStops() {
  return (
    <>
      <stop offset="0" stopColor="#d9a441" />
      <stop offset="0.4" style={{ stopColor: "var(--accent)" }} />
      <stop offset="0.72" stopColor="#b46a7a" />
      <stop offset="1" stopColor="#6f9c86" />
    </>
  );
}

function Star({ id, fill, size }: { id: string; fill: number; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} overflow="visible">
      <defs>
        <linearGradient id={`${id}-g`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <GradientStops />
        </linearGradient>
        {/* Partial fill (e.g. half a star for 4.5) */}
        <clipPath id={`${id}-c`}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      {fill > 0 && <path d={STAR} fill={`url(#${id}-g)`} clipPath={`url(#${id}-c)`} />}
      <path d={STAR} fill="none" stroke={`url(#${id}-g)`} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** Five stars filled to `value` (0–5, fractions allowed). Decorative — pair it with visible text. */
export function Stars({ value, size = 16, className = "" }: { value: number; size?: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <span className={`inline-flex items-center gap-[2px] ${className}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} id={`${uid}-${i}`} fill={Math.max(0, Math.min(1, value - i))} size={size} />
      ))}
    </span>
  );
}

/** Clickable star picker for the review form (radio group, keyboard friendly). */
export function StarInput({ value, onChange, name = "rating" }: { value: number; onChange: (v: number) => void; name?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const labels = ["Poor", "Fair", "Good", "Very good", "Excellent"];
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="cursor-pointer rounded p-0.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-1" title={labels[n - 1]}>
          <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" aria-label={`${n} star${n > 1 ? "s" : ""} — ${labels[n - 1]}`} />
          <Star id={`${uid}-in-${n}`} fill={n <= value ? 1 : 0} size={30} />
        </label>
      ))}
      {value > 0 && <span className="ml-2 text-sm">{labels[value - 1]}</span>}
    </div>
  );
}
