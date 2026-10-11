import { CheckCircleIcon } from "@/components/ui/Icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Wave } from "@/components/ui/Wave";
import { ATELIER_CHECKS } from "@/lib/content";
import { sized } from "@/lib/images";
import { useProducts } from "@/providers/ProductsProvider";
import { revealOrder } from "@/lib/reveal";


// Wave-edged band; two image columns scroll up / down on 15s loops.
export function Atelier() {
  const { products } = useProducts();
  const pool = products.flatMap((p) => p.images.slice(0, 2));
  const COLUMN_A = pool.filter((_, i) => i % 2 === 0).slice(0, 5);
  const COLUMN_B = pool.filter((_, i) => i % 2 === 1).slice(0, 5);

  return (
    <section id="studio" aria-labelledby="atelier-h" className="relative my-6">
      <Wave color="var(--band)" className="h-[60px] md:h-[90px]" />
      <div className="bg-[var(--band)] py-14 md:py-20">
        {/* Side by side from lg only — at tablet widths both columns were too narrow. */}
        <div className="mx-auto grid max-w-[1200px] items-stretch gap-10 px-6 md:px-10 lg:grid-cols-[minmax(0,540px)_auto] lg:justify-center lg:gap-20">
          <div className="relative mx-auto h-[420px] w-full max-w-[540px] md:h-[480px] lg:h-[560px]" aria-hidden="true">
            <div className="wbox-fit absolute inset-0 flex gap-[10px] md:gap-5">
            {[COLUMN_A, COLUMN_B].map((column, c) => (
              <div key={c} className="wbox w-[calc(50%-5px)] md:w-[calc(50%-10px)]">
                {[0, 1].map((copy) => (
                  <div key={copy} className="wbox-ani flex flex-col gap-5 pb-5">
                    {column.map((src, idx) => (
                      <img key={`${src}-${idx}`} src={sized(src, 600)} alt="" loading="lazy" decoding="async" className="aspect-square w-full rounded-[14px] object-cover" />
                    ))}
                  </div>
                ))}
              </div>
            ))}
            </div>
          </div>

          <div className="self-center py-2">
            <SectionHeading id="atelier-h" sub="Celebrating the craft" title="Made slowly, made to linger" align="left" />
            <ul className="mt-6 space-y-3">
              {ATELIER_CHECKS.map((item, i) => (
                <li key={item} data-reveal="right" style={revealOrder(i + 2)} className="flex items-center gap-3 text-base italic md:text-lg">
                  <CheckCircleIcon className="shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <Wave color="var(--band)" flip className="h-[60px] md:h-[90px]" />
    </section>
  );
}
