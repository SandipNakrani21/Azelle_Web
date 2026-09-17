import type { ComponentType, SVGProps } from "react";
import { Link } from "react-router-dom";
import { BergamotIcon, CedarIcon, JasmineIcon, OudIcon, RoseIcon, SandalwoodIcon, VetiverIcon } from "@/components/ui/Icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { revealOrder } from "@/lib/reveal";

// Seven of perfumery's most-loved notes; each opens the collection filtered to scents containing it.
const NOTES: { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { label: "Rose", Icon: RoseIcon },
  { label: "Jasmine", Icon: JasmineIcon },
  { label: "Oud", Icon: OudIcon },
  { label: "Sandalwood", Icon: SandalwoodIcon },
  { label: "Cedar", Icon: CedarIcon },
  { label: "Bergamot", Icon: BergamotIcon },
  { label: "Vetiver", Icon: VetiverIcon },
];

// One row: a swipeable strip on phones, seven columns from tablet up. Hover: icon grows to 110%.
export function ShopByNote() {
  return (
    <section id="notes" aria-labelledby="notes-h" className="pb-12 pt-16 md:pb-16 md:pt-20">
      <SectionHeading id="notes-h" sub="Follow your nose" title="Shop by note" ornamentTone="light" />
      <ul className="row-scroll mx-auto mt-10 flex max-w-[1100px] snap-x gap-4 overflow-x-auto px-6 pb-2 md:grid md:grid-cols-7 md:gap-4 md:overflow-visible md:px-10">
        {NOTES.map(({ label, Icon }, i) => (
          <li key={label} data-reveal="slide" style={revealOrder(i)} className="w-[92px] shrink-0 snap-start text-center md:w-auto">
            <Link to={`/collection?note=${encodeURIComponent(label)}`} className="note-card block">
              <span className="note-media mx-auto grid h-16 w-16 place-items-center">
                <Icon className="h-14 w-14" />
              </span>
              {/* Smaller below lg so long names (Sandalwood) fit the narrower phone / tablet columns. */}
              <span className="note-label mt-2 block text-[11px] font-medium uppercase tracking-[0.04em] lg:text-[13px] lg:tracking-[0.08em]">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
