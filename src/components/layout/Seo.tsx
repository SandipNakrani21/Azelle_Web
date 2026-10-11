import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useProducts } from "@/providers/ProductsProvider";
import { useStore } from "@/providers/StoreProvider";
import { pageMeta, metaHtml } from "@/lib/pageMeta";
export function Seo() {
  const location = useLocation(),
    { products } = useProducts(),
    { gstRate } = useStore();
  useEffect(() => {
    const meta = pageMeta(
      location.pathname + location.search,
      products,
      window.location.origin,
      gstRate,
    );
    document.head
      .querySelectorAll(
        'title,meta[name="description"],meta[name="robots"],link[rel="canonical"],meta[property^="og:"],meta[name^="twitter:"],script[type="application/ld+json"]',
      )
      .forEach((item) => item.remove());
    const template = document.createElement("template");
    template.innerHTML = metaHtml(meta);
    document.head.append(template.content);
  }, [location.pathname, location.search, products, gstRate]);
  return null;
}
