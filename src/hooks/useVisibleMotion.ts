import { useEffect } from "react";

const MOTION = ".marquee,.slide-track,.bottle-lean-left,.bottle-lean-right,.float-a,.float-b,.petal,.wave__parallax";

export function useVisibleMotion() {
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;
    const tracked = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.setAttribute("data-motion-active", String(entry.isIntersecting));
    }, { rootMargin: "100px 0px" });
    const collect = (node: Element) => {
      const found = Array.from(node.querySelectorAll(MOTION));
      if (node.matches(MOTION)) found.push(node);
      for (const el of found) if (!tracked.has(el)) {
        tracked.add(el);
        el.setAttribute("data-motion-active", "false");
        observer.observe(el);
      }
    };
    collect(root);
    const mutations = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) collect(node);
      for (const el of tracked) if (!el.isConnected) { observer.unobserve(el); tracked.delete(el); }
    });
    mutations.observe(root, { childList: true, subtree: true });
    const visibility = () => document.documentElement.toggleAttribute("data-motion-suspended", document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); mutations.disconnect(); document.removeEventListener("visibilitychange", visibility); document.documentElement.removeAttribute("data-motion-suspended"); };
  }, []);
}
