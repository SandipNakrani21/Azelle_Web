import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./providers/AuthProvider";
import { StoreProvider, type StoreConfig } from "./providers/StoreProvider";
import { ProductsProvider } from "./providers/ProductsProvider";
import { WishlistProvider } from "./providers/WishlistProvider";
import { CartProvider } from "./providers/CartProvider";
import type { Product } from "./lib/products";
import { pageMeta, metaHtml } from "./lib/pageMeta";
import { INFO_PAGES } from "./content/infoPages";
export { pageMeta };
export const publicPaths = [
  "/",
  "/collection",
  ...Object.keys(INFO_PAGES).map((slug) => `/pages/${slug}`),
];
export async function renderPage(
  path: string,
  products: Product[],
  store: StoreConfig,
  origin: string,
) {
  const meta = pageMeta(path, products, origin, store.gstRate);
  const html = await new Promise<string>((resolve, reject) => {
    let result = "",
      failed = false;
    const output = new PassThrough();
    output.on("data", (chunk) => (result += chunk.toString()));
    output.on("end", () => {
      if (!failed) resolve(result);
    });
    output.on("error", reject);
    const stream = renderToPipeableStream(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <StoreProvider initialConfig={store}>
            <ProductsProvider initialProducts={products}>
              <WishlistProvider>
                <CartProvider>
                  <App />
                </CartProvider>
              </WishlistProvider>
            </ProductsProvider>
          </StoreProvider>
        </AuthProvider>
      </MemoryRouter>,
      {
        onAllReady() {
          stream.pipe(output);
        },
        onError(error) {
          failed = true;
          reject(error);
        },
      },
    );
    const timer = setTimeout(() => {
      stream.abort();
      reject(new Error("Page rendering timed out"));
    }, 15000);
    output.on("end", () => clearTimeout(timer));
    output.on("error", () => clearTimeout(timer));
  });
  return {
    html,
    head: metaHtml(meta),
    status: meta.status,
    bootstrap: `<script id="storefront-data" type="application/json">${JSON.stringify({ products, store }).replace(/</g, "\\u003c")}</script>`,
  };
}
