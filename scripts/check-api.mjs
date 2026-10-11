import assert from "node:assert/strict";
const origin = process.env.TEST_API_URL || "http://localhost:4000";
const get = (path) => fetch(origin + path);
const post = (path, json) =>
  fetch(origin + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
const catalogue = await (await get("/api/products")).json();
assert.equal((await get("/api/products/imperium-2")).status, 404);
assert.ok(catalogue.products.length >= 5);
assert.ok(!catalogue.products.some((product) => product.slug === "imperium-2"));
const imperium = catalogue.products.find(
  (product) => product.slug === "imperium",
);
const reviews = await (await get(`/api/reviews?product=${imperium.id}`)).json();
assert.equal(reviews.summary.count, imperium.ratingCount);
assert.equal((await get("/api/admin/support")).status, 401);
assert.equal(
  (
    await post("/api/support", {
      kind: "contact",
      name: "QA",
      email: "bad",
      message: "",
    })
  ).status,
  400,
);
assert.equal(
  (
    await post("/api/support", {
      kind: "gst",
      name: "QA",
      email: "qa@example.com",
    })
  ).status,
  400,
);
assert.equal(
  (
    await post("/api/account/reset-password", {
      token: "invalid",
      password: "invalid",
    })
  ).status,
  400,
);
const robots = await (await get("/api/robots.txt")).text();
assert.ok(robots.includes("Disallow: /admin"));
const sitemap = await (await get("/api/sitemap.xml")).text();
assert.ok(sitemap.includes("/product/imperium</loc>"));
assert.ok(!sitemap.includes("imperium-2"));
const html = await (await get("/api/page?path=/product/imperium")).text();
assert.ok(html.includes("application/ld+json"));
assert.ok(html.includes("What will I pay?"));
assert.equal((await get("/api/page?path=/no-such-page")).status, 404);
console.log(
  "API checks passed: public catalogue, review summary, support validation/access, reset validation, robots, sitemap and production page rendering.",
);
