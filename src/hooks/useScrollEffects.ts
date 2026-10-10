import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Mounted once in the layout.
 * - Reveals every [data-reveal] element as it enters the viewport by setting
 *   [data-revealed] (an attribute, so React re-renders never strip it).
 * - IntersectionObserver handles visibility; no layout scans during scrolling.
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

    const collect = (scope: ParentNode = document) => {
      const elements = Array.from(scope.querySelectorAll("[data-reveal]:not([data-revealed])"));
      if (scope instanceof Element && scope.matches("[data-reveal]:not([data-revealed])")) elements.push(scope);
      elements.forEach((el) => {
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

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node instanceof Element) collect(node);
      }
    });
    mutations.observe(document.getElementById("root") ?? document.body, {
      childList: true,
      subtree: true,
    });

    const safetyTimer = window.setTimeout(sweep, 1200);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.clearTimeout(safetyTimer);
    };
  }, []);

  useEffect(() => {
    let mutations: MutationObserver | undefined;
    const scrollToHash = () => {
      const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
      if (!target) return false;
      target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      return true;
    };
    const id = requestAnimationFrame(() => {
      if (!hash) window.scrollTo(0, 0);
      else if (!scrollToHash()) {
        mutations = new MutationObserver(() => { if (scrollToHash()) mutations?.disconnect(); });
        mutations.observe(document.getElementById("root") ?? document.body, { childList: true, subtree: true });
      }
    });
    const expiry = window.setTimeout(() => mutations?.disconnect(), 10000);
    return () => { cancelAnimationFrame(id); mutations?.disconnect(); window.clearTimeout(expiry); };
  }, [pathname, hash]);
}
