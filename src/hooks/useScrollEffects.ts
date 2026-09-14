import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { subscribeScroll } from "@/lib/scrollLoop";

/**
 * Mounted once in the layout.
 * - Reveals every [data-reveal] element as it enters the viewport by setting
 *   [data-revealed] (an attribute, so React re-renders never strip it).
 * - An IntersectionObserver does the work; a getBoundingClientRect sweep on the
 *   shared scroll frame is the safety net so content never stays hidden.
 * - Scrolls to top (or to the #hash target) on navigation.
 */
export function useScrollEffects() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pending = new Set<Element>();

    const reveal = (el: Element) => {
      el.setAttribute("data-revealed", "");
      pending.delete(el);
      observer.unobserve(el);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    const collect = () => {
      document.querySelectorAll("[data-reveal]:not([data-revealed])").forEach((el) => {
        if (reduceMotion) {
          el.setAttribute("data-revealed", "");
        } else if (!pending.has(el)) {
          pending.add(el);
          observer.observe(el);
        }
      });
    };

    const sweep = () => {
      const limit = window.innerHeight * 0.92;
      pending.forEach((el) => {
        if (!el.isConnected) pending.delete(el);
        else if (el.getBoundingClientRect().top < limit) reveal(el);
      });
    };

    collect();
    sweep();

    const mutations = new MutationObserver(() => {
      collect();
      sweep();
    });
    mutations.observe(document.getElementById("root") ?? document.body, {
      childList: true,
      subtree: true,
    });
    const unsubscribe = subscribeScroll(sweep);

    // Timer-based backup: runs even when animation frames are paused, so content never stays hidden.
    let scrollTimer = 0;
    const onScrollFallback = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(sweep, 120);
    };
    window.addEventListener("scroll", onScrollFallback, { passive: true });
    const safetyTimer = window.setTimeout(sweep, 1200);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      unsubscribe();
      window.removeEventListener("scroll", onScrollFallback);
      window.clearTimeout(scrollTimer);
      window.clearTimeout(safetyTimer);
    };
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
      if (target) target.scrollIntoView({ behavior: "smooth" });
      else window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, hash]);
}
