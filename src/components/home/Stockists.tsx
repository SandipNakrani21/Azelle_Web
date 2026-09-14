import { SectionHeading } from "@/components/ui/SectionHeading";
import { STOCKISTS } from "@/lib/content";

// Same accent band as the scrolling strip under the hero; two copies translate -50% over 30s.
export function Stockists() {
  return (
    <section id="stockists" aria-labelledby="stockists-h" className="bg-accent py-8 text-accent-ink md:py-10">
      <SectionHeading id="stockists-h" sub="Find us in person" title="Our stockists" ornamentTone="light" className="[&_.section-sub]:text-[24px]" />
      <div className="mt-6 overflow-hidden">
        <p className="sr-only">{STOCKISTS.join(", ")}</p>
        <ul className="slide-track" aria-hidden="true">
          {[...STOCKISTS, ...STOCKISTS].map((name, i) => (
            <li key={i} className="flex items-center gap-10 whitespace-nowrap px-5 font-display text-[clamp(24px,2.2vw,30px)] uppercase tracking-[0.04em]">
              {name}
              <span className="text-base">✦</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
