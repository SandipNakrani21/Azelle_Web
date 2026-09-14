import type { ComponentType, SVGProps } from "react";
import { Link } from "react-router-dom";
import { AmberIcon, AromaticIcon, FloralIcon, FreshIcon, MossyIcon, SweetIcon, WoodsIcon } from "@/components/ui/Icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { FragranceFamily } from "@/lib/products";
import { revealOrder } from "@/lib/reveal";

// The seven main fragrance families (fragrance-wheel groupings, in plain English).
const FAMILY_CARDS: { label: FragranceFamily; Icon: ComponentType<SVGProps<SVGSVGElement>>; tint: string }[] = [
  { label: "Floral", Icon: FloralIcon, tint: "#e3a6a8" },
  { label: "Woody", Icon: WoodsIcon, tint: "#c9a27e" },
  { label: "Amber", Icon: AmberIcon, tint: "#d9a45b" },
  { label: "Fresh", Icon: FreshIcon, tint: "#a9c9a4" },
  { label: "Mossy", Icon: MossyIcon, tint: "#8fb08a" },
  { label: "Aromatic", Icon: AromaticIcon, tint: "#b7a8d6" },
  { label: "Sweet", Icon: SweetIcon, tint: "#e8cf6f" },
];

// Same size and hover as "Shop by note": icon grows to 110%, label underlines.
// Each family keeps its colour as a small soft spot behind the icon.
export function ShopByFamily() {
  return (
    <section aria-labelledby="family-h" className="pb-16 md:pb-20">
      <SectionHeading id="family-h" sub="Find your mood" title="Shop by family" ornamentTone="light" />
      <ul className="row-scroll mx-auto mt-10 flex max-w-[1100px] snap-x gap-4 overflow-x-auto px-6 pb-2 md:grid md:grid-cols-7 md:gap-4 md:overflow-visible md:px-10">
        {FAMILY_CARDS.map(({ label, Icon, tint }, i) => (
          <li key={label} data-reveal="slide" style={revealOrder(i)} className="w-[92px] shrink-0 snap-start text-center md:w-auto">
            <Link to={`/collection?group=${label}`} className="note-card block">
              <span className="note-media relative mx-auto grid h-16 w-16 place-items-center">
                <span
                  className="absolute left-1/2 top-1/2 h-11 w-11 rounded-full"
                  style={{ background: tint, opacity: 0.45, translate: "-35% -60%" }}
                  aria-hidden="true"
                />
                <Icon className="relative h-14 w-14" />
              </span>
              <span className="note-label mt-2 block text-[13px] font-medium uppercase tracking-[0.08em]">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
