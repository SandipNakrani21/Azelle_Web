import { Atelier } from "./Atelier";
import { HouseSplit } from "./HouseSplit";
import { PromiseSection } from "./Promise";

import { ShopByFamily } from "./ShopByFamily";
import { ShopByNote } from "./ShopByNote";

import { Ornament } from "@/components/ui/Ornament";

export default function HomeLower() {
  return <><HouseSplit /><div className="brand-gradient"><ShopByNote /><div className="mx-auto max-w-[1000px] px-6 pb-12 md:pb-16"><Ornament wide tone="light" /></div><ShopByFamily /></div><PromiseSection /><Atelier /></>;
}
