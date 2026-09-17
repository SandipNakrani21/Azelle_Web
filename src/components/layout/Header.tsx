import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Drawer } from "@/components/ui/Drawer";
import { AccountMenu } from "./AccountMenu";
import { BagIcon, ChevronDownIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";
import { Ornament } from "@/components/ui/Ornament";
import { sized } from "@/lib/images";
import { COLLECTIONS, HOUSE_LINKS, INFORMATION_LINKS, linkState, OTHERS_LINKS, shopMenuColumns, type MenuColumn, type MenuEntry } from "@/lib/navigation";
import { matchesNote, type Product } from "@/lib/products";
import { useAuth } from "@/providers/AuthProvider";
import { subscribeScroll } from "@/lib/scrollLoop";
import { useCart } from "@/providers/CartProvider";
import { useProducts } from "@/providers/ProductsProvider";

type MenuItem = {
  label: string;
  columns: MenuColumn[];
  feature?: { title: string; to: string; image: string };
};

type Feature = NonNullable<MenuItem["feature"]>;

const featureOf = (p: Product): Feature => ({ title: p.name, to: `/product/${p.slug}`, image: p.images[0] });

// Shop: gender, notes, family, bestsellers, collections — only this menu shows a product image.
// Information and Our House mirror the footer (links live in src/lib/navigation.ts).
function buildMenu(products: Product[]): MenuItem[] {
  const featured = products.find((p) => p.images.length > 0);
  return [
    {
      label: "Shop",
      columns: shopMenuColumns(products),
      feature: featured ? featureOf(featured) : undefined,
    },
    {
      label: "Information",
      columns: [{ heading: "Information", links: [...INFORMATION_LINKS, { label: "Help", to: "/pages/help" }] }],
    },
    {
      label: "Our House",
      columns: [
        { heading: "Our House", links: HOUSE_LINKS },
        { heading: "Others", links: OTHERS_LINKS },
      ],
    },
  ];
}

// The top product (first in catalogue order, with photos) behind a Shop menu link — used for the hover preview.
function productForLink(to: string, products: Product[]): Product | undefined {
  const withImages = products.filter((p) => p.images.length > 0);
  const url = new URL(to, window.location.origin);
  if (url.pathname.startsWith("/product/")) return withImages.find((p) => p.slug === url.pathname.slice("/product/".length));
  const note = url.searchParams.get("note");
  if (note) return withImages.find((p) => matchesNote(p, note));
  const group = url.searchParams.get("group");
  if (group) return withImages.find((p) => (p.families as string[]).includes(group));
  const collection = COLLECTIONS.find((c) => c.slug === url.searchParams.get("collection"));
  if (collection) return withImages.find((p) => p.families.some((f) => collection.families.includes(f)));
  return withImages[0];
}

function FeatureTile({ feature }: { feature: Feature }) {
  return (
    <Link to={feature.to} className="zoom-tile ml-auto block w-[260px] shrink-0">
      <div className="aspect-square overflow-hidden rounded-[14px] bg-[#fbfaf7]">
        <img key={feature.image} src={sized(feature.image, 640)} alt="" className="h-full w-full animate-[fadeIn_0.45s_ease-out] object-cover" />
      </div>
      <p key={feature.title} className="mt-3 animate-[fadeIn_0.45s_ease-out] text-sm uppercase tracking-[0.14em]">
        {feature.title}
      </p>
    </Link>
  );
}

// A menu entry is either a page link or an action button (Login & Signup opens the sign-in window).
function MenuEntryLink({ entry, className, onAuth }: { entry: MenuEntry; className: string; onAuth: () => void }) {
  if ("action" in entry) {
    return (
      <button type="button" className={`${className} text-left`} onClick={onAuth}>
        {entry.label}
      </button>
    );
  }
  return (
    <Link to={entry.to} state={linkState(entry.to)} className={className}>
      {entry.label}
    </Link>
  );
}

const HIDE_AFTER = 160;

export function Header() {
  const { count, openCart } = useCart();
  const { products } = useProducts();
  const MENU = useMemo(() => buildMenu(products), [products]);
  const location = useLocation();
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuOpenRef = useRef(false);

  // Solid past the header edge; hide on scroll-down, return on scroll-up.
  useEffect(() => {
    let lastY = window.scrollY;
    return subscribeScroll((y) => {
      setSolid(y > 80);
      if (y <= HIDE_AFTER) {
        setHidden(false);
      } else if (Math.abs(y - lastY) > 4) {
        setHidden(y > lastY && !menuOpenRef.current);
      }
      lastY = y;
    });
  }, []);

  useEffect(() => {
    menuOpenRef.current = openMenu !== null;
    if (!openMenu) return;
    setHidden(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMenu]);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname, location.search, location.hash]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Shop menu preview: hovering or focusing a link shows its top product's first image.
  const [preview, setPreview] = useState<Product | null>(null);
  useEffect(() => setPreview(null), [openMenu]);
  const previewEntry = (entry: MenuEntry) => {
    if ("to" in entry) setPreview(productForLink(entry.to, products) ?? null);
  };

  const { openAuth } = useAuth();
  const startAuth = useCallback(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    openAuth();
  }, [openAuth]);

  return (
    <>
      <header
        className={`site-header fixed inset-x-0 top-0 z-50 ${solid || openMenu ? "is-solid" : ""} ${hidden ? "is-hidden" : ""}`}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <div className="mx-auto grid h-[var(--header-h)] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 md:px-10">
          <div className="flex items-center">
            <button type="button" className="icon-btn -ml-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <MenuIcon />
            </button>
            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex gap-8">
                {MENU.map((item) => {
                  const isOpen = openMenu === item.label;
                  return (
                    <li key={item.label} onMouseEnter={() => setOpenMenu(item.label)}>
                      <button
                        type="button"
                        className="nav-link"
                        aria-expanded={isOpen}
                        onClick={() => setOpenMenu(isOpen ? null : item.label)}
                      >
                        <span>{item.label}</span>
                        <ChevronDownIcon className={`transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <Link to="/" className="logo-link flex flex-col items-center leading-none" aria-label="Azelle Fragrances, home">
            <Logo imgClassName="h-[34px] md:h-[40px]" taglineClassName="text-[9px] tracking-[0.5em]" />
          </Link>

          <div className="flex items-center justify-end">
            <Link to="/collection" className="icon-btn" aria-label="Browse the collection">
              <SearchIcon />
            </Link>
            <AccountMenu />
            <button type="button" className="icon-btn relative -mr-2" onClick={openCart} aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}>
              <BagIcon />
              {count > 0 && (
                <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {MENU.map(
          (item) =>
            openMenu === item.label && (
              <div key={item.label} className="menu-panel absolute inset-x-0 top-full hidden border-t border-line bg-surface shadow-[0_12px_24px_rgba(0,0,0,.08)] lg:block">
                <div className={`mx-auto flex max-w-[1440px] px-10 py-10 ${item.columns.length > 2 ? "gap-10 xl:gap-14" : "gap-16"}`}>
                  {item.columns.map((col) => (
                    <div key={col.heading} className="min-w-[150px]">
                      <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-ink">{col.heading}</p>
                      {/* Separator between the column title and its links */}
                      <div className="mt-3 w-[130px]">
                        <Ornament align="left" wide />
                      </div>
                      <ul className="mt-4 space-y-3">
                        {col.links.map((l) => (
                          <li key={l.label} onMouseEnter={() => previewEntry(l)} onFocus={() => previewEntry(l)}>
                            <MenuEntryLink entry={l} className="menu-link font-display text-xl" onAuth={startAuth} />
                          </li>
                        ))}
                      </ul>
                      {col.more && (
                        <Link to={col.more.to} state={linkState(col.more.to)} className="link-underline mt-5 text-[12px] font-semibold uppercase tracking-[0.16em]">
                          {col.more.label} →
                        </Link>
                      )}
                    </div>
                  ))}
                  {item.feature && <FeatureTile feature={preview ? featureOf(preview) : item.feature} />}
                </div>
              </div>
            ),
        )}
      </header>

      <Drawer open={mobileOpen} onClose={closeMobile} side="left" label="Menu">
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <Logo imgClassName="h-9" taglineClassName="text-[8px] tracking-[0.5em]" />
            <button type="button" className="icon-btn" onClick={closeMobile} aria-label="Close menu">
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Mobile" className="space-y-8 px-6 py-8">
            {MENU.map((item) => (
              <div key={item.label}>
                <p className="text-[11px] uppercase tracking-[0.22em] text-soft">{item.label}</p>
                {item.columns.map((col) => (
                  <div key={col.heading} className="mt-4">
                    {item.columns.length > 1 && <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">{col.heading}</p>}
                    <ul className="mt-2 space-y-2.5">
                      {col.links.map((l) => (
                        <li key={l.label}>
                          {/* py-1.5 keeps mobile menu links at a comfortable ~44px tap height. */}
                          <MenuEntryLink entry={l} className="menu-link block py-1.5 font-display text-2xl" onAuth={startAuth} />
                        </li>
                      ))}
                    </ul>
                    {col.more && (
                      <Link to={col.more.to} state={linkState(col.more.to)} className="link-underline mt-3 text-[12px] font-semibold uppercase tracking-[0.16em]">
                        {col.more.label} →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </Drawer>
    </>
  );
}
