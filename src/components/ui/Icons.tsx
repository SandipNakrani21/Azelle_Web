import type { CSSProperties, SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const line = (p: P): P => ({
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
  ...p,
});

const spot: CSSProperties = { fill: "var(--accent)", opacity: 0.22 };

// ── UI ────────────────────────────────────────────────────────

export const SearchIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...line(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);

export const BagIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...line(p)}>
    <path d="M5 8h14l-1 12H6L5 8z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

export const UserIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...line(p)}>
    <circle cx="12" cy="8.5" r="4" />
    <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </svg>
);

export const MenuIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...line(p)}>
    <path d="M3 7h18M3 12h18M3 17h18" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...line(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronDownIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...line(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronLeftIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="28" height="28" {...line(p)}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const ChevronRightIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="28" height="28" {...line(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...line(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...line(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const CheckCircleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="26" height="26" {...line(p)}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="m8 12.5 2.8 2.8L16.5 9.5" />
  </svg>
);

export const MailIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...line(p)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);

// ── Product feature icons (24px) ──────────────────────────────

export const DropletIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" />
    <path d="M9 14.5a3 3 0 0 0 3 3" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const FlagIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <path d="M5 21V4" />
    <path d="M5 4.5h13v10H5" />
    <path d="M5 7.8h13M5 11.2h13" />
    <circle cx="11.5" cy="9.5" r="1.2" />
  </svg>
);

export const RabbitIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <path d="M9.5 10C8.3 7 8 3.5 9.3 3.2S11.6 6.5 11.4 9.6" />
    <path d="M14.5 10c1.2-3 1.5-6.5.2-6.8S12.4 6.5 12.6 9.6" />
    <circle cx="12" cy="15" r="5.5" />
    <circle cx="10.2" cy="14.3" r=".7" fill="currentColor" />
    <circle cx="13.8" cy="14.3" r=".7" fill="currentColor" />
    <path d="M11.2 17h1.6" />
  </svg>
);

export const AwardIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <circle cx="12" cy="9" r="5.5" />
    <path d="m10 8.8 1.5 1.5L14.3 7.6" />
    <path d="M8.6 13.4 7 21l5-2.6 5 2.6-1.6-7.6" />
  </svg>
);

export const TruckIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <path d="M3 6.5h11v9.5H3z" />
    <path d="M14 9.5h4l3 3.5V16h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
);

export const GiftSmallIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <rect x="3.5" y="9" width="17" height="4" rx="1" />
    <path d="M5 13v7.5h14V13M12 9v11.5" />
    <path d="M12 9c-1.5-3-5-4-5-1.5S10 9 12 9zm0 0c1.5-3 5-4 5-1.5S14 9 12 9z" />
  </svg>
);

export const BottleSmallIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <rect x="9" y="3" width="6" height="3.5" rx="1" />
    <path d="M10.5 6.5v2M13.5 6.5v2" />
    <rect x="5.5" y="8.5" width="13" height="12.5" rx="3" />
    <rect x="8.5" y="12" width="7" height="5" rx="0.8" />
  </svg>
);

export const CameraIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="0.8" fill="currentColor" />
  </svg>
);

export const PinIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
);

export const FacebookIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <path d="M15.5 8h-1.6a2.4 2.4 0 0 0-2.4 2.4v10.1M9 13h5.5" />
  </svg>
);

export const WhatsAppIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <path d="M4 20l1.3-3.8A8.5 8.5 0 1 1 8 18.9z" />
    <path d="M9.2 8.6c-.2 3.3 2.9 6.4 6.2 6.2l.9-1.4-1.9-1-.9.8a4.6 4.6 0 0 1-2.3-2.3l.8-.9-1-1.9z" />
  </svg>
);

export const NoteIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...line(p)}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </svg>
);

// ── Fragrance pyramid tiers ───────────────────────────────────

export const TopNotesIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...line(p)}>
    <circle cx="12" cy="12" r="2.5" />
    <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M5.6 18.4l2.5-2.5M15.9 8.1l2.5-2.5" />
  </svg>
);

export const HeartNotesIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...line(p)}>
    <Blossom x={12} y={12} r={3.4} />
  </svg>
);

export const BaseNotesIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...line(p)}>
    <ellipse cx="12" cy="7" rx="7.5" ry="3" />
    <ellipse cx="12" cy="7" rx="3.5" ry="1.3" />
    <path d="M4.5 7v9c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V7" />
  </svg>
);

// ── Illustrations (64×64) ─────────────────────────────────────

export function Blossom({ x, y, r = 3 }: { x: number; y: number; r?: number }) {
  const d = r * 1.1;
  return (
    <g>
      <circle cx={x} cy={y - d} r={r} />
      <circle cx={x + d} cy={y} r={r} />
      <circle cx={x} cy={y + d} r={r} />
      <circle cx={x - d} cy={y} r={r} />
      <circle cx={x} cy={y} r={r * 0.35} fill="currentColor" />
    </g>
  );
}

export const OsmanthusIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="40" cy="26" r="16" style={spot} stroke="none" />
    <path d="M12 58C20 46 28 36 40 28" />
    <path d="M24 44c-7 0-11-4-12-10 7 0 11 4 12 10z" />
    <path d="M31 36c1-7 5-11 11-12 0 7-4 11-11 12z" />
    <Blossom x={43} y={19} />
    <Blossom x={52} y={31} />
    <Blossom x={34} y={11} r={2.5} />
  </svg>
);

export const RoseIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="30" cy="26" r="16" style={spot} stroke="none" />
    <path d="M32 16c-8 0-13 5-13 12s6 12 13 12 13-5 13-12" />
    <path d="M45 28c0-6-4-10-9-10s-8 3-8 7 3 7 6 7 5-2 5-5" />
    <path d="M32 40v20" />
    <path d="M32 50c-6-1-10-5-11-10 6 0 10 4 11 10z" />
  </svg>
);

export const CedarIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="36" cy="30" r="17" style={spot} stroke="none" />
    <path d="M32 6 21 22h7L17 36h9L13 50h38L38 36h9L36 22h7z" />
    <path d="M32 50v10" />
  </svg>
);

export const SandalwoodIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="30" cy="36" r="17" style={spot} stroke="none" />
    <rect x="8" y="38" width="40" height="12" rx="6" />
    <ellipse cx="48" cy="44" rx="4" ry="6" />
    <rect x="14" y="24" width="36" height="12" rx="6" />
    <ellipse cx="50" cy="30" rx="4" ry="6" />
    <path d="M24 18c-3-3 0-6-2-9M32 18c-3-3 0-6-2-9" />
  </svg>
);

export const NeroliIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="40" cy="40" r="17" style={spot} stroke="none" />
    <circle cx="40" cy="40" r="12" />
    <path d="M40 30v20M30 40h20M33 33l14 14M47 33 33 47" />
    <Blossom x={18} y={18} r={4} />
    <path d="M24 24l6 6" />
  </svg>
);

export const FigIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="32" cy="38" r="17" style={spot} stroke="none" />
    <path d="M32 16c-11 5-17 15-17 25 0 9 7 15 17 15s17-6 17-15c0-10-6-20-17-25z" />
    <path d="M32 16v-6" />
    <path d="M32 12c4-6 11-7 16-5-3 6-10 8-16 5z" />
    <path d="M26 42c2 4 10 4 12 0" />
  </svg>
);

export const FloralIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <Blossom x={32} y={24} r={7} />
    <path d="M32 40v18" />
    <path d="M32 50c-7-1-11-5-12-11 7 0 11 4 12 11z" />
  </svg>
);

export const WoodsIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <path d="M32 6 21 22h7L17 36h9L13 50h38L38 36h9L36 22h7z" />
    <path d="M32 50v10" />
  </svg>
);

export const FreshIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="32" cy="32" r="20" />
    <circle cx="32" cy="32" r="15" />
    <path d="M32 17v30M17 32h30M21.4 21.4l21.2 21.2M42.6 21.4 21.4 42.6" />
  </svg>
);

export const BottleIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <rect x="24" y="6" width="16" height="10" rx="2" />
    <path d="M28 16v5M36 16v5" />
    <rect x="14" y="21" width="36" height="37" rx="8" />
    <rect x="22" y="32" width="20" height="14" rx="1.5" />
  </svg>
);

export const FlaskIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="34" cy="42" r="16" style={spot} stroke="none" />
    <path d="M26 8h12M28 8v14L14 50a5 5 0 0 0 4.5 7h27a5 5 0 0 0 4.5-7L36 22V8" />
    <path d="M20 40h24" />
  </svg>
);

export const LeafIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="36" cy="28" r="16" style={spot} stroke="none" />
    <path d="M14 50C14 26 30 12 52 12c0 24-14 40-38 38z" />
    <path d="M14 50 36 28" />
  </svg>
);

export const HeartIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="32" cy="30" r="16" style={spot} stroke="none" />
    <path d="M32 52S12 40 12 25a10 10 0 0 1 20-4 10 10 0 0 1 20 4c0 15-20 27-20 27z" />
    <path d="M32 44V30c0-4 3-7 8-7-1 5-4 8-8 8" />
  </svg>
);

export const HourglassIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="32" cy="40" r="16" style={spot} stroke="none" />
    <path d="M18 8h28M18 56h28" />
    <path d="M22 8c0 12 10 16 10 24s-10 12-10 24M42 8c0 12-10 16-10 24s10 12 10 24" />
  </svg>
);

export const RefillIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="32" cy="32" r="16" style={spot} stroke="none" />
    <path d="M46 18a18 18 0 0 0-30 6M18 46a18 18 0 0 0 30-6" />
    <path d="M14 12v12h12M50 52V40H38" />
  </svg>
);

export const GiftIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="32" cy="42" r="16" style={spot} stroke="none" />
    <rect x="10" y="24" width="44" height="10" rx="1.5" />
    <rect x="14" y="34" width="36" height="22" rx="1.5" />
    <path d="M32 24v32" />
    <path d="M32 24c-4-8-14-10-14-4s10 4 14 4zM32 24c4-8 14-10 14-4s-10 4-14 4z" />
  </svg>
);

// ── Popular notes (64×64, with accent spot) ─────────────────────

export const JasmineIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="32" cy="30" r="17" style={spot} stroke="none" />
    {[0, 72, 144, 216, 288].map((a) => (
      <path key={a} d="M32 30c-3.5-5-3.5-11 0-15 3.5 4 3.5 10 0 15z" transform={`rotate(${a} 32 30)`} />
    ))}
    <circle cx="32" cy="30" r="2" />
    <path d="M32 45v15M32 53c5-1 8-4 9-8-5 0-8 3-9 8z" />
  </svg>
);

export const OudIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="32" cy="40" r="16" style={spot} stroke="none" />
    <path d="M10 46l10-13 14 2 14-6 6 10-10 13-18 2z" />
    <path d="M22 34l5 19M37 35l-2 18M48 30l-4 14" />
    <path d="M26 24c-3-4 1-7-1-12M34 24c-3-4 1-7-1-12M42 22c-3-4 1-7-1-10" />
  </svg>
);

export const BergamotIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="34" cy="40" r="16" style={spot} stroke="none" />
    <circle cx="31" cy="39" r="15" />
    <path d="M31 24c0-5 2-9 6-11" />
    <path d="M36 16c5-4 12-4 16-1-5 5-11 5-16 1z" />
    <circle cx="26" cy="35" r="1" fill="currentColor" />
    <circle cx="35" cy="43" r="1" fill="currentColor" />
    <circle cx="28" cy="46" r="1" fill="currentColor" />
  </svg>
);

export const VetiverIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <circle cx="32" cy="24" r="16" style={spot} stroke="none" />
    <path d="M32 40C30 28 24 18 16 10M32 40c0-12 2-22 6-32M32 40c3-9 9-16 18-20M32 40c-4-7-10-11-18-12" />
    <path d="M14 40h36" />
    <path d="M32 40c-1 6-4 12-8 18M32 40c1 6 3 12 7 17M32 40v18M27 44c-3 3-7 5-10 5M37 44c3 3 7 4 10 4" />
  </svg>
);

// ── Fragrance families (64×64) ─────────────────────────────────

export const AmberIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <path d="M32 8C24 20 16 30 16 40a16 16 0 0 0 32 0C48 30 40 20 32 8z" />
    <path d="M24 42a8 8 0 0 0 8 8" />
  </svg>
);

export const MossyIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <path d="M32 58V12" />
    <path d="M32 20c-6-2-10-6-12-10M32 20c6-2 10-6 12-10M32 30c-8-2-13-6-16-11M32 30c8-2 13-6 16-11M32 40c-9-2-15-7-18-12M32 40c9-2 15-7 18-12M32 50c-8-1-13-5-16-9M32 50c8-1 13-5 16-9" />
  </svg>
);

export const AromaticIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <path d="M32 60V22" />
    <ellipse cx="32" cy="11" rx="3" ry="5" />
    <ellipse cx="26" cy="20" rx="3" ry="4.5" transform="rotate(-25 26 20)" />
    <ellipse cx="38" cy="20" rx="3" ry="4.5" transform="rotate(25 38 20)" />
    <ellipse cx="26" cy="30" rx="3" ry="4.5" transform="rotate(-25 26 30)" />
    <ellipse cx="38" cy="30" rx="3" ry="4.5" transform="rotate(25 38 30)" />
    <path d="M32 47c-8-1-13-5-15-11 7 0 12 4 15 11zM32 47c8-1 13-5 15-11-7 0-12 4-15 11z" />
  </svg>
);

export const SweetIcon = (p: P) => (
  <svg viewBox="0 0 64 64" {...line(p)}>
    <path d="M16 56C28 42 40 28 50 12" />
    <path d="M22 58C34 44 46 30 55 16" />
    <path d="M50 12c2-2 4-2 5 4" />
    <Blossom x={19} y={21} r={5} />
  </svg>
);

export const QuoteBlob = ({ color, ...p }: P & { color: string }) => (
  <svg viewBox="0 0 76 72" aria-hidden="true" focusable="false" {...p}>
    <path d="M50 6c15 4 24 18 20 34S50 68 33 66 4 50 6 33 34 2 50 6z" style={{ fill: color }} />
    <text x="38" y="56" textAnchor="middle" fontSize="44" fill="#fff" fontFamily="Georgia, serif">
      &ldquo;
    </text>
  </svg>
);
