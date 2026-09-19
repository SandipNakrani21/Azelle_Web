import { Suspense, useEffect, useRef, useState, type ComponentType, type ReactElement, type ReactNode, type SVGProps } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";
import { AdminAuthProvider, useAdminAuth } from "./AdminAuthProvider";
import { adminCommerceApi, adminReviewsApi, type Permission } from "./adminApi";
import {
  IconBox,
  IconChevron,
  IconClarity,
  IconCollapse,
  IconCoupons,
  IconCustomers,
  IconDashboard,
  IconExpand,
  IconLogout,
  IconOrders,
  IconProducts,
  IconReviews,
  IconSales,
  IconSettings,
  IconStore,
  IconUsers,
} from "./icons";

export function AdminSplash({ label = "Checking your session…" }: { label?: string }) {
  return (
    <div className="admin-shell grid min-h-screen place-items-center text-ink">
      <div className="text-center" role="status">
        <Logo imgClassName="h-14" taglineClassName="text-[10px] tracking-[0.5em]" />
        <p className="mt-3 text-sm">{label}</p>
      </div>
    </div>
  );
}

// Wraps every /admin route (login included) with the admin session.
export function AdminRoot() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<AdminSplash label="Loading…" />}>
        <Outlet />
      </Suspense>
    </AdminAuthProvider>
  );
}

// ── Navigation (filtered by the admin's role) ──────────────────────────────
type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
type NavItem = { to: string; label: string; icon: Icon; perm: Permission | Permission[]; badge?: "orders" | "reviews"; end?: boolean };
type NavGroup = { id: string; label: string; icon: Icon; items: NavItem[] };

const svg = (paths: ReactNode): Icon =>
  function NavIcon({ size = 19 }) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {paths}
      </svg>
    );
  };
const IconShield = IconUsers;
const IconKey = svg(<><circle cx="8" cy="15" r="4" /><path d="M11 12l8.5-8.5M16 7l2.5 2.5M14 9l2 2" /></>);
const IconPerson = svg(<><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" /></>);
const IconBell = svg(<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>);

/** Every section is a group with sub-sections; a group with one item (Settings) shows as a single link. */
const NAV: NavGroup[] = [
  {
    id: "dashboards",
    label: "Dashboards",
    icon: IconDashboard,
    items: [
      { to: "/admin/dashboard", label: "Azelle dashboard", icon: IconSales, perm: "dashboard.view", end: true },
      { to: "/admin/dashboard/clarity", label: "Clarity dashboard", icon: IconClarity, perm: "analytics.view" },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    icon: IconBox,
    items: [
      { to: "/admin/orders", label: "All orders", icon: IconOrders, perm: "orders.view", badge: "orders" },
      { to: "/admin/customers", label: "Customers", icon: IconCustomers, perm: "customers.view" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: IconProducts,
    items: [
      { to: "/admin/products", label: "Products", icon: IconProducts, perm: "products.view" },
      { to: "/admin/reviews", label: "Reviews", icon: IconReviews, perm: "reviews.view", badge: "reviews" },
      { to: "/admin/coupons", label: "Coupons", icon: IconCoupons, perm: "coupons.view" },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: IconShield,
    items: [
      { to: "/admin/users", label: "Users", icon: IconPerson, perm: "users.view" },
      { to: "/admin/roles", label: "Roles", icon: IconShield, perm: "roles.view" },
      { to: "/admin/access", label: "User role access", icon: IconKey, perm: ["users.view", "roles.view"] },
    ],
  },
  { id: "settings", label: "Settings", icon: IconSettings, items: [{ to: "/admin/settings", label: "Settings", icon: IconSettings, perm: "settings.view" }] },
];

const flat = (perm: Permission | Permission[]) => [perm].flat();

/** First admin page this role may open (used after sign-in and for /admin). */
export function useHomePath() {
  const { can } = useAdminAuth();
  for (const group of NAV) for (const item of group.items) if (can(...flat(item.perm))) return item.to;
  return "/admin/login";
}

/** Group + page for the header breadcrumb. */
function useCrumbs(): { group: string; page: string } {
  const { pathname } = useLocation();
  if (/^\/admin\/orders\/[^/]+$/.test(pathname)) return { group: "Orders", page: "Order details" };
  if (pathname.endsWith("/products/new")) return { group: "Sales", page: "Add product" };
  if (/\/products\/[^/]+\/edit$/.test(pathname)) return { group: "Sales", page: "Edit product" };
  let best = { group: "Admin", page: "", len: 0 };
  for (const g of NAV)
    for (const i of g.items)
      if ((pathname === i.to || pathname.startsWith(`${i.to}/`)) && i.to.length > best.len) best = { group: g.label, page: i.label, len: i.to.length };
  return best;
}

const COLLAPSE_KEY = "azelle.admin.sidebarCollapsed";

function Sidebar({ collapsed, badges, onNavigate }: { collapsed: boolean; badges: Record<string, number>; onNavigate?: () => void }) {
  const { can } = useAdminAuth();
  const { pathname } = useLocation();
  const activeGroup = NAV.find((g) => g.items.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`)))?.id;
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ dashboards: true, ...(activeGroup ? { [activeGroup]: true } : {}) }));

  // Opening a page opens its group.
  useEffect(() => {
    if (activeGroup) setOpen((o) => (o[activeGroup] ? o : { ...o, [activeGroup]: true }));
  }, [activeGroup]);

  const link = (item: NavItem, nested: boolean) => {
    const count = item.badge ? badges[item.badge] ?? 0 : 0;
    return (
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          `admin-nav-link group relative flex items-center gap-3 rounded-[12px] ${nested && !collapsed ? "py-2 text-[13.5px]" : "py-2.5 text-[14px]"} font-medium ${
            collapsed ? "justify-center px-0" : "px-3"
          } ${isActive ? "is-active" : ""}`
        }
      >
        <item.icon size={collapsed ? 21 : nested ? 17 : 19} />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {count > 0 && (
          <span
            className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-bold text-[#3a2421] ${collapsed ? "absolute right-1.5 top-0.5" : ""}`}
            style={{ background: "linear-gradient(110deg,#f5d58c,#f3c0ae)" }}
            aria-label={`${count} waiting`}
          >
            {count}
          </span>
        )}
        {collapsed && <span className="sr-only">{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <nav aria-label="Admin" className="space-y-1.5 px-3">
      {NAV.map((group, gi) => {
        const items = group.items.filter((i) => can(...flat(i.perm)));
        if (!items.length) return null;
        const single = group.items.length === 1;
        const expanded = collapsed || single || open[group.id] === true;
        const groupActive = group.id === activeGroup;
        return (
          <div key={group.id} className="admin-rise" style={{ animationDelay: `${gi * 60}ms` }}>
            {collapsed && gi > 0 && <span className="mx-auto my-2 block h-px w-8 bg-white/25" aria-hidden="true" />}
            {single ? (
              link(items[0], false)
            ) : (
              <>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [group.id]: !expanded }))}
                    aria-expanded={expanded}
                    className={`admin-nav-link flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] font-semibold ${groupActive ? "bg-white/10 text-white" : ""}`}
                  >
                    <group.icon />
                    <span className="flex-1 text-left">{group.label}</span>
                    <IconChevron size={16} className={`transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
                  </button>
                )}
                {/* Animated open / close (grid rows 0fr → 1fr) */}
                <div className={`grid transition-[grid-template-rows] duration-500 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <ul className={`overflow-hidden ${collapsed ? "space-y-1" : "ml-4 mt-1 space-y-0.5 border-l border-white/25 pl-2.5"}`}>
                    {items.map((item) => (
                      <li key={item.to}>{link(item, true)}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Small dropdown used by the header (notifications, profile). Closes on outside click / Escape. */
function Dropdown({ button, children, label }: { button: (open: boolean) => ReactNode; children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="true" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)} className="rounded-full">
        {button(open)}
      </button>
      {open && (
        <div className="admin-rise absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] overflow-hidden rounded-[16px] border border-line bg-surface shadow-[0_20px_50px_rgba(27,24,21,.18)]" style={{ animationDuration: "0.25s" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Protected admin shell: gradient sidebar (collapsible on desktop, drawer on phones/tablets),
// header bar, page, footer bar.
export function RequireAdmin() {
  const { status, admin, can, idleTimeoutMs, logout, guard } = useAdminAuth();
  const location = useLocation();
  const crumbs = useCrumbs();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // Storage unavailable — the choice lasts for this visit.
    }
  }, [collapsed]);

  // Waiting counts for the sidebar badges and the header bell (only what the role can see).
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    if (can("orders.view")) {
      guard(adminCommerceApi.listOrders({ status: "pending" }))
        .then((d) => !cancelled && setBadges((b) => ({ ...b, orders: d.total })))
        .catch(() => undefined);
    }
    if (can("reviews.view")) {
      guard(adminReviewsApi.list({ status: "pending" }))
        .then((d) => !cancelled && setBadges((b) => ({ ...b, reviews: d.total })))
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [status, location.pathname, guard, can]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  if (status === "checking") return <AdminSplash />;
  if (status === "anonymous") {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const initials = (admin?.name ?? "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const waiting = (badges.orders ?? 0) + (badges.reviews ?? 0);

  // White Azelle logo for the gradient sidebar.
  const brand = (compact: boolean) => (
    <Link to="/admin" className={`flex items-center ${compact ? "justify-center" : "px-6"}`} aria-label="Azelle admin home">
      {compact ? (
        <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-white/15 font-display text-2xl text-white ring-1 ring-white/25">A</span>
      ) : (
        <span className="text-white">
          <Logo imgClassName="h-11 brightness-0 invert" taglineClassName="text-[9px] tracking-[0.5em] text-white/85" />
          <span className="mt-2 block text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">Admin studio</span>
        </span>
      )}
    </Link>
  );

  return (
    <div className="admin-shell min-h-screen text-ink" data-clarity-mask="True">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>

      {/* Desktop sidebar — collapses to an icon rail */}
      <aside className={`admin-sidebar admin-sidebar-width fixed inset-y-0 left-0 z-30 hidden flex-col lg:flex ${collapsed ? "w-[84px]" : "w-[264px]"}`}>
        <div className="pb-5 pt-6">{brand(collapsed)}</div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3.5 top-9 z-10 grid h-7 w-7 place-items-center rounded-full border border-line bg-surface text-ink shadow-md transition-transform duration-300 hover:scale-110"
        >
          {collapsed ? <IconExpand size={15} /> : <IconCollapse size={15} />}
        </button>
        <div className="flex-1 overflow-y-auto pb-6">
          <Sidebar collapsed={collapsed} badges={badges} />
        </div>
      </aside>

      {/* Phones / tablets: drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? "" : "pointer-events-none"}`} aria-hidden={!menuOpen}>
        <button type="button" tabIndex={menuOpen ? 0 : -1} className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"}`} aria-label="Close admin menu" onClick={() => setMenuOpen(false)} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          className={`admin-sidebar absolute inset-y-0 left-0 flex w-[290px] max-w-[86vw] flex-col pt-5 shadow-2xl transition-transform duration-500 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-start justify-between pr-3">
            {brand(false)}
            <button type="button" className="icon-btn text-white" onClick={() => setMenuOpen(false)} aria-label="Close admin menu" tabIndex={menuOpen ? 0 : -1}>
              <CloseIcon />
            </button>
          </div>
          <div className="mt-5 flex-1 overflow-y-auto pb-6">{menuOpen && <Sidebar collapsed={false} badges={badges} onNavigate={() => setMenuOpen(false)} />}</div>
        </div>
      </div>

      <div className={`flex min-h-screen flex-col transition-[padding] duration-500 ${collapsed ? "lg:pl-[84px]" : "lg:pl-[264px]"}`}>
        {/* Header bar */}
        <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 md:px-8">
            <button type="button" className="icon-btn -ml-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open admin menu" aria-expanded={menuOpen}>
              <MenuIcon />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex items-center gap-2 truncate text-[13px]">
                <li className="hidden text-soft sm:block">Admin</li>
                <li className="hidden text-soft sm:block" aria-hidden="true">
                  /
                </li>
                <li className="truncate text-soft">{crumbs.group}</li>
                {crumbs.page && crumbs.page !== crumbs.group && (
                  <>
                    <li className="text-soft" aria-hidden="true">
                      /
                    </li>
                    <li className="truncate font-semibold" aria-current="page">
                      {crumbs.page}
                    </li>
                  </>
                )}
              </ol>
            </nav>

            <a href="/" target="_blank" rel="noreferrer" className="abtn abtn-ghost hidden !h-10 sm:inline-flex" title="Open the store in a new tab">
              <IconStore size={16} /> View store
            </a>

            {/* Notifications: things waiting for the team */}
            <Dropdown
              label={`Notifications, ${waiting} waiting`}
              button={() => (
                <span className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-surface transition-colors duration-300 hover:border-ink">
                  <IconBell size={18} />
                  {waiting > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[10.5px] font-bold text-white" style={{ background: "linear-gradient(135deg,#c9772b,#b46a7a)" }}>
                      {waiting}
                    </span>
                  )}
                </span>
              )}
            >
              <p className="border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em]">Waiting for you</p>
              <div className="p-2">
                {can("orders.view") && (
                  <Link to="/admin/orders?status=pending" className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-sm hover:bg-surface2">
                    <span className="flex items-center gap-2.5">
                      <IconOrders size={17} /> Pending orders
                    </span>
                    <span className="font-bold tabular-nums">{badges.orders ?? 0}</span>
                  </Link>
                )}
                {can("reviews.view") && (
                  <Link to="/admin/reviews" className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-sm hover:bg-surface2">
                    <span className="flex items-center gap-2.5">
                      <IconReviews size={17} /> Reviews to approve
                    </span>
                    <span className="font-bold tabular-nums">{badges.reviews ?? 0}</span>
                  </Link>
                )}
                {!can("orders.view") && !can("reviews.view") && <p className="px-3 py-2.5 text-sm text-soft">Nothing for your role.</p>}
              </div>
            </Dropdown>

            {/* Profile */}
            <Dropdown
              label="Account menu"
              button={(open) => (
                <span className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1 pl-1 pr-3 transition-colors duration-300 hover:border-ink">
                  <span className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: "linear-gradient(135deg,#c9772b,#b46a7a 60%,#5f7d6f)" }}>
                    {initials}
                  </span>
                  <span className="hidden text-left leading-tight md:block">
                    <span className="block max-w-[140px] truncate text-[13px] font-semibold">{admin?.name}</span>
                    <span className="block text-[11px] text-soft">{admin?.role}</span>
                  </span>
                  <IconChevron size={14} className={`transition-transform duration-300 ${open ? "-rotate-90" : "rotate-90"}`} />
                </span>
              )}
            >
              <div className="border-b border-line px-4 py-3">
                <p className="font-semibold">{admin?.name}</p>
                <p className="break-all text-[12.5px] text-soft">{admin?.email}</p>
                <span className="mt-2 inline-block rounded-full bg-surface2 px-2.5 py-0.5 text-[11px] font-semibold">{admin?.role}</span>
              </div>
              <div className="p-2">
                <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm hover:bg-surface2">
                  <IconStore size={17} /> View store
                </a>
                <button type="button" onClick={() => void logout("manual")} className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-sm text-[#b3261e] hover:bg-[#fdf4f3]">
                  <IconLogout size={17} /> Log out
                </button>
              </div>
            </Dropdown>
          </div>
        </header>

        <main id="admin-main" className="mx-auto w-full max-w-[1320px] flex-1 px-5 py-8 md:px-8 md:py-10">
          <Suspense fallback={<p className="py-20 text-center text-sm">Loading…</p>}>
            <Outlet />
          </Suspense>
        </main>

        {/* Footer bar */}
        <footer className="border-t border-line bg-surface/70">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 text-[12.5px] text-soft md:px-8">
            <p>
              © {new Date().getFullYear()} Azelle Fragrances · <span className="font-semibold text-ink">Admin studio</span>
            </p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Auto sign-out after {Math.round(idleTimeoutMs / 60000)} minutes of inactivity</span>
              <a href="/" target="_blank" rel="noreferrer" className="text-link">
                Store ↗
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Route guard for one admin page: shows a friendly message when the role lacks the permission. */
export function RequirePermission({ perm, children }: { perm: Permission | Permission[]; children: ReactElement }) {
  const { can } = useAdminAuth();
  if (can(...flat(perm))) return children;
  return (
    <div className="admin-rise mx-auto max-w-md rounded-[20px] border border-line bg-surface p-8 text-center">
      <p className="admin-title font-display text-3xl">No access</p>
      <p className="mt-3 text-sm">Your role doesn't include this page. Ask a Super Admin if you need it.</p>
    </div>
  );
}

/** /admin → the first page the role may open. */
export function AdminHome() {
  const home = useHomePath();
  return <Navigate to={home} replace />;
}
