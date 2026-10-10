import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnnouncementCenter } from "@/components/announcements/AnnouncementCenter";
import { useAuth } from "@/providers/AuthProvider";
import { useCart } from "@/providers/CartProvider";
import { useOverlayPresence } from "@/hooks/useOverlayPresence";
import { ThemeRail } from "@/components/ThemeRail";
import { useScrollEffects } from "@/hooks/useScrollEffects";
import { useVisibleMotion } from "@/hooks/useVisibleMotion";
import { useVisitLog } from "@/hooks/useVisitLog";
import { showThemeRail } from "@/lib/themes";
import { AnnouncementProvider } from "@/providers/AnnouncementProvider";
import { Footer } from "./Footer";
import { Header } from "./Header";

const AuthModal = lazy(() => import("@/components/auth/AuthModal").then(module => ({ default: module.AuthModal })));
const CartDrawer = lazy(() => import("@/components/cart/CartDrawer").then(module => ({ default: module.CartDrawer })));

export function Layout() {
  useScrollEffects();
  useVisibleMotion();
  // Every storefront page view is logged for the admin panel's Visitors page (never /admin).
  useVisitLog();
  const { pathname } = useLocation();
  const { isAuthOpen } = useAuth();
  const { isOpen } = useCart();
  const showAuth = useOverlayPresence(isAuthOpen);
  const showCart = useOverlayPresence(isOpen);
  // Pages whose gradient background runs all the way down meet the footer directly
  // (they reserve the room for the footer bottles themselves), so no plain strip shows between.
  const flushFooter = pathname.startsWith("/pages/") || pathname === "/account";

  return (
    // Announcements are a storefront thing, so they load here rather than around the whole app.
    <AnnouncementProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <div className="scroll-progress" aria-hidden="true" />
      <main id="main">
        <Outlet />
      </main>
      <Footer flush={flushFooter} />
      <Suspense fallback={<div role="status" className="fixed bottom-5 right-5 z-[80] rounded-xl bg-surface px-5 py-3 shadow-xl">Opening…</div>}>
        {showCart && <CartDrawer />}
        {showAuth && <AuthModal />}
      </Suspense>
      <AnnouncementCenter />
      {showThemeRail && <ThemeRail />}
    </AnnouncementProvider>
  );
}
