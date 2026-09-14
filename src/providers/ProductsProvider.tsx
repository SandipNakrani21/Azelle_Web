import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/products";

type LoadStatus = "loading" | "ready" | "error";

type ProductsContextValue = {
  products: Product[];
  status: LoadStatus;
  error: string;
  reload: () => void;
  getById: (id: string) => Product | undefined;
  getBySlug: (slug: string) => Product | undefined;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

// Loads the live catalogue. The API only returns active, non-deleted products.
export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setStatus((current) => (current === "ready" ? current : "loading"));
    try {
      const data = await api<{ products: Product[] }>("/api/products");
      setProducts(data.products);
      setStatus("ready");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the collection.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<ProductsContextValue>(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    return {
      products,
      status,
      error,
      reload: () => void load(),
      getById: (id) => byId.get(id),
      getBySlug: (slug) => bySlug.get(slug),
    };
  }, [products, status, error, load]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used inside <ProductsProvider>");
  return ctx;
}
