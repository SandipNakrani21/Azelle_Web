// Order stubs. `placeOrder` / `getOrder` become API calls later; for now
// orders live in localStorage on this device. Card details are never passed here.

export type OrderLine = {
  key: string;
  productId: string;
  name: string;
  sizeLabel: string;
  qty: number;
  unit: number;
  total: number;
};

export type Address = {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  country: string;
};

export type OrderInput = {
  email: string;
  phone: string;
  name: string;
  address: Address;
  lines: OrderLine[];
  subtotal: number;
  /** Coupon discount on the product subtotal (older orders may not have it). */
  discount?: number;
  couponCode?: string;
  tax: number;
  shipping: number;
  total: number;
};

export type Order = OrderInput & { id: string; createdAt: string };

const STORAGE_KEY = "azelle.orders";

function readAll(): Order[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

export async function placeOrder(input: OrderInput): Promise<Order> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const order: Order = {
    ...input,
    id: `AZ-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([order, ...readAll()].slice(0, 20)));
  } catch {
    // Storage unavailable — the confirmation page will show "not found" on refresh.
  }
  return order;
}

export function getOrder(id: string): Order | undefined {
  return readAll().find((o) => o.id === id);
}
