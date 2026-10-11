import type { Product } from "./products";
import { INFO_PAGES, COMPANY } from "../content/infoPages";
export function pageMeta(
  path: string,
  products: Product[],
  origin: string,
  gstRate = 0.18,
) {
  const url = new URL(path, origin),
    pathname = url.pathname;
  const product = products.find((item) => pathname === `/product/${item.slug}`);
  const info = INFO_PAGES[pathname.split("/")[2]];
  const publicPage =
    pathname === "/" ||
    pathname === "/collection" ||
    Boolean(product) ||
    Boolean(info && pathname.startsWith("/pages/"));
  const title = product
    ? `${product.name} Perfume · ${product.family} | Azelle`
    : info
      ? `${info.title} | Azelle`
      : pathname === "/collection"
        ? "Shop Perfume Extracts & Oud Fragrances | Azelle"
        : "Azelle — Fragrance Beyond Words";
  const description = (
    product
      ? `${product.description} Notes: ${product.notes}. Available in 30 ml, 50 ml and 100 ml.`
      : info
        ? info.intro
        : "Discover Azelle’s small-batch perfume extracts, from rich oud and warm amber to fresh citrus. Crafted in India. Explore the collection."
  ).slice(0, 180);
  const canonical = new URL(pathname, origin).href;
  const image = new URL(
    product
      ? [
          "imperium",
          "conqueror",
          "white-oud",
          "urban-voyage",
          "desire-edge",
        ].includes(product.slug)
        ? `/images/products/${product.slug}-matched-bottle.webp`
        : product.images[0] || "/images/hero-poster.webp"
      : "/images/hero-poster.webp",
    origin,
  ).href;
  const organization = {
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: COMPANY.legalName,
    url: origin,
    email: COMPANY.email,
    telephone: COMPANY.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "C-1201, Kiran Classic Towers-2, Nani Ved, Katargam",
      addressLocality: "Surat",
      addressRegion: "Gujarat",
      postalCode: "395004",
      addressCountry: "IN",
    },
  };
  const graph: object[] = [
    organization,
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      url: origin,
      name: "Azelle",
      publisher: { "@id": `${origin}/#organization` },
    },
  ];
  if (product) {
    graph.push({
      "@type": "Product",
      name: product.name,
      description: product.description,
      image,
      brand: { "@type": "Brand", name: "Azelle" },
      category: product.family,
      url: canonical,
      offers: ["30", "50", "100"].map((size) => ({
        "@type": "Offer",
        name: `${size} ml`,
        url: `${canonical}?size=${size}`,
        price:
          Math.round(
            product.prices[size as keyof Product["prices"]] *
              (1 + gstRate) *
              100,
          ) / 100,
        priceCurrency: "INR",
        availability: `https://schema.org/${product.inStock ? "InStock" : "OutOfStock"}`,
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@id": `${origin}/#organization` },
      })),
      ...(product.ratingCount
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: product.ratingAvg,
              reviewCount: product.ratingCount,
            },
          }
        : {}),
    });
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Home", item: origin },
        { name: "Collection", item: `${origin}/collection` },
        { name: product.name, item: canonical },
      ].map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        ...item,
      })),
    });
  }
  return {
    title,
    description,
    canonical,
    image,
    robots:
      publicPage && !(pathname === "/collection" && url.search)
        ? "index,follow"
        : "noindex,follow",
    status:
      !publicPage &&
      !/^\/(admin|account|checkout|wishlist|order|forgot-password|reset-password|mock-payment|homenew)(\/|$)/.test(
        pathname,
      )
        ? 404
        : 200,
    schema: { "@context": "https://schema.org", "@graph": graph },
  };
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function metaHtml(meta: ReturnType<typeof pageMeta>) {
  return `<title>${escape(meta.title)}</title><meta name="description" content="${escape(meta.description)}"><link rel="canonical" href="${escape(meta.canonical)}"><meta name="robots" content="${meta.robots}"><meta property="og:type" content="website"><meta property="og:title" content="${escape(meta.title)}"><meta property="og:description" content="${escape(meta.description)}"><meta property="og:url" content="${escape(meta.canonical)}"><meta property="og:image" content="${escape(meta.image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(meta.title)}"><meta name="twitter:description" content="${escape(meta.description)}"><meta name="twitter:image" content="${escape(meta.image)}"><script type="application/ld+json">${JSON.stringify(meta.schema).replace(/</g, "\\u003c")}</script>`;
}
