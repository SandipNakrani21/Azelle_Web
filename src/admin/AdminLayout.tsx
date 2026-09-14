import { Suspense } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { AdminAuthProvider, useAdminAuth } from "./AdminAuthProvider";

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

// Protected admin shell: top bar with logout, inactivity notice, page outlet.
export function RequireAdmin() {
  const { status, email, idleTimeoutMs, logout } = useAdminAuth();
  const location = useLocation();

  if (status === "checking") return <AdminSplash />;
  if (status === "anonymous") {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-5 md:px-8">
          <Link to="/admin/products" className="flex items-center gap-3" aria-label="Azelle admin, products">
            <Logo imgClassName="h-8" taglineClassName="text-[7px] tracking-[0.45em]" />
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-bg">Admin</span>
          </Link>
          <nav aria-label="Admin" className="hidden sm:block">
            <NavLink
              to="/admin/products"
              className={({ isActive }) => `text-sm font-semibold uppercase tracking-[0.14em] ${isActive ? "underline decoration-2 underline-offset-8" : ""}`}
            >
              Products
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-sm md:inline">{email}</span>
            <a href="/" target="_blank" rel="noreferrer" className="text-link hidden text-sm sm:inline-block">
              View store ↗
            </a>
            <button type="button" onClick={() => void logout("manual")} className="btn btn-secondary !h-10 !min-w-0 !px-4 !text-[12px]">
              Log out
            </button>
          </div>
        </div>
        <p className="border-t border-line bg-surface2 px-5 py-1.5 text-center text-[12px]">
          For security, you&apos;ll be signed out after {Math.round(idleTimeoutMs / 60000)} minutes of inactivity.
        </p>
      </header>
      <main id="admin-main" className="mx-auto max-w-[1280px] px-5 py-8 md:px-8 md:py-10">
        <Suspense fallback={<p className="py-20 text-center text-sm">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
