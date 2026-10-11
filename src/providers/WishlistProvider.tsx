import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { trackEvent } from "@/lib/analytics";

// Saved ("loved") products. Kept in this browser, like the cart — there are no customer accounts yet.
const STORAGE_KEY = "azelle.wishlist";

type WishlistValue = {
  ids: string[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (productId: string) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistValue | null>(null);

function load(): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  const [restored, setRestored] = useState(false);
  useEffect(() => {
    setIds(load());
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Storage unavailable — the wishlist lasts for this visit.
    }
  }, [ids, restored]);

  const value = useMemo<WishlistValue>(() => {
    const set = new Set(ids);
    return {
      ids,
      count: ids.length,
      has: (id) => set.has(id),
      /** Adds or removes; returns true when the product is now saved. */
      toggle: (id) => {
        const saved = !set.has(id);
        setIds((list) =>
          saved
            ? [id, ...list.filter((x) => x !== id)]
            : list.filter((x) => x !== id),
        );
        trackEvent(saved ? "add_to_wishlist" : "remove_from_wishlist");
        return saved;
      },
      remove: (id) => setIds((list) => list.filter((x) => x !== id)),
      clear: () => setIds([]),
    };
  }, [ids]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistValue {
  const ctx = useContext(WishlistContext);
  if (!ctx)
    throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}

/** Used where the provider may be absent (e.g. the admin tree). */
export const useWishlistSafe = () => useContext(WishlistContext);
