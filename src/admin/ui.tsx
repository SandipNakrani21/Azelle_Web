import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { IconEdit, IconPlus, IconRefresh, IconTrash } from "./icons";
import { CloseIcon } from "@/components/ui/Icons";
import { ApiError } from "@/lib/api";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/orders";

// Small building blocks shared by the admin screens.

export const isUnauthorized = (err: unknown) => err instanceof ApiError && err.status === 401;
export const messageOf = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export type Notice = { tone: "success" | "error"; text: string };

/** A dismissible message; success messages fade after 5 seconds. */
export function useNotice(initial: Notice | null = null) {
  const [notice, setNotice] = useState<Notice | null>(initial);
  useEffect(() => {
    if (notice?.tone !== "success") return;
    const t = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [notice]);
  return [notice, setNotice] as const;
}

export function NoticeBanner({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  if (!notice) return null;
  return (
    <div
      role={notice.tone === "error" ? "alert" : "status"}
      className={`mt-6 flex items-start justify-between gap-4 rounded-[12px] px-4 py-3 text-sm text-white ${notice.tone === "success" ? "bg-[#2f7d4f]" : "bg-[#b3261e]"}`}
    >
      <p>{notice.text}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="-m-1 grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/15">
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  );
}

// Page header: small eyebrow, gradient title, optional actions on the right.
export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="admin-rise flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-soft">{eyebrow}</p>
        <h1 className="admin-title mt-1 font-display text-[2.4rem] leading-none md:text-[2.9rem]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", delay = 0 }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string; delay?: number }) {
  return (
    <section className={`admin-card admin-rise rounded-[20px] p-5 md:p-6 ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-[12px] font-bold uppercase tracking-[0.18em]">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  payment_failed: "Payment failed",
  pending: "Pending",
  accepted: "Accepted",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: "bg-[#ece8e1] text-[#5b5249]",
  payment_failed: "bg-[#f6dedb] text-[#8c1d18]",
  pending: "bg-[#fbecc8] text-[#7a5200]",
  accepted: "bg-[#dfe9f7] text-[#1f4f8f]",
  shipped: "bg-[#e6e1f6] text-[#4a3a8c]",
  delivered: "bg-[#dcefe2] text-[#1f6a3c]",
  cancelled: "bg-[#f6dedb] text-[#8c1d18]",
  returned: "bg-[#efe3d6] text-[#6d4524]",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${STATUS_STYLES[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

const PAYMENT_TEXT: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  cod_pending: "COD — to collect",
  cod_collected: "COD — collected",
};
const METHOD_TEXT: Record<PaymentMethod, string> = { cashfree: "Cashfree", razorpay: "Razorpay", cod: "Cash on delivery" };

export function paymentSummary(payment: { method: PaymentMethod; status: PaymentStatus }) {
  return payment.method === "cod" ? PAYMENT_TEXT[payment.status] : `${METHOD_TEXT[payment.method]} · ${PAYMENT_TEXT[payment.status]}`;
}
export const methodLabel = (m: PaymentMethod) => METHOD_TEXT[m];

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-3 text-sm">
      <button type="button" className="abtn abtn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Previous
      </button>
      <span className="tabular-nums">
        Page {page} of {pages}
      </span>
      <button type="button" className="abtn abtn-ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </nav>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-[18px] border border-dashed border-line bg-surface px-6 py-14 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

type ActionKind = "add" | "edit" | "delete" | "ghost" | "refresh";
const ACTION_ICON = { add: IconPlus, edit: IconEdit, delete: IconTrash, refresh: IconRefresh, ghost: null } as const;

/** Admin action button: Add (gradient + shine), Edit (blue), Delete (red), Ghost / Refresh (outline). */
export function ActionButton({ kind, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { kind: ActionKind }) {
  const Icon = ACTION_ICON[kind];
  const style = kind === "refresh" ? "ghost" : kind;
  return (
    <button type="button" {...props} className={`abtn abtn-${style} ${className}`}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

/** Counts up to `value` (from the previous value) — instant with reduced motion. */
export function useCountUp(value: number, duration = 1100) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(origin + (value - origin) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return shown;
}
