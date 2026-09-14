import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open traps, innermost last. Only the top one reacts to keys, so a popup opened over
// another (e.g. the coupon list over the cart) closes on Escape without closing both.
const openTraps: HTMLElement[] = [];

/**
 * While `open`: moves focus into the panel, traps Tab inside it, closes on
 * Escape and locks body scroll. On close, focus returns to the trigger.
 * `onClose` must be stable (useCallback) — it is an effect dependency.
 */
export function useFocusTrap(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    openTraps.push(panel);

    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    (focusables()[0] ?? panel).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (openTraps[openTraps.length - 1] !== panel) return;
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      const index = openTraps.lastIndexOf(panel);
      if (index !== -1) openTraps.splice(index, 1);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      trigger?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, panelRef]);
}
