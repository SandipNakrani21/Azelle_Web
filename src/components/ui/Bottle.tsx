import { useId } from "react";

type BottleProps = {
  tint: string;
  name: string;
  className?: string;
  decorative?: boolean;
};

// Illustrated bottle used wherever the reference site shows a product cut-out.
export function Bottle({ tint, name, className, decorative }: BottleProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glass = `glass-${uid}`;
  const cap = `cap-${uid}`;
  const a11y = decorative
    ? { "aria-hidden": true as const }
    : { role: "img", "aria-label": `${name}, perfume extract` };

  return (
    <svg viewBox="0 0 200 320" className={className} focusable="false" {...a11y}>
      <defs>
        <linearGradient id={glass} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={tint} stopOpacity="0.95" />
          <stop offset="0.38" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.62" stopColor={tint} stopOpacity="0.8" />
          <stop offset="1" stopColor={tint} />
        </linearGradient>
        <linearGradient id={cap} x1="0" x2="1">
          <stop offset="0" stopColor="#1f1a17" />
          <stop offset="0.45" stopColor="#5b4a3b" />
          <stop offset="1" stopColor="#15110f" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="310" rx="74" ry="7" fill="#000" opacity="0.1" />
      <rect x="64" y="6" width="72" height="64" rx="10" fill={`url(#${cap})`} />
      <rect x="82" y="68" width="36" height="22" fill="#c9b08a" />
      <rect x="26" y="88" width="148" height="216" rx="30" fill={`url(#${glass})`} />
      <rect x="26" y="88" width="148" height="216" rx="30" fill="none" stroke="#000" strokeOpacity="0.08" />
      <rect x="42" y="104" width="12" height="176" rx="6" fill="#fff" opacity="0.35" />
      <rect x="52" y="148" width="96" height="104" rx="3" fill="#fffdf8" opacity="0.95" />
      <text
        x="100"
        y="182"
        textAnchor="middle"
        fontSize="16"
        letterSpacing="4"
        fill="#1b1815"
        style={{ fontFamily: "var(--font-display)" }}
      >
        AZELLE
      </text>
      <line x1="82" x2="118" y1="194" y2="194" stroke="#1b1815" strokeWidth="0.6" opacity="0.45" />
      <text x="100" y="215" textAnchor="middle" fontSize="10" fill="#1b1815" style={{ fontFamily: "var(--font-display)" }}>
        {name}
      </text>
      <text
        x="100"
        y="236"
        textAnchor="middle"
        fontSize="6"
        letterSpacing="1.4"
        fill="#6f6557"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        PERFUME EXTRACT
      </text>
    </svg>
  );
}

export function MiniBottle({ tint, className }: { tint: string; className?: string }) {
  return (
    <svg viewBox="0 0 46 80" className={className} aria-hidden="true" focusable="false">
      <rect x="14" y="1" width="18" height="15" rx="3" style={{ fill: "var(--ink)" }} />
      <rect x="18" y="15" width="10" height="6" fill="#c9b08a" />
      <rect x="3" y="20" width="40" height="58" rx="10" fill={tint} />
      <rect x="8" y="26" width="4" height="44" rx="2" fill="#fff" opacity="0.4" />
      <rect x="12" y="38" width="22" height="20" rx="1.5" fill="#fffdf8" opacity="0.92" />
    </svg>
  );
}
