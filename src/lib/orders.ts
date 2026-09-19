// Orders live on the server. The browser keeps each order's private access key (in localStorage)
// so the customer can reopen the order page; the tracking page recovers it with number + email/mobile.
import { api } from "@/lib/api";

export type OrderStatus =
  | "awaiting_payment"
  | "payment_failed"
  | "pending"
  | "accepted"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentMethod = "cashfree" | "razorpay" | "cod";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded" | "cod_pending" | "cod_collected";

export type OrderLine = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  sizeId: string;
  sizeLabel: string;
  qty: number;
  unit: number;
  total: number;
};

export type Address = { line1: string; line2: string; city: string; state: string; pincode: string; country: string };

export type Order = {
  number: string;
  status: OrderStatus;
  createdAt: string;
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
  payment: { method: PaymentMethod; status: PaymentStatus; paidAt: string | null };
  shipment: { courierName: string; awb: string; trackingUrl: string } | null;
  cancelReason: string;
  timeline: { at: string; status: OrderStatus }[];
};

/** What the browser needs to open Cashfree's or Razorpay's checkout. */
export type PaymentSession =
  /** Local test mode (dummy keys): a simulated Cashfree / Razorpay page on this site. */
  | { gateway: "mock"; provider: "cashfree" | "razorpay"; url: string }
  | { gateway: "cashfree"; mode: "sandbox" | "production"; paymentSessionId: string }
  | {
      gateway: "razorpay";
      keyId: string;
      razorpayOrderId: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      prefill: { name: string; email: string; contact: string };
      themeColor: string;
    };

export type CheckoutInput = {
  customer: { name: string; email: string; phone: string };
  address: { line1: string; line2: string; city: string; state: string; pincode: string };
  items: { productId: string; sizeId: string; qty: number }[];
  couponCode?: string;
  paymentMethod: "online" | "cod";
};

/** Customer-facing wording for each status. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  payment_failed: "Payment not completed",
  pending: "Pending",
  accepted: "Accepted",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cashfree: "Paid online (Cashfree)",
  razorpay: "Paid online (Razorpay)",
  cod: "Cash on delivery",
};

// ── Access keys kept on this device ─────────────────────────────────────────
const KEYS_STORAGE = "azelle.orderKeys";
type KeyEntry = { number: string; key: string; at: string };

function readKeys(): KeyEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEYS_STORAGE) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((e): e is KeyEntry => typeof e?.number === "string" && typeof e?.key === "string") : [];
  } catch {
    return [];
  }
}

export function rememberOrder(number: string, key: string) {
  try {
    const rest = readKeys().filter((e) => e.number !== number);
    localStorage.setItem(KEYS_STORAGE, JSON.stringify([{ number, key, at: new Date().toISOString() }, ...rest].slice(0, 30)));
  } catch {
    // Storage unavailable — the order page link (with ?key=) still works.
  }
}

export const orderKey = (number: string) => readKeys().find((e) => e.number === number)?.key ?? "";
export const rememberedOrders = () => readKeys();

// ── API ─────────────────────────────────────────────────────────────────────
export async function placeOrder(input: CheckoutInput) {
  const data = await api<{ order: Order; accessKey: string; payment: PaymentSession | null; paymentError: string }>("/api/orders", {
    method: "POST",
    json: input,
  });
  rememberOrder(data.order.number, data.accessKey);
  return data;
}

const orderPath = (number: string) => `/api/orders/${encodeURIComponent(number)}`;

export const fetchOrder = (number: string, key: string) => api<{ order: Order }>(`${orderPath(number)}?key=${encodeURIComponent(key)}`);

export const verifyPayment = (number: string, key: string, razorpay?: Record<string, string>) =>
  api<{ order: Order }>(`${orderPath(number)}/verify`, { method: "POST", json: { key, ...razorpay } });

export const retryPayment = (number: string, key: string) =>
  api<{ order: Order; payment: PaymentSession }>(`${orderPath(number)}/pay`, { method: "POST", json: { key } });

export async function lookupOrder(number: string, contact: string) {
  const data = await api<{ order: Order; accessKey: string }>("/api/orders/lookup", { method: "POST", json: { number, contact } });
  rememberOrder(data.order.number, data.accessKey);
  return data;
}
