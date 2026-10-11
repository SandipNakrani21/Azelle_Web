import { Router } from "express";
import { readFile } from "node:fs/promises";
import { publicCatalogue } from "../services/catalogue.js";
import { publicStore } from "./store.js";
export const pagesRouter = Router();
function origin(req) {
  return (
    process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");
}
pagesRouter.get("/robots.txt", (req, res) =>
  res
    .type("text/plain")
    .send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /account\nDisallow: /checkout\nDisallow: /order/\nDisallow: /mock-payment/\nDisallow: /homenew\nSitemap: ${origin(req)}/sitemap.xml\n`,
    ),
);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char],
  );
pagesRouter.get("/sitemap.xml", async (req, res, next) => {
  try {
    const products = await publicCatalogue();
    const { publicPaths } =
      await import("../../../dist-server/entry-server.js");
    const paths = [
      ...publicPaths,
      ...products.map((product) => `/product/${product.slug}`),
    ];
    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escape(origin(req) + path)}</loc></url>`).join("")}</urlset>`,
      );
  } catch (error) {
    next(error);
  }
});
pagesRouter.get("/page", async (req, res, next) => {
  try {
    const path = String(req.query.path || "/");
    if (!path.startsWith("/") || path.startsWith("//"))
      return res.status(400).send("Invalid path");
    if (path.split("?")[0] === "/product/imperium-2")
      return res.redirect(301, "/product/imperium");
    const [products, store, template, module] = await Promise.all([
      publicCatalogue(),
      publicStore(),
      readFile(new URL("../../../dist/index.html", import.meta.url), "utf8"),
      import("../../../dist-server/entry-server.js"),
    ]);
    const rendered = await module.renderPage(
      path,
      products,
      store,
      origin(req),
    );
    res
      .set("Cache-Control", "no-store")
      .set(
        "X-Robots-Tag",
        module.pageMeta(path, products, origin(req), store.gstRate).robots,
      )
      .status(rendered.status)
      .type("html")
      .send(
        template
          .replace(/<title>[\s\S]*?<\/title>/, "")
          .replace(/<meta name="description"[^>]*\/>/, "")
          .replace("</head>", rendered.head + "</head>")
          .replace(
            '<div id="root"></div>',
            `<div id="root">${rendered.html}</div>${rendered.bootstrap}`,
          ),
      );
  } catch (error) {
    next(error);
  }
});
