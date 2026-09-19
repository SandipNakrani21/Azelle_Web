import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { trackEvent } from "@/lib/analytics";
import { api } from "@/lib/api";
import { evaluateCoupon, isCoupon, type Coupon } from "@/lib/coupons";
import {
  DEFAULT_SIZE_ID,
  cartKey,
  formatPrice,
  getSize,
  unitPrice,
  type CartLine,
  type Product,
  type Size,
} from "@/lib/products";
import { useProducts } from "./ProductsProvider";
import { useStore } from "./StoreProvider";

const STORAGE_KEY = "azelle.cart";
const COUPON_KEY = "azelle.coupon";

type State = { lines: CartLine[]; isOpen: boolean; coupon: Coupon | null };

/** Most of one product/size per order (server: commerce.config.js → store.maxQtyPerLine). */
const MAX_QTY = 10;

type Action =
  | { type: "add"; productId: string; sizeId: Size["id"]; qty: number }
  | { type: "inc" | "dec" | "remove"; key: string }
  | { type: "open" | "close" | "clear" }
  | { type: "coupon"; coupon: Coupon | null }
  | { type: "prune"; validIds: Set<string> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add": {
      const key = cartKey(action.productId, action.sizeId);
      const exists = state.lines.some((l) => l.key === key);
      const lines = exists
        ? state.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + action.qty) } : l))
        : [...state.lines, { key, productId: action.productId, sizeId: action.sizeId, qty: Math.min(MAX_QTY, action.qty) }];
      return { ...state, lines, isOpen: true };
    }
    case "inc":
      return {
        ...state,
        lines: state.lines.map((l) => (l.key === action.key ? { ...l, qty: Math.min(MAX_QTY, l.qty + 1) } : l)),
      };
    case "dec":
      return {
        ...state,
        lines: state.lines.flatMap((l) =>
          l.key !== action.key ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : [],
        ),
      };
    case "remove":
      return { ...state, lines: state.lines.filter((l) => l.key !== action.key) };
    case "open":
      return { ...state, isOpen: true };
    case "close":
      return { ...state, isOpen: false };
    case "clear":
      return { lines: [], isOpen: false, coupon: null };
    case "coupon":
      return { ...state, coupon: action.coupon };
    case "prune":
      return { ...state, lines: state.lines.filter((l) => action.validIds.has(l.productId)) };
  }
}

// Shape-only validation; lines for products that are no longer live are pruned once the catalogue loads.
function loadLines(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l?.key === "string" &&
        typeof l?.productId === "string" &&
        typeof l?.qty === "number" &&
        l.qty > 0 &&
        ["30", "50", "100"].includes(l.sizeId),
    );
  } catch {
    return [];
  }
}

function loadCoupon(): Coupon | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(COUPON_KEY) ?? "null");
    return isCoupon(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type DetailedLine = CartLine & { product: Product; size: Size; unit: number; total: number };
export type CouponFeedback = { ok: boolean; message: string };

type CartContextValue = {
  lines: DetailedLine[];
  count: number;
  subtotal: number;
  /** Coupon discount on the product subtotal. */
  discount: number;
  /** GST on the discounted product price. */
  tax: number;
  shipping: number;
  total: number;
  /** The applied coupon, if any. */
  coupon: Coupon | null;
  /** Rupees still needed for the applied coupon to take effect (0 when it's active). */
  couponShortfall: number;
  freeShipping: boolean;
  /** GST rate and flat shipping fee from the server (for labels). */
  gstRate: number;
  shippingFee: number;
  isOpen: boolean;
  add: (productId: string, sizeId?: Size["id"], qty?: number) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  applyCoupon: (code: string) => Promise<CouponFeedback>;
  removeCoupon: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, status, getById } = useProducts();
  const store = useStore();
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ lines: loadLines(), isOpen: false, coupon: loadCoupon() }));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
    } catch {
      // Storage unavailable; the cart still works for this visit.
    }
  }, [state.lines]);

  useEffect(() => {
    try {
      if (state.coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(state.coupon));
      else localStorage.removeItem(COUPON_KEY);
    } catch {
      // Storage unavailable; the coupon lasts for this visit only.
    }
  }, [state.coupon]);

  // Drop lines whose product was deleted or deactivated.
  useEffect(() => {
    if (status !== "ready") return;
    const validIds = new Set(products.map((p) => p.id));
    if (state.lines.some((l) => !validIds.has(l.productId))) dispatch({ type: "prune", validIds });
  }, [status, products, state.lines]);

  const add = useCallback(
    (productId: string, sizeId: Size["id"] = DEFAULT_SIZE_ID, qty = 1) => {
      trackEvent("add_to_cart");
      dispatch({ type: "add", productId, sizeId, qty });
    },
    [],
  );
  const inc = useCallback((key: string) => dispatch({ type: "inc", key }), []);
  const dec = useCallback((key: string) => dispatch({ type: "dec", key }), []);
  const remove = useCallback((key: string) => dispatch({ type: "remove", key }), []);
  // Storage is cleared right away (not in an effect): checkout may leave the site for the payment
  // page straight after, before effects get a chance to run.
  const clear = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "[]");
      localStorage.removeItem(COUPON_KEY);
    } catch {
      // Storage unavailable; the in-memory cart is still cleared.
    }
    dispatch({ type: "clear" });
  }, []);
  const removeCoupon = useCallback(() => dispatch({ type: "coupon", coupon: null }), []);
  const openCart = useCallback(() => dispatch({ type: "open" }), []);
  const closeCart = useCallback(() => dispatch({ type: "close" }), []);

  const value = useMemo<CartContextValue>(() => {
    const lines = state.lines.flatMap((line) => {
      const product = getById(line.productId);
      if (!product) return [];
      const unit = unitPrice(product, line.sizeId);
      return [{ ...line, product, size: getSize(line.sizeId), unit, total: unit * line.qty }];
    });
    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);

    // Coupon: discount comes off the product price; GST is charged on the discounted price; the flat
    // shipping charge applies when the cart has items, unless a free-shipping coupon is active.
    // Rates and coupons come from the server, which re-checks all of this when the order is placed.
    const coupon = state.coupon ? store.coupons.find((c) => c.code === state.coupon?.code) ?? state.coupon : null;
    const result = coupon && lines.length > 0 ? evaluateCoupon(coupon, subtotal) : null;
    const discount = result?.discount ?? 0;
    const freeShipping = Boolean(result?.freeShipping);
    const tax = round2((subtotal - discount) * store.gstRate);
    const shipping = lines.length > 0 && !freeShipping ? store.shippingFee : 0;

    const applyCoupon = async (raw: string): Promise<CouponFeedback> => {
      const code = raw.trim().toUpperCase();
      if (!code) return { ok: false, message: "Enter a coupon code." };
      let found = store.coupons.find((c) => c.code === code);
      if (!found) {
        // Not in the public list — it may be a hidden code, so ask the server.
        try {
          found = (await api<{ coupon: Coupon }>("/api/store/coupon", { method: "POST", json: { code } })).coupon;
        } catch (err) {
          return { ok: false, message: err instanceof Error ? err.message : `"${code}" isn't a valid coupon code.` };
        }
      }
      const check = evaluateCoupon(found, subtotal);
      if (check.shortfall > 0) return { ok: false, message: `Add ${formatPrice(check.shortfall)} more to use ${found.code}.` };
      dispatch({ type: "coupon", coupon: found });
      return {
        ok: true,
        message: found.kind === "shipping" ? `${found.code} applied — shipping is free.` : `${found.code} applied — you save ${formatPrice(check.discount)}.`,
      };
    };

    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      subtotal,
      discount,
      tax,
      shipping,
      total: round2(subtotal - discount + tax + shipping),
      coupon,
      couponShortfall: result?.shortfall ?? 0,
      freeShipping,
      gstRate: store.gstRate,
      shippingFee: store.shippingFee,
      isOpen: state.isOpen,
      add,
      inc,
      dec,
      remove,
      clear,
      applyCoupon,
      removeCoupon,
      openCart,
      closeCart,
    };
  }, [state, store, getById, add, inc, dec, remove, clear, removeCoupon, openCart, closeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
