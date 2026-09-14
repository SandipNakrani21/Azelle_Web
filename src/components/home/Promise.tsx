import type { ComponentType, SVGProps } from "react";
import { FlaskIcon, GiftIcon, HeartIcon, HourglassIcon, LeafIcon, RefillIcon } from "@/components/ui/Icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PROMISES, type PromiseKey } from "@/lib/content";
import { revealOrder } from "@/lib/reveal";

const ICONS: Record<PromiseKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  batch: FlaskIcon,
  natural: LeafIcon,
  cruelty: HeartIcon,
  lasting: HourglassIcon,
  refill: RefillIcon,
  samples: GiftIcon,
};

export function PromiseSection() {
  return (
    <section aria-labelledby="promise-h" className="py-16 md:py-24">
      <SectionHeading id="promise-h" sub="What we believe" title="The Azelle promise" />
      <ul className="mx-auto mt-14 grid max-w-[1100px] gap-x-10 gap-y-14 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {PROMISES.map(({ key, title, body }, i) => {
          const Icon = ICONS[key];
          return (
            <li key={key} data-reveal="slide" style={revealOrder(i)} className="text-center">
              <Icon className="mx-auto h-16 w-16" />
              <h3 className="mt-5 text-[16px] font-semibold uppercase tracking-[0.06em]">{title}</h3>
              <p className="mx-auto mt-3 max-w-xs leading-relaxed">{body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
