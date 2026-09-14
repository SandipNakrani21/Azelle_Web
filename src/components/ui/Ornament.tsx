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
  const rule = tone === "light" ? "bg-white/85" : "bg-[color-mix(in_oklab,currentColor_35%,transparent)]";
  return (
    <div
      aria-hidden="true"
      className={`flex w-full items-center gap-3 ${wide ? "" : "max-w-[220px]"} ${align === "center" ? "mx-auto" : ""} ${tone === "light" ? "text-white" : ""} ${className}`}
    >
      <span className={`h-px flex-1 ${rule}`} />
      <span className="text-[12px] leading-none">✦</span>
      <span className={`h-px flex-1 ${rule}`} />
    </div>
  );
}
