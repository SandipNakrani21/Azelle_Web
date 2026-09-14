import { useId } from "react";

type WaveProps = {
  /** Fill colour — the colour of the section the wave leads into. */
  color: string;
  /** Flip vertically for the bottom edge of a band. */
  flip?: boolean;
  className?: string;
};

// Two layered wave paths drifting at 12s and 5s.
export function Wave({ color, flip, className = "" }: WaveProps) {
  const id = `wave-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      className={`wave ${flip ? "wave--flip" : ""} ${className}`}
      viewBox="0 24 150 28"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id={id} d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z" />
      </defs>
      <g className="wave__parallax">
        <use href={`#${id}`} x="48" y="3" style={{ fill: color, opacity: 0.5 }} />
        <use href={`#${id}`} x="48" y="6" style={{ fill: color }} />
      </g>
    </svg>
  );
}
