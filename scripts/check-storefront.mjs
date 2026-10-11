import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  renderPage,
  pageMeta,
  publicPaths,
} from "../dist-server/entry-server.js";
const seed = JSON.parse(
  await readFile(
    new URL("../server/src/seed/products.json", import.meta.url),
    "utf8",
  ),
);
const products = seed
  .filter((product) => product.slug !== "imperium-2")
  .map((product, index) => ({
    ...product,
    id: String(index + 1),
    ratingCount: 0,
    ratingAvg: 0,
  }));
const store = {
  gstRate: 0.18,
  shippingFee: 100,
  maxQtyPerLine: 10,
  coupons: [],
  payments: {
    online: false,
    cod: { enabled: false, maxOrderValue: 0, fee: 0 },
  },
};
const origin = "https://store.example";
let checks = 0;
for (const product of products) {
  const path = `/product/${product.slug}`,
    meta = pageMeta(path, products, origin);
  const page = await renderPage(path, products, store, origin);
  assert.equal(page.status, 200);
  assert.ok(page.html.includes(product.name));
  assert.ok(page.html.includes(product.pyramid.top));
  assert.ok(page.html.includes("What will I pay?"));
  assert.ok(page.html.includes("including GST"));
  assert.ok(!page.html.includes("Loading page…"));
  assert.ok(page.head.includes(`href="${origin}${path}"`));
  const schema = meta.schema["@graph"].find(
    (item) => item["@type"] === "Product",
  );
  assert.equal(
    schema.offers[1].price,
    Math.round(product.prices["50"] * 1.18 * 100) / 100,
  );
  assert.equal(schema.aggregateRating, undefined);
  checks += 9;
}
for (const path of [
  "/admin",
  "/account",
  "/checkout",
  "/order/123",
  "/homenew",
  "/reset-password?token=secret",
  "/collection?note=Oud",
]) {
  assert.equal(pageMeta(path, products, origin).robots, "noindex,follow");
  checks++;
}
assert.equal(pageMeta("/product/missing", products, origin).status, 404);
checks++;
assert.equal(
  pageMeta("/product/imperium?size=100", products, origin).canonical,
  `${origin}/product/imperium`,
);
checks++;
assert.ok(publicPaths.includes("/pages/contact-us"));
checks++;
const malicious = products.map((product, index) =>
  index
    ? product
    : { ...product, description: "</script><script>alert(1)</script>" },
);
const safe = await renderPage(
  `/product/${malicious[0].slug}`,
  malicious,
  store,
  origin,
);
assert.ok(!safe.bootstrap.includes("</script><script>"));
checks++;
const homepage = await renderPage("/", products, store, origin);
assert.ok(homepage.html.includes("The Azelle promise"));
assert.ok(homepage.html.includes("/pages/our-story"));
checks += 2;
console.log(
  `${checks} storefront assertions passed: server HTML, product facts, taxes, metadata, private routes, safe bootstrap and home content.`,
);
