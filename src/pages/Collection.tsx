import { useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { CatalogueStatus } from "@/components/product/CatalogueStatus";
import { ProductCard } from "@/components/product/ProductCard";
import { fieldClass } from "@/components/ui/Field";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/ui/Icons";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Ornament } from "@/components/ui/Ornament";
import { BESTSELLER_COUNT, COLLECTIONS, GENDERS, SHOP_TABS, type NavState, type ShopTab } from "@/lib/navigation";
import { DEFAULT_SIZE_ID, FAMILIES, matchesNote, unitPrice } from "@/lib/products";
import { revealOrder } from "@/lib/reveal";
import { useProducts } from "@/providers/ProductsProvider";

const PAGE_SIZE = 6;
const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name: A to Z" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

const stripField = `${fieldClass} !mt-0 !h-14 !rounded-[12px] !bg-bg text-[16px]`;
const pageButton =
  "grid h-12 min-w-12 place-items-center rounded-full border px-3 text-[15px] font-semibold transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-35";

// Collection page. Tabs mirror the footer Shop links (All + five sections); the strip below holds
// search, the active section's multi-select filter, sorting and pagination. Everything lives in the
// URL (repeated params for multiple selections, e.g. ?note=Oud&note=Rose), so links open the right view.
export default function Collection() {
  const [params, setParams] = useSearchParams();
  const { products, status, error, reload } = useProducts();
  const location = useLocation();

  // Footer / menu Shop links (e.g. "Shop by Family" clicked while already on this page) bring the
  // section tabs into view and focus the newly selected tab. In-page tab, filter and search changes
  // carry no router state, so they never move the page. The short delay lets the layout's own
  // scroll-to-top (on arriving from another page) run first.
  useEffect(() => {
    if (!(location.state as NavState | null)?.focusShop) return;
    let fallback: number | undefined;
    const timer = window.setTimeout(() => {
      const sections = document.getElementById("shop-sections");
      if (!sections) return;
      const offset = () => parseFloat(getComputedStyle(sections).scrollMarginTop) || 0;
      const target = () => sections.getBoundingClientRect().top + window.scrollY - offset();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: target(), behavior: reduceMotion ? "instant" : "smooth" });
      sections.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus({ preventScroll: true });
      // If the smooth scroll is interrupted or unsupported, finish with a direct jump.
      fallback = window.setTimeout(() => {
        if (Math.abs(sections.getBoundingClientRect().top - offset()) > 40) window.scrollTo({ top: target(), behavior: "instant" });
      }, 900);
    }, 80);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
    };
  }, [location.key, location.state]);

  // Every note used across the catalogue, for the notes filter.
  const allNotes = useMemo(
    () =>
      [...new Set(products.flatMap((p) => [p.pyramid.top, p.pyramid.heart, p.pyramid.base].join(",").split(",").map((n) => n.trim()).filter(Boolean)))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [products],
  );

  const genders = GENDERS.filter((g) => params.getAll("gender").some((v) => v.toLowerCase() === g.toLowerCase()));
  const notes = [
    ...new Set(
      params
        .getAll("note")
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => allNotes.find((a) => a.toLowerCase() === n.toLowerCase()) ?? n),
    ),
  ];
  const groups = FAMILIES.filter((f) => params.getAll("group").includes(f));
  const collections = COLLECTIONS.filter((c) => params.getAll("collection").includes(c.slug));
  const collectionFamilies = collections.flatMap((c) => c.families);
  const query = params.get("q") ?? "";
  const sort: SortId = SORTS.find((s) => s.id === params.get("sort"))?.id ?? "featured";
  // Links that only carry a filter (?note=, ?group=, …) open the matching tab automatically.
  const tab: ShopTab =
    SHOP_TABS.find((t) => t.id === params.get("tab"))?.id ??
    (genders.length ? "gender" : notes.length ? "notes" : groups.length ? "family" : collections.length ? "collections" : "all");
  const tabLabel = SHOP_TABS.find((t) => t.id === tab)?.label ?? "All";

  // Within one filter, a product matches if it has ANY of the selected values.
  const search = query.trim().toLowerCase();
  const base = tab === "bestsellers" ? products.slice(0, BESTSELLER_COUNT) : products;
  const filtered = base.filter(
    (p) =>
      (!groups.length || p.families.some((f) => groups.includes(f))) &&
      (!notes.length || notes.some((n) => matchesNote(p, n))) &&
      (!collectionFamilies.length || p.families.some((f) => collectionFamilies.includes(f))) &&
      (!search ||
        [p.name, p.family, p.concentration, p.description, ...p.families, p.pyramid.top, p.pyramid.heart, p.pyramid.base]
          .join(" ")
          .toLowerCase()
          .includes(search)),
  );
  const sorted = [...filtered];
  if (sort === "price-asc") sorted.sort((a, b) => unitPrice(a, DEFAULT_SIZE_ID) - unitPrice(b, DEFAULT_SIZE_ID));
  else if (sort === "price-desc") sorted.sort((a, b) => unitPrice(b, DEFAULT_SIZE_ID) - unitPrice(a, DEFAULT_SIZE_ID));
  else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(params.get("page")) || 1));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstShown = sorted.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastShown = Math.min(page * PAGE_SIZE, sorted.length);

  // Apply URL changes; any filter change returns to page 1.
  const update = (changes: Record<string, string | string[] | null>, { keepPage = false, replace = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      next.delete(key);
      if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
      else if (value) next.set(key, value);
    }
    if (!keepPage) next.delete("page");
    setParams(next, { replace });
  };
  const selectTab = (id: ShopTab) => update({ tab: id === "all" ? null : id, gender: null, note: null, group: null, collection: null });
  const goToPage = (n: number) => {
    update({ page: n > 1 ? String(n) : null }, { keepPage: true });
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const clearAll = () => setParams(tab === "all" ? new URLSearchParams() : new URLSearchParams({ tab }));

  // The multi-select filter shown in the strip depends on the active section.
  const sectionFilter = (() => {
    switch (tab) {
      case "gender":
        return (
          <MultiSelect label="Gender" allLabel="All genders" plural="genders" options={GENDERS.map((g) => ({ value: g, label: g }))} selected={genders} onChange={(v) => update({ gender: v })} />
        );
      case "notes":
        return (
          <MultiSelect label="Notes" allLabel="All notes" plural="notes" searchable options={allNotes.map((n) => ({ value: n, label: n }))} selected={notes} onChange={(v) => update({ note: v })} />
        );
      case "family":
        return (
          <MultiSelect label="Families" allLabel="All families" plural="families" options={FAMILIES.map((f) => ({ value: f, label: f }))} selected={groups} onChange={(v) => update({ group: v })} />
        );
      case "collections":
        return (
          <MultiSelect
            label="Collections"
            allLabel="All collections"
            plural="collections"
            options={COLLECTIONS.map((c) => ({ value: c.slug, label: c.label }))}
            selected={collections.map((c) => c.slug)}
            onChange={(v) => update({ collection: v })}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <div>
      <section className="relative overflow-hidden" aria-labelledby="collection-h">
        <div className="hero__bg" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1440px] px-6 pb-14 pt-[calc(var(--header-h)+4rem)] text-center md:pb-20">
          <p data-reveal="slide" className="section-sub">
            {collections.length === 1 ? collections[0].label : tab === "all" ? "The collection" : tabLabel}
          </p>
          <div data-reveal="slide">
            <Ornament tone="light" className="my-3" />
          </div>
          <h1 id="collection-h" data-reveal="slide" style={revealOrder(1)} className="font-display text-[clamp(2.6rem,6vw,5rem)] leading-none">
            Find your
            <br />
            signature scent.
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        {/* Sections — same as the footer's Shop links */}
        <div
          id="shop-sections"
          role="group"
          aria-label="Shop sections"
          className="flex scroll-mt-[calc(var(--header-h)+1rem)] flex-wrap justify-center gap-2 pb-6 pt-10"
        >
          {SHOP_TABS.map((t) => (
            <button key={t.id} type="button" aria-pressed={t.id === tab} onClick={() => selectTab(t.id)} className={`chip ${t.id === tab ? "is-active" : ""}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search · section filter (multi-select) · sort · pagination */}
        <div
          id="results"
          className="scroll-mt-[calc(var(--header-h)+1rem)] rounded-[22px] border border-line bg-surface p-4 shadow-[0_12px_30px_rgba(27,24,21,.06)] md:p-5"
        >
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="relative min-w-0 basis-full xl:flex-1 xl:basis-0">
              <label htmlFor="collection-search" className="sr-only">
                Search fragrances
              </label>
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" width={20} height={20} aria-hidden="true" />
              <input
                id="collection-search"
                type="search"
                value={query}
                onChange={(e) => update({ q: e.target.value || null }, { replace: true })}
                placeholder="Search by name, note or family"
                className={`${stripField} !pl-12`}
              />
            </div>
            {sectionFilter && <div className="w-full sm:w-[260px]">{sectionFilter}</div>}
            <div className="w-full sm:w-[240px]">
              <label htmlFor="collection-sort" className="sr-only">
                Sort by
              </label>
              <select id="collection-sort" value={sort} onChange={(e) => update({ sort: e.target.value === "featured" ? null : e.target.value })} className={stripField}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-full items-center justify-between gap-4 sm:ml-auto sm:w-auto">
              <p className="whitespace-nowrap text-[15px]" aria-live="polite">
                {sorted.length ? `${firstShown}–${lastShown} of ${sorted.length}` : "0 results"}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className={`${pageButton} border-line bg-bg`}>
                  <ChevronLeftIcon width={18} height={18} />
                </button>
                <span className="whitespace-nowrap px-1 text-[15px] font-semibold">
                  {page} / {pageCount}
                </span>
                <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= pageCount} aria-label="Next page" className={`${pageButton} border-line bg-bg`}>
                  <ChevronRightIcon width={18} height={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {tab === "gender" && <p className="pt-5 text-center text-sm">Gender tags are being added — showing every fragrance for now.</p>}

        {status !== "ready" ? (
          <CatalogueStatus status={status} error={error} onRetry={reload} />
        ) : (
          sorted.length === 0 && (
            <div className="py-16 text-center">
              <p>No fragrances match {search ? `"${query.trim()}"` : "these filters"} yet.</p>
              <button type="button" onClick={clearAll} className="link-underline mt-4 text-sm font-semibold uppercase tracking-[0.14em]">
                Clear search and filters
              </button>
            </div>
          )
        )}

        <ul
          key={`${tab}-${groups.join()}-${notes.join()}-${collections.map((c) => c.slug).join()}-${sort}-${page}`}
          className="mt-10 grid grid-cols-2 gap-x-5 gap-y-14 md:grid-cols-3"
        >
          {visible.map((product, i) => (
            <ProductCard key={product.id} product={product} order={i} />
          ))}
        </ul>

        {/* Page numbers */}
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 pb-24 pt-14">
          {pageCount > 1 && (
            <>
              <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className={`${pageButton} border-line`}>
                <ChevronLeftIcon width={18} height={18} />
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => goToPage(n)}
                  aria-current={n === page ? "page" : undefined}
                  aria-label={`Page ${n}`}
                  className={`${pageButton} ${n === page ? "border-ink bg-ink text-bg" : "border-line hover:border-ink"}`}
                >
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= pageCount} aria-label="Next page" className={`${pageButton} border-line`}>
                <ChevronRightIcon width={18} height={18} />
              </button>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
