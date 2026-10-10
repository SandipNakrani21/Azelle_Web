import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { sendVisit } from "@/lib/visits";

/**
 * Sends one beacon per page the shopper opens, so the admin panel can show who is on the site
 * (Dashboards → Visitors). Mounted once in the layout; /admin is never tracked.
 */
export function useVisitLog() {
  const { pathname } = useLocation();

  useEffect(() => {
    // A small delay lets the page set its title first, and skips pages that are only passed through.
    const timer = window.setTimeout(() => void sendVisit(pathname), 400);
    return () => window.clearTimeout(timer);
  }, [pathname]);
}
