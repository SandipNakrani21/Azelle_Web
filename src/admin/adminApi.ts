import { api, ApiError } from "@/lib/api";
import type { Address, OrderLine, OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/orders";
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

/** RBAC is a module × action matrix, e.g. "orders.update" (see server/src/rbac.js). */
export type ModuleKey = "dashboard" | "analytics" | "orders" | "customers" | "products" | "reviews" | "coupons" | "users" | "roles" | "settings";
export type Action = "view" | "add" | "update" | "delete" | "export";
export type Permission = `${ModuleKey}.${Action}`;

export type AdminSession = { email: string; name: string; role: string; owner: boolean; permissions: Permission[]; idleTimeoutMs: number };

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

// ── Orders ──────────────────────────────────────────────────────────────────

export type ShippingPartnerId = "shiprocket" | "delhivery" | "manual";

export type AdminOrder = {
  id: string;
  number: string;
  customer: { name: string; email: string; phone: string };
  address: Address;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  couponCode: string;
  tax: number;
  shipping: number;
  codFee: number;
  total: number;
  status: OrderStatus;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    gatewayOrderId: string;
    paymentId: string;
    paidAt: string | null;
    refundId: string;
    refundedAt: string | null;
  };
  shipment: {
    partner: ShippingPartnerId | "";
    courierName: string;
    awb: string;
    trackingUrl: string;
    partnerOrderId: string;
    partnerShipmentId: string;
    labelUrl: string;
    weightKg: number;
    lastStatus: string;
    lastSyncedAt: string | null;
  };
  cancelReason: string;
  adminNote: string;
  history: { at: string; status: string; note: string; by: string }[];
  acceptedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Parcel = { weightKg: number; length: number; breadth: number; height: number };
export type PartnerChoice = { id: ShippingPartnerId; label: string; configured: boolean };
export type CourierOption = { id: string; name: string; rate: number; etd: string; recommended: boolean };
export type ShippingOptions = {
  parcel: Parcel;
  options: { partner: "shiprocket" | "delhivery"; configured: boolean; serviceable: boolean; couriers: CourierOption[]; message?: string }[];
};

export type AcceptInput = {
  partner: ShippingPartnerId;
  courierId?: string;
  parcel: Parcel;
  manual?: { courierName: string; awb: string; trackingUrl: string };
};

export type OrderList = { orders: AdminOrder[]; total: number; page: number; pages: number; counts: Partial<Record<OrderStatus, number>> };

// ── Dashboard / customers / coupons / settings ──────────────────────────────
export type Dashboard = {
  today: { revenue: number; orders: number };
  week: { revenue: number; orders: number };
  month: { revenue: number; orders: number };
  allTime: { revenue: number; orders: number };
  averageOrderValue: number;
  counts: Partial<Record<OrderStatus, number>>;
  needsAction: { pending: number; toShip: number; awaitingPayment: number };
  chart: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: string; name: string; image: string; qty: number; revenue: number }[];
  recentOrders: AdminOrder[];
  customers: number;
  products: { total: number; active: number; soldOut: number };
};

export type AdminCustomer = {
  email: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  orders: number;
  spent: number;
  firstOrderAt: string;
  lastOrderAt: string;
};

export type AdminCoupon = {
  id: string;
  code: string;
  label: string;
  kind: "percent" | "flat" | "shipping";
  value: number;
  maxDiscount: number | null;
  minSubtotal: number;
  active: boolean;
  public: boolean;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  createdAt: string;
};

export type CouponInput = Omit<AdminCoupon, "id" | "usedCount" | "createdAt" | "expiresAt" | "maxDiscount" | "usageLimit" | "value" | "minSubtotal"> & {
  value: number | "";
  maxDiscount: number | "";
  minSubtotal: number | "";
  usageLimit: number | "";
  expiresAt: string;
};

export type Settings = {
  store: { gstRate: number; shippingFee: number; maxQtyPerLine: number; siteUrl: string };
  payments: { id: string; label: string; configured: boolean; environment: string; missing: string[]; webhookUrl: string; webhookReady: boolean }[];
  cod: { enabled: boolean; label: string; maxOrderValue: number; fee: number };
  analytics: { label: string; configured: boolean; environment: string; missing: string[]; refreshHours: number };
  shipping: {
    defaultPartner: string;
    pickup: { name: string; postcode: string };
    parcel: { weightPerSizeKg: Record<string, number>; packagingKg: number; dimensionsCm: { length: number; breadth: number; height: number }; hsnCode: string };
    partners: { id: string; label: string; configured: boolean; environment: string; missing: string[] }[];
  };
};

const orderPath = (id: string) => `/api/admin/orders/${encodeURIComponent(id)}`;
const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") search.set(k, String(v));
  const s = search.toString();
  return s ? `?${s}` : "";
};

export const adminCommerceApi = {
  dashboard: () => api<Dashboard>("/api/admin/dashboard"),

  listOrders: (params: { status?: string; q?: string; payment?: string; email?: string; page?: number }) =>
    api<OrderList>(`/api/admin/orders${query(params)}`),
  getOrder: (id: string) =>
    api<{ order: AdminOrder; partners: PartnerChoice[]; defaultPartner: ShippingPartnerId; defaultParcel: Parcel }>(orderPath(id)),
  shippingOptions: (id: string, parcel: Parcel) => api<ShippingOptions>(`${orderPath(id)}/shipping-options`, { method: "POST", json: { parcel } }),
  accept: (id: string, input: AcceptInput) => api<{ order: AdminOrder }>(`${orderPath(id)}/accept`, { method: "POST", json: input }),
  setStatus: (id: string, status: OrderStatus, extra: { note?: string; awb?: string } = {}) =>
    api<{ order: AdminOrder }>(`${orderPath(id)}/status`, { method: "POST", json: { status, ...extra } }),
  track: (id: string) => api<{ order: AdminOrder }>(`${orderPath(id)}/track`, { method: "POST" }),
  syncPayment: (id: string) => api<{ order: AdminOrder }>(`${orderPath(id)}/sync-payment`, { method: "POST" }),
  cancel: (id: string, reason: string, refund: boolean) =>
    api<{ order: AdminOrder; warnings: string[] }>(`${orderPath(id)}/cancel`, { method: "POST", json: { reason, refund } }),
  refund: (id: string) => api<{ order: AdminOrder }>(`${orderPath(id)}/refund`, { method: "POST", json: {} }),
  saveNote: (id: string, note: string) => api<{ order: AdminOrder }>(`${orderPath(id)}/note`, { method: "PUT", json: { note } }),

  listCustomers: (params: { q?: string; sort?: string; page?: number }) =>
    api<{ customers: AdminCustomer[]; total: number; page: number; pages: number }>(`/api/admin/customers${query(params)}`),

  listCoupons: () => api<{ coupons: AdminCoupon[] }>("/api/admin/coupons"),
  createCoupon: (input: CouponInput) => api<{ coupon: AdminCoupon }>("/api/admin/coupons", { method: "POST", json: input }),
  updateCoupon: (id: string, input: CouponInput) =>
    api<{ coupon: AdminCoupon }>(`/api/admin/coupons/${encodeURIComponent(id)}`, { method: "PUT", json: input }),
  deleteCoupon: (id: string) => api<{ ok: true }>(`/api/admin/coupons/${encodeURIComponent(id)}`, { method: "DELETE" }),

  settings: () => api<Settings>("/api/admin/settings"),
};

// ── Reviews ─────────────────────────────────────────────────────────────────
export type ReviewStatus = "pending" | "approved" | "hidden";
export type AdminReview = {
  id: string;
  product: { _id: string; name: string; slug: string; images: string[] } | null;
  rating: number;
  title: string;
  body: string;
  name: string;
  email: string;
  city: string;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  createdAt: string;
};

export const adminReviewsApi = {
  list: (params: { status?: string; q?: string; page?: number }) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) search.set(k, String(v));
    return api<{ reviews: AdminReview[]; total: number; page: number; pages: number; counts: Partial<Record<ReviewStatus, number>> }>(
      `/api/admin/reviews?${search}`,
    );
  },
  setStatus: (id: string, status: ReviewStatus) => api<{ review: AdminReview }>(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: "PATCH", json: { status } }),
  remove: (id: string) => api<{ ok: true }>(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ── Website analytics (Microsoft Clarity) ───────────────────────────────────
export type ClarityList = { label: string; value: number }[];
export type ClarityIssue = { sessions: number; percent: number };
export type Analytics = {
  clarity:
    | { configured: false }
    | {
        configured: true;
        test: boolean;
        projectId: string;
        dashboardUrl: string;
        refreshHours: number;
        fetchedAt: string | null;
        warning: string;
        last24h: {
          sessions: number;
          botSessions: number;
          users: number;
          pagesPerSession: number;
          engagementSeconds: { total: number; active: number };
          scrollDepth: number;
          issues: Record<"rageClicks" | "deadClicks" | "quickbacks" | "excessiveScroll" | "scriptErrors" | "errorClicks", ClarityIssue>;
          popularPages: ClarityList;
          devices: ClarityList;
          countries: ClarityList;
          browsers: ClarityList;
          referrers: ClarityList;
        } | null;
        history: { date: string; sessions: number; users: number }[];
      };
  orders24h: { orders: number; revenue: number };
  conversionRate: number | null;
};

export const adminAnalyticsApi = {
  get: (refresh = false) => api<Analytics>(`/api/admin/analytics${refresh ? "?refresh=1" : ""}`),
};

// ── Users & roles (RBAC) ────────────────────────────────────────────────────
export type ModuleInfo = { key: ModuleKey; label: string; group: string; actions: Action[]; notes?: Partial<Record<Action, string>> };
export type AdminRole = { id: string; name: string; description: string; permissions: Permission[]; userCount: number; key?: string; system?: boolean };
export type AdminUserRow = { id: string; name: string; email: string; role: { _id: string; name: string } | null; active: boolean; lastLoginAt: string | null; createdAt: string };
export type UserInput = { name: string; email: string; role: string; active: boolean; password: string };
export type RoleInput = { name: string; description: string; permissions: Permission[] };

export const adminUsersApi = {
  list: () => api<{ owner: { name: string; email: string; role: string }; users: AdminUserRow[] }>("/api/admin/users"),
  create: (input: UserInput) => api<{ user: AdminUserRow }>("/api/admin/users", { method: "POST", json: input }),
  update: (id: string, input: UserInput) => api<{ user: AdminUserRow }>(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PUT", json: input }),
  remove: (id: string) => api<{ ok: true }>(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  permissions: () => api<{ modules: ModuleInfo[]; actions: Action[] }>("/api/admin/users/permissions"),
  roles: () => api<{ roles: AdminRole[] }>("/api/admin/users/roles"),
  createRole: (input: RoleInput) => api<{ role: AdminRole }>("/api/admin/users/roles", { method: "POST", json: input }),
  updateRole: (id: string, input: RoleInput) => api<{ role: AdminRole }>(`/api/admin/users/roles/${encodeURIComponent(id)}`, { method: "PUT", json: input }),
  removeRole: (id: string) => api<{ ok: true }>(`/api/admin/users/roles/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/** Downloads a CSV export (the admin session cookie authorises it). */
export async function downloadCsv(path: string) {
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok) {
    let message = `Export failed (${response.status}).`;
    try {
      message = (await response.json()).error ?? message;
    } catch {
      // not JSON
    }
    throw new ApiError(message, response.status);
  }
  const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "azelle-export.csv";
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
