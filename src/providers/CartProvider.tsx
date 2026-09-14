import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { evaluateCoupon, findCoupon, type Coupon } from "@/lib/coupons";
import {
  DEFAULT_SIZE_ID,
  SHIPPING,
  TAX_RATE,
  cartKey,
  formatPrice,
  getSize,
  unitPrice,
  type CartLine,
  type Product,
  type Size,
} from "@/lib/products";
import { useProducts } from "./ProductsProvider";

const STORAGE_KEY = "azelle.cart";
const COUPON_KEY = "azelle.coupon";

type State = { lines: CartLine[]; isOpen: boolean; coupon: string | null };

type Action =
  | { type: "add"; productId: string; sizeId: Size["id"]; qty: number }
  | { type: "inc" | "dec" | "remove"; key: string }
  | { type: "open" | "close" | "clear" }
  | { type: "coupon"; code: string | null }
  | { type: "prune"; validIds: Set<string> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add": {
      const key = cartKey(action.productId, action.sizeId);
      const exists = state.lines.some((l) => l.key === key);
      const lines = exists
        ? state.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + action.qty } : l))
        : [...state.lines, { key, productId: action.productId, sizeId: action.sizeId, qty: action.qty }];
      return { ...state, lines, isOpen: true };
    }
    case "inc":
      return {
        ...state,
        lines: state.lines.map((l) => (l.key === action.key ? { ...l, qty: l.qty + 1 } : l)),
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
      return { ...state, coupon: action.code };
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

function loadCoupon(): string | null {
  try {
    const code = localStorage.getItem(COUPON_KEY);
    return code && findCoupon(code) ? code : null;
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
  isOpen: boolean;
  add: (productId: string, sizeId?: Size["id"], qty?: number) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  applyCoupon: (code: string) => CouponFeedback;
  removeCoupon: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, status, getById } = useProducts();
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
      if (state.coupon) localStorage.setItem(COUPON_KEY, state.coupon);
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
    (productId: string, sizeId: Size["id"] = DEFAULT_SIZE_ID, qty = 1) =>
      dispatch({ type: "add", productId, sizeId, qty }),
    [],
  );
  const inc = useCallback((key: string) => dispatch({ type: "inc", key }), []);
  const dec = useCallback((key: string) => dispatch({ type: "dec", key }), []);
  const remove = useCallback((key: string) => dispatch({ type: "remove", key }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const removeCoupon = useCallback(() => dispatch({ type: "coupon", code: null }), []);
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

    // Coupon: discount comes off the product price; GST (18%) is charged on the discounted price;
    // the flat shipping charge applies when the cart has items, unless a free-shipping coupon is active.
    const coupon = state.coupon ? findCoupon(state.coupon) ?? null : null;
    const result = coupon && lines.length > 0 ? evaluateCoupon(coupon, subtotal) : null;
    const discount = result?.discount ?? 0;
    const freeShipping = Boolean(result?.freeShipping);
    const tax = round2((subtotal - discount) * TAX_RATE);
    const shipping = lines.length > 0 && !freeShipping ? SHIPPING : 0;

    const applyCoupon = (raw: string): CouponFeedback => {
      const code = raw.trim().toUpperCase();
      if (!code) return { ok: false, message: "Enter a coupon code." };
      const found = findCoupon(code);
      if (!found) return { ok: false, message: `"${code}" isn't a valid coupon code.` };
      const check = evaluateCoupon(found, subtotal);
      if (check.shortfall > 0) return { ok: false, message: `Add ${formatPrice(check.shortfall)} more to use ${found.code}.` };
      dispatch({ type: "coupon", code: found.code });
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
  }, [state, getById, add, inc, dec, remove, clear, removeCoupon, openCart, closeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
