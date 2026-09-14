import { Outlet, useLocation } from "react-router-dom";
import { AuthModal } from "@/components/auth/AuthModal";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ThemeRail } from "@/components/ThemeRail";
import { useScrollEffects } from "@/hooks/useScrollEffects";
import { showThemeRail } from "@/lib/themes";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function Layout() {
  useScrollEffects();
  const { pathname } = useLocation();
  // Pages whose gradient background runs all the way down meet the footer directly
  // (they reserve the room for the footer bottles themselves), so no plain strip shows between.
  const flushFooter = pathname.startsWith("/pages/") || pathname === "/account";

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer flush={flushFooter} />
      <CartDrawer />
      <AuthModal />
      {showThemeRail && <ThemeRail />}
    </>
  );
}
