import { Ornament } from "./Ornament";

type SectionHeadingProps = {
  id?: string;
  sub?: string;
  title: string;
  /** Use "light" (white separator) when the section sits on a gradient or coloured band. */
  ornamentTone?: "current" | "light";
  className?: string;
};

// Display-font line, ✦ separator, then the uppercase title.
export function SectionHeading({ id, sub, title, ornamentTone = "current", className = "" }: SectionHeadingProps) {
  return (
    <div data-reveal="slide" className={`px-6 text-center ${className}`}>
      {sub && (
        <>
          <p className="section-sub">{sub}</p>
          <Ornament tone={ornamentTone} className="my-3" />
        </>
      )}
      <h2 id={id} className="section-title">
        {title}
      </h2>
    </div>
  );
}
