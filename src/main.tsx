import { PageErrorBoundary } from "./components/ui/PageErrorBoundary";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./providers/AuthProvider";
import { CartProvider } from "./providers/CartProvider";
import { ProductsProvider } from "./providers/ProductsProvider";
import { StoreProvider } from "./providers/StoreProvider";
import { WishlistProvider } from "./providers/WishlistProvider";
import "./index.css";
import "./styles/storefront-theme.css";
import "./pages/ProductDetails.css";
import "./styles/storefront.css";

const bootstrap = JSON.parse(
  document.getElementById("storefront-data")?.textContent ?? "null",
);
const element = document.getElementById("root")!;
const tree = (
  <StrictMode>
    <PageErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <StoreProvider initialConfig={bootstrap?.store}>
            <ProductsProvider initialProducts={bootstrap?.products}>
              <WishlistProvider>
                <CartProvider>
                  <App />
                </CartProvider>
              </WishlistProvider>
            </ProductsProvider>
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </PageErrorBoundary>
  </StrictMode>
);
if (bootstrap) hydrateRoot(element, tree);
else createRoot(element).render(tree);
