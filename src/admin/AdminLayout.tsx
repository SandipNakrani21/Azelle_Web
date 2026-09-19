import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";
import { AdminAuthProvider, useAdminAuth } from "./AdminAuthProvider";
import { adminCommerceApi, adminReviewsApi } from "./adminApi";

export function AdminSplash({ label = "Checking your session…" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg text-ink">
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

// ── Sidebar navigation ──────────────────────────────────────────────────────
const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const NAV: { to: string; label: string; icon: ReactNode; badge?: "pending" | "reviews" }[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: icon(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>) },
  { to: "/admin/orders", label: "Orders", badge: "pending", icon: icon(<><path d="M6 3h12l1 5H5z" /><path d="M5 8v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" /><path d="M9.5 12h5" /></>) },
  { to: "/admin/products", label: "Products", icon: icon(<><rect x="8" y="2.5" width="8" height="4" rx="1" /><path d="M9 6.5v2.5l-2.5 2v9.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V11L15 9V6.5" /></>) },
  { to: "/admin/customers", label: "Customers", icon: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.7 2.5 3 5.2" /></>) },
  { to: "/admin/reviews", label: "Reviews", badge: "reviews", icon: icon(<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />) },
  { to: "/admin/coupons", label: "Coupons", icon: icon(<><path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" /><path d="M9 9.5h.01M15 14.5h.01M15.5 9 8.5 15" /></>) },
  { to: "/admin/settings", label: "Settings", icon: icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>) },
];

function SidebarNav({ pending, reviews, onNavigate }: { pending: number; reviews: number; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1 px-3">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors duration-300 ${
              isActive ? "bg-ink text-bg" : "hover:bg-surface2"
            }`
          }
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          {item.badge && (item.badge === "pending" ? pending : reviews) > 0 && (
            <span
              className="grid h-5 min-w-[20px] place-items-center rounded-full bg-[#c9772b] px-1.5 text-[11px] font-bold text-white"
              aria-label={`${item.badge === "pending" ? pending : reviews} waiting`}
            >
              {item.badge === "pending" ? pending : reviews}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

// Protected admin shell: sidebar (drawer on small screens), top bar, page outlet.
export function RequireAdmin() {
  const { status, email, idleTimeoutMs, logout, guard } = useAdminAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const [reviews, setReviews] = useState(0);

  // Pending-order count for the sidebar badge, refreshed on every page change.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    guard(adminCommerceApi.listOrders({ status: "pending" }))
      .then((d) => !cancelled && setPending(d.total))
      .catch(() => undefined);
    guard(adminReviewsApi.list({ status: "pending" }))
      .then((d) => !cancelled && setReviews(d.total))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status, location.pathname, guard]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  if (status === "checking") return <AdminSplash />;
  if (status === "anonymous") {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const brand = (
    <Link to="/admin/dashboard" className="flex items-center gap-3 px-6" aria-label="Azelle admin, dashboard">
      <Logo imgClassName="h-8" taglineClassName="text-[7px] tracking-[0.45em]" />
      <span className="rounded-full bg-ink px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-bg">Admin</span>
    </Link>
  );

  const footer = (
    <div className="mt-auto space-y-3 border-t border-line px-6 py-5 text-sm">
      <p className="break-all text-soft">{email}</p>
      <a href="/" target="_blank" rel="noreferrer" className="text-link inline-block">
        View store ↗
      </a>
      <button type="button" onClick={() => void logout("manual")} className="btn btn-secondary !h-10 w-full !min-w-0 !text-[12px]">
        Log out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-ink" data-clarity-mask="True">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface pt-6 lg:flex">
        {brand}
        <div className="mt-8 flex-1 overflow-y-auto">
          <SidebarNav pending={pending} reviews={reviews} />
        </div>
        {footer}
      </aside>

      {/* Phone / tablet top bar + drawer */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-surface pr-3 lg:hidden">
        {brand}
        <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open admin menu" aria-expanded={menuOpen}>
          <MenuIcon />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close admin menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-surface pt-4 shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close admin menu">
                <CloseIcon />
              </button>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">
              <SidebarNav pending={pending} reviews={reviews} onNavigate={() => setMenuOpen(false)} />
            </div>
            {footer}
          </div>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <p className="border-b border-line bg-surface2 px-5 py-1.5 text-center text-[12px]">
          For security, you&apos;ll be signed out after {Math.round(idleTimeoutMs / 60000)} minutes of inactivity.
        </p>
        <main id="admin-main" className="mx-auto max-w-[1280px] px-5 py-8 md:px-8 md:py-10">
          <Suspense fallback={<p className="py-20 text-center text-sm">Loading…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
