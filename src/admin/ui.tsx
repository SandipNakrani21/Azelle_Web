import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useAdminAuth } from "./AdminAuthProvider";
import { downloadCsv, type Permission } from "./adminApi";
import { IconDownload, IconEdit, IconEye, IconPlus, IconRefresh, IconTrash } from "./icons";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";
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

// Page header: gradient title, a line of explanation, and the page's actions on the right.
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="admin-rise flex flex-wrap items-end justify-between gap-5 pb-2">
      <div className="max-w-[62ch]">
        <h1 className="admin-title font-display text-[2.4rem] leading-none md:text-[2.9rem]">{title}</h1>
        {subtitle && <p className="mt-3 text-sm leading-relaxed text-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/**
 * The bar above a list: a search box on the left and any number of filters on the right.
 * Every list page uses it, so search and filters always sit in the same place.
 */
export function ListToolbar({
  query,
  onQuery,
  placeholder = "Search",
  children,
  right,
}: {
  query?: string;
  onQuery?: (value: string) => void;
  placeholder?: string;
  /** Filters (selects, chipsâ¦) shown beside the search box. */
  children?: ReactNode;
  /** Anything pinned to the far right, e.g. a result count. */
  right?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="admin-toolbar admin-rise mt-6 flex flex-col gap-3 rounded-[18px] p-3 md:flex-row md:items-center md:p-4">
      {onQuery && (
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-soft" width={18} height={18} aria-hidden="true" />
          <label htmlFor={id} className="sr-only">
            {placeholder}
          </label>
          <input id={id} type="search" value={query ?? ""} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} className="admin-search" />
        </div>
      )}
      {children}
      {right && <div className="shrink-0 text-[13px] text-soft md:ml-auto">{right}</div>}
    </div>
  );
}

/** A select styled to match the toolbar's search box. */
export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <div className="md:w-56">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="admin-search !pl-4">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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

/** 1 … 4 5 6 … 20 — always the first page, the last one and the pages around the current one (0 = gap). */
function pageNumbers(page: number, pages: number): number[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const near = [page - 1, page, page + 1].filter((n) => n > 1 && n < pages);
  const first = near[0] ?? 2;
  const last = near[near.length - 1] ?? pages - 1;
  return [1, ...(first > 2 ? [0] : []), ...near, ...(last < pages - 1 ? [0] : []), pages];
}

export function Pagination({ page, pages, total, onChange }: { page: number; pages: number; total?: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-7 flex flex-wrap items-center justify-center gap-2 text-sm">
      <button type="button" className="abtn abtn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Previous
      </button>
      {pageNumbers(page, pages).map((n, i) =>
        n === 0 ? (
          <span key={`gap-${i}`} className="px-1 text-soft" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            aria-label={`Page ${n}`}
            className={`admin-page-btn ${n === page ? "is-current" : ""}`}
          >
            {n}
          </button>
        ),
      )}
      <button type="button" className="abtn abtn-ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
      {total !== undefined && <span className="w-full text-center text-[12.5px] tabular-nums text-soft md:ml-2 md:w-auto">{total} in total</span>}
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

type ActionKind = "add" | "view" | "edit" | "delete" | "ghost" | "refresh";
const ACTION_ICON = { add: IconPlus, view: IconEye, edit: IconEdit, delete: IconTrash, refresh: IconRefresh, ghost: null } as const;

/** Admin action button: Add (gradient + shine), View (violet), Edit (blue), Delete (red), Ghost / Refresh (outline). */
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

/**
 * The same action as an icon on its own â an eye to look, a pencil to change, a bin to remove.
 * `label` is what a screen reader reads and what the tooltip shows.
 */
export function IconButton({ kind, label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { kind: ActionKind; label: string }) {
  const Icon = ACTION_ICON[kind];
  const style = kind === "refresh" ? "ghost" : kind;
  return (
    <button type="button" aria-label={label} title={label} {...props} className={`abtn abtn-icon abtn-${style} ${className}`}>
      {Icon && <Icon size={17} />}
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

/** "Export CSV" — shown only when the role has the module's export permission. */
export function ExportButton({ path, perm, label = "Export CSV" }: { path: string; perm: Permission; label?: string }) {
  const { can, guard } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!can(perm)) return null;
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      await guard(downloadCsv(path));
    } catch (err) {
      if (!isUnauthorized(err)) setError(messageOf(err, "Export failed."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" className="abtn abtn-ghost" onClick={() => void run()} disabled={busy}>
        <IconDownload size={16} />
        {busy ? "Preparing…" : label}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-[12px] text-[#b3261e]">
          {error}
        </span>
      )}
    </span>
  );
}
