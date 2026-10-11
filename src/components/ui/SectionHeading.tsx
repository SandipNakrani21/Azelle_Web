import { Ornament } from "./Ornament";

type SectionHeadingProps = {
  id?: string;
  sub?: string;
  title: string;
  align?: "center" | "left";
  /** Use "light" (white separator) when the section sits on a gradient or coloured band. */
  ornamentTone?: "current" | "light";
  className?: string;
};

// The name sets the divider width; the display title shares the same typography everywhere.
export function SectionHeading({ id, sub, title, align = "center", ornamentTone = "current", className = "" }: SectionHeadingProps) {
  return (
    <div data-reveal="blur" className={`${align === "center" ? "px-6 text-center" : "text-left"} ${className}`}>
      {sub && (
        <div className={`section-heading-name ${align === "center" ? "mx-auto" : ""}`}>
          <p className="section-sub">{sub}</p>
          <Ornament wide tone={ornamentTone} className="mb-4 mt-2" />
        </div>
      )}
      <h2 id={id} className="section-title">
        {title}
      </h2>
    </div>
  );
}
