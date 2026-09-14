import { api } from "@/lib/api";
import type { FragranceFamily, Product, SizePrices } from "@/lib/products";

export type ProductStatus = "active" | "inactive";

export type AdminProduct = Product & { status: ProductStatus; createdAt: string; updatedAt: string };

export type ProductInput = {
  name: string;
  slug: string;
  family: string;
  group: FragranceFamily | "";
  families: FragranceFamily[];
  prices: SizePrices;
  notes: string;
  pyramid: { top: string; heart: string; base: string };
  description: string;
  tagline: string;
  concentration: string;
  perfumeOil: number | null;
  longevity: string;
  highlights: string[];
  images: string[];
  tint: string;
  inStock: boolean;
  status: ProductStatus;
};

export type AdminSession = { email: string; idleTimeoutMs: number };

const productPath = (id: string) => `/api/admin/products/${encodeURIComponent(id)}`;

export const adminApi = {
  session: () => api<AdminSession>("/api/admin/session"),
  login: (email: string, password: string) => api<AdminSession>("/api/admin/login", { method: "POST", json: { email, password } }),
  logout: () => api<{ ok: true }>("/api/admin/logout", { method: "POST" }),

  listProducts: ({ q = "", status = "" }: { q?: string; status?: ProductStatus | "" } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const query = params.toString();
    return api<{ products: AdminProduct[] }>(`/api/admin/products${query ? `?${query}` : ""}`);
  },
  getProduct: (id: string) => api<{ product: AdminProduct }>(productPath(id)),
  createProduct: (input: ProductInput) => api<{ product: AdminProduct }>("/api/admin/products", { method: "POST", json: input }),
  updateProduct: (id: string, input: ProductInput) => api<{ product: AdminProduct }>(productPath(id), { method: "PUT", json: input }),
  setStatus: (id: string, status: ProductStatus) =>
    api<{ product: AdminProduct }>(`${productPath(id)}/status`, { method: "PATCH", json: { status } }),
  deleteProduct: (id: string) => api<{ ok: true }>(productPath(id), { method: "DELETE" }),

  uploadImage: (file: File) => {
    const body = new FormData();
    body.append("image", file);
    return api<{ url: string }>("/api/admin/products/uploads", { method: "POST", body });
  },
};
