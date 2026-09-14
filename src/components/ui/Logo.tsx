type LogoProps = {
  className?: string;
  /** Sets the logo height (width follows the artwork). */
  imgClassName?: string;
  /** Show the "Fragrances" line under the logo. */
  tagline?: boolean;
  taglineClassName?: string;
};

// The Azelle script logo (black on transparent) with the ™ mark and "Fragrances" centred underneath.
export function Logo({ className = "", imgClassName = "h-10", tagline = true, taglineClassName = "text-[9px] tracking-[0.5em]" }: LogoProps) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span className="relative inline-block">
        <img src="/azelle-logo.png" alt="Azelle" className={`logo-img block w-auto select-none ${imgClassName}`} draggable={false} />
        {/* ™ sits just above and beside the final "e" (its x-height starts about a third of the way down). */}
        <span aria-hidden="true" className="absolute -right-[1.05em] top-[30%] text-[0.7rem] font-semibold leading-none">
          ™
        </span>
      </span>
      {tagline && <span className={`logo-tagline mt-1 pl-[0.5em] uppercase ${taglineClassName}`}>Fragrances</span>}
    </span>
  );
}
