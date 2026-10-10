import { Atelier } from "./Atelier";
import { FollowUs } from "./FollowUs";
import { HouseSplit } from "./HouseSplit";
import { PromiseSection } from "./Promise";
import { Reviews } from "./Reviews";
import { ShopByFamily } from "./ShopByFamily";
import { ShopByNote } from "./ShopByNote";
import { Stockists } from "./Stockists";
import { Ornament } from "@/components/ui/Ornament";

export default function HomeLower() {
  return <><HouseSplit /><div className="brand-gradient"><ShopByNote /><div className="mx-auto max-w-[1000px] px-6 pb-12 md:pb-16"><Ornament wide tone="light" /></div><ShopByFamily /></div><Reviews /><Stockists /><PromiseSection /><Atelier /><FollowUs /></>;
}
