import { Suspense, useEffect, useState, type ComponentType, type ReactElement, type SVGProps } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";
import { AdminAuthProvider, useAdminAuth } from "./AdminAuthProvider";
import { adminCommerceApi, adminReviewsApi, type Permission } from "./adminApi";
import {
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
type NavItem = { to: string; label: string; icon: Icon; perm: Permission; badge?: "orders" | "reviews"; end?: boolean };
type NavGroup = { id: string; label: string; icon?: Icon; collapsible?: boolean; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    id: "dashboards",
    label: "Dashboards",
    icon: IconDashboard,
    collapsible: true,
    items: [
      { to: "/admin/dashboard", label: "Azelle dashboard", icon: IconSales, perm: "dashboard.view", end: true },
      { to: "/admin/dashboard/clarity", label: "Clarity dashboard", icon: IconClarity, perm: "analytics.view" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { to: "/admin/orders", label: "Orders", icon: IconOrders, perm: "orders.view", badge: "orders" },
      { to: "/admin/customers", label: "Customers", icon: IconCustomers, perm: "customers.view" },
    ],
  },
  {
    id: "catalogue",
    label: "Catalogue",
    items: [
      { to: "/admin/products", label: "Products", icon: IconProducts, perm: "products.view" },
      { to: "/admin/reviews", label: "Reviews", icon: IconReviews, perm: "reviews.manage", badge: "reviews" },
      { to: "/admin/coupons", label: "Coupons", icon: IconCoupons, perm: "coupons.manage" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { to: "/admin/users", label: "Users & roles", icon: IconUsers, perm: "users.manage" },
      { to: "/admin/settings", label: "Settings", icon: IconSettings, perm: "settings.view" },
    ],
  },
];

/** First admin page this role may open (used after sign-in and for /admin). */
export function useHomePath() {
  const { can } = useAdminAuth();
  for (const group of NAV) for (const item of group.items) if (can(item.perm)) return item.to;
  return "/admin/login";
}

const COLLAPSE_KEY = "azelle.admin.sidebarCollapsed";

function Sidebar({ collapsed, badges, onNavigate }: { collapsed: boolean; badges: Record<string, number>; onNavigate?: () => void }) {
  const { can } = useAdminAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({ dashboards: true });

  return (
    <nav aria-label="Admin" className="space-y-5 px-3">
      {NAV.map((group, gi) => {
        const items = group.items.filter((i) => can(i.perm));
        if (!items.length) return null;
        const expanded = !group.collapsible || collapsed || open[group.id] !== false;
        const groupActive = items.some((i) => pathname.startsWith(i.to));
        return (
          <div key={group.id} className="admin-rise" style={{ animationDelay: `${gi * 70}ms` }}>
            {group.collapsible && !collapsed ? (
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [group.id]: !expanded }))}
                aria-expanded={expanded}
                className={`admin-nav-link flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] font-semibold ${groupActive ? "text-white" : ""}`}
              >
                {group.icon && <group.icon />}
                <span className="flex-1 text-left">{group.label}</span>
                <IconChevron size={16} className={`transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
              </button>
            ) : (
              !collapsed && <p className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/45">{group.label}</p>
            )}

            {/* Animated open / close (grid rows 0fr → 1fr) */}
            <div className={`grid transition-[grid-template-rows] duration-500 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <ul className={`overflow-hidden ${group.collapsible && !collapsed ? "ml-3 border-l border-white/10 pl-2" : ""} space-y-1`}>
                {items.map((item) => {
                  const count = item.badge ? badges[item.badge] ?? 0 : 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `admin-nav-link group relative flex items-center gap-3 rounded-[12px] py-2.5 text-[14px] font-medium ${collapsed ? "justify-center px-0" : "px-3"} ${
                            isActive ? "is-active" : ""
                          }`
                        }
                      >
                        <item.icon size={collapsed ? 21 : 19} />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {count > 0 && (
                          <span
                            className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-bold text-[#241b18] ${collapsed ? "absolute right-1.5 top-0.5" : ""}`}
                            style={{ background: "linear-gradient(110deg,#e6b45a,#e9a58f)" }}
                            aria-label={`${count} waiting`}
                          >
                            {count}
                          </span>
                        )}
                        {collapsed && <span className="sr-only">{item.label}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// Protected admin shell: gradient sidebar (collapsible on desktop, drawer on phones/tablets) + page.
export function RequireAdmin() {
  const { status, admin, can, idleTimeoutMs, logout, guard } = useAdminAuth();
  const location = useLocation();
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

  // Waiting counts for the sidebar badges, refreshed on every page change (only what the role can see).
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    if (can("orders.view")) {
      guard(adminCommerceApi.listOrders({ status: "pending" }))
        .then((d) => !cancelled && setBadges((b) => ({ ...b, orders: d.total })))
        .catch(() => undefined);
    }
    if (can("reviews.manage")) {
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

  const brand = (compact: boolean) => (
    <Link to="/admin" className={`flex items-center gap-3 ${compact ? "justify-center" : "px-5"}`} aria-label="Azelle admin home">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] font-display text-xl text-[#241b18] shadow-lg" style={{ background: "linear-gradient(135deg,#e6b45a,#e9a58f 55%,#9fc2ad)" }}>
        A
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[1.35rem] text-white">Azelle</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-white/55">Admin studio</span>
        </span>
      )}
    </Link>
  );

  const profile = (compact: boolean) => (
    <div className={`border-t border-white/10 px-4 py-4 ${compact ? "space-y-3" : ""}`}>
      <div className={`flex items-center gap-3 ${compact ? "justify-center" : ""}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-bold text-white ring-2 ring-white/20" title={compact ? `${admin?.name} · ${admin?.role}` : undefined}>
          {initials}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">{admin?.name}</span>
            <span className="block truncate text-[12px] text-white/60">
              {admin?.role} · {admin?.email}
            </span>
          </span>
        )}
      </div>
      <div className={`mt-3 flex ${compact ? "flex-col items-center gap-2" : "gap-2"}`}>
        <a href="/" target="_blank" rel="noreferrer" title="View store" className="admin-nav-link grid h-10 flex-1 place-items-center rounded-[10px] bg-white/10 px-3 text-[12px] font-semibold">
          {compact ? <IconStore /> : <span className="flex items-center gap-2"><IconStore size={16} /> Store</span>}
        </a>
        <button type="button" onClick={() => void logout("manual")} title="Log out" className="admin-nav-link grid h-10 flex-1 place-items-center rounded-[10px] bg-white/10 px-3 text-[12px] font-semibold">
          {compact ? <IconLogout /> : <span className="flex items-center gap-2"><IconLogout size={16} /> Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-shell min-h-screen text-ink" data-clarity-mask="True">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>

      {/* Desktop sidebar — collapses to an icon rail */}
      <aside className={`admin-sidebar admin-sidebar-width fixed inset-y-0 left-0 z-30 hidden flex-col lg:flex ${collapsed ? "w-[84px]" : "w-[264px]"}`}>
        <div className="flex items-center justify-between pb-4 pt-6">{brand(collapsed)}</div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3.5 top-8 grid h-7 w-7 place-items-center rounded-full border border-line bg-surface text-ink shadow-md transition-transform duration-300 hover:scale-110"
        >
          {collapsed ? <IconExpand size={15} /> : <IconCollapse size={15} />}
        </button>
        <div className="mt-2 flex-1 overflow-y-auto overflow-x-visible py-2">
          <Sidebar collapsed={collapsed} badges={badges} />
        </div>
        {profile(collapsed)}
      </aside>

      {/* Phones / tablets: top bar + drawer */}
      <header className="admin-sidebar sticky top-0 z-40 flex h-16 items-center justify-between pr-3 lg:hidden">
        {brand(false)}
        <button type="button" className="icon-btn text-white" onClick={() => setMenuOpen(true)} aria-label="Open admin menu" aria-expanded={menuOpen}>
          <MenuIcon />
        </button>
      </header>
      <div className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? "" : "pointer-events-none"}`} aria-hidden={!menuOpen}>
        <button type="button" tabIndex={menuOpen ? 0 : -1} className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"}`} aria-label="Close admin menu" onClick={() => setMenuOpen(false)} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          className={`admin-sidebar absolute inset-y-0 left-0 flex w-[290px] max-w-[86vw] flex-col pt-4 shadow-2xl transition-transform duration-500 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between pr-3">
            {brand(false)}
            <button type="button" className="icon-btn text-white" onClick={() => setMenuOpen(false)} aria-label="Close admin menu" tabIndex={menuOpen ? 0 : -1}>
              <CloseIcon />
            </button>
          </div>
          <div className="mt-6 flex-1 overflow-y-auto">{menuOpen && <Sidebar collapsed={false} badges={badges} onNavigate={() => setMenuOpen(false)} />}</div>
          {profile(false)}
        </div>
      </div>

      <div className={`admin-sidebar-width transition-[padding] duration-500 ${collapsed ? "lg:pl-[84px]" : "lg:pl-[264px]"}`}>
        <p className="border-b border-line bg-surface/70 px-5 py-1.5 text-center text-[12px] backdrop-blur">
          Signed in as <span className="font-semibold">{admin?.name}</span> ({admin?.role}) · signed out after {Math.round(idleTimeoutMs / 60000)} minutes of inactivity
        </p>
        <main id="admin-main" className="mx-auto max-w-[1320px] px-5 py-8 md:px-8 md:py-10">
          <Suspense fallback={<p className="py-20 text-center text-sm">Loading…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/** Route guard for one admin page: shows a friendly message when the role lacks the permission. */
export function RequirePermission({ perm, children }: { perm: Permission; children: ReactElement }) {
  const { can } = useAdminAuth();
  if (can(perm)) return children;
  return (
    <div className="admin-rise mx-auto max-w-md rounded-[20px] border border-line bg-surface p-8 text-center">
      <p className="admin-title font-display text-3xl">No access</p>
      <p className="mt-3 text-sm">Your role doesn't include this page. Ask the store owner if you need it.</p>
    </div>
  );
}

/** /admin → the first page the role may open. */
export function AdminHome() {
  const home = useHomePath();
  return <Navigate to={home} replace />;
}
