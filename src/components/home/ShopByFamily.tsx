import type { ComponentType, SVGProps } from "react";
import { Link } from "react-router-dom";
import { AmberIcon, AromaticIcon, FloralIcon, FreshIcon, MossyIcon, SweetIcon, WoodsIcon } from "@/components/ui/Icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { FragranceFamily } from "@/lib/products";
import { revealOrder } from "@/lib/reveal";

// The seven main fragrance families (fragrance-wheel groupings, in plain English).
const FAMILY_CARDS: { label: FragranceFamily; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { label: "Floral", Icon: FloralIcon },
  { label: "Woody", Icon: WoodsIcon },
  { label: "Amber", Icon: AmberIcon },
  { label: "Fresh", Icon: FreshIcon },
  { label: "Mossy", Icon: MossyIcon },
  { label: "Aromatic", Icon: AromaticIcon },
  { label: "Sweet", Icon: SweetIcon },
];

// Same size and hover as "Shop by note": icon grows to 110%, label underlines.
export function ShopByFamily() {
  return (
    <section aria-labelledby="family-h" className="pb-16 md:pb-20">
      <SectionHeading id="family-h" sub="Find your mood" title="Shop by family" />
      <ul className="row-scroll mx-auto mt-10 flex max-w-[1100px] snap-x gap-4 overflow-x-auto px-6 pb-2 md:grid md:grid-cols-7 md:gap-4 md:overflow-visible md:px-10">
        {FAMILY_CARDS.map(({ label, Icon }, i) => (
          <li key={label} data-reveal="zoom" style={revealOrder(i)} className="w-[92px] shrink-0 snap-start text-center md:w-auto">
            <Link to={`/collection?group=${label}`} className="note-card block">
              <span className="note-media relative mx-auto grid h-16 w-16 place-items-center">
                <Icon className="relative h-14 w-14" />
              </span>
              {/* Smaller below lg so the labels fit the narrower phone / tablet columns. */}
              <span className="note-label mt-2 block text-[11px] font-medium uppercase tracking-[0.04em] lg:text-[13px] lg:tracking-[0.08em]">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
