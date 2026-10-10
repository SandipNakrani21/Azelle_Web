import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const HomeLower = lazy(() => import("./HomeLower"));
export function DeferredHome({ catalogueReady }: { catalogueReady: boolean }) {
  const { hash } = useLocation();
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(Boolean(hash));
  useEffect(() => {
    if (hash) setReady(true);
    if (ready || !catalogueReady || !host.current) return;
    if (!("IntersectionObserver" in window)) { setReady(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setReady(true); observer.disconnect(); }
    }, { rootMargin: "400px 0px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [ready, hash, catalogueReady]);
  return <div ref={host} className="home-lower"><Suspense fallback={<div className="home-loading-space" aria-hidden="true" />}>{ready ? <HomeLower /> : <div className="home-loading-space" aria-hidden="true" />}</Suspense></div>;
}
