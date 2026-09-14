// Solid availability pill: green "In stock", red "Sold out" (white text, both ≥ 4.5:1).
export function StockBadge({ inStock, className = "" }: { inStock: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white ${inStock ? "bg-[#2f7d4f]" : "bg-[#b3261e]"} ${className}`}
    >
      {inStock ? "In stock" : "Sold out"}
    </span>
  );
}
