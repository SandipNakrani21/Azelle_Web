import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bottle } from "@/components/ui/Bottle";
import { fieldClass } from "@/components/ui/Field";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";
import { Modal } from "@/components/ui/Modal";
import { StockBadge } from "@/components/ui/StockBadge";
import { ApiError } from "@/lib/api";
import { sized } from "@/lib/images";
import { formatPrice } from "@/lib/products";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminApi, type AdminProduct, type ProductStatus } from "../adminApi";

type Notice = { tone: "success" | "error"; text: string };

const isUnauthorized = (err: unknown) => err instanceof ApiError && err.status === 401;
const messageOf = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function AdminProducts() {
  const { guard } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "">("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(() => {
    const flash = (location.state as { flash?: string } | null)?.flash;
    return flash ? { tone: "success", text: flash } : null;
  });
  const requestId = useRef(0);

  // Title + clear the one-time flash message from history state.
  useEffect(() => {
    document.title = "Products — Azelle admin";
    if (location.state) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Success messages fade after a few seconds.
  useEffect(() => {
    if (notice?.tone !== "success") return;
    const t = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const load = useCallback(
    async (q: string, status: ProductStatus | "") => {
      const id = ++requestId.current;
      try {
        const { products: list } = await guard(adminApi.listProducts({ q, status }));
        if (id !== requestId.current) return;
        setProducts(list);
        setLoadState("ready");
        setLoadError("");
      } catch (err) {
        if (id !== requestId.current || isUnauthorized(err)) return;
        setLoadError(messageOf(err, "Could not load products."));
        setLoadState("error");
      }
    },
    [guard],
  );

  useEffect(() => {
    const t = window.setTimeout(() => void load(query.trim(), statusFilter), query ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [query, statusFilter, load]);

  const toggleStatus = async (product: AdminProduct) => {
    const next: ProductStatus = product.status === "active" ? "inactive" : "active";
    setBusyId(product.id);
    setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, status: next } : p)));
    try {
      const { product: saved } = await guard(adminApi.setStatus(product.id, next));
      setProducts((list) =>
        statusFilter && statusFilter !== next ? list.filter((p) => p.id !== saved.id) : list.map((p) => (p.id === saved.id ? saved : p)),
      );
      setNotice({ tone: "success", text: `“${product.name}” is now ${next === "active" ? "live on the store" : "hidden from the store"}.` });
    } catch (err) {
      setProducts((list) => list.map((p) => (p.id === product.id ? product : p)));
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not update the status.") });
    } finally {
      setBusyId(null);
    }
  };

  const closeDelete = useCallback(() => setDeleteOpen(false), []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyId(target.id);
    try {
      await guard(adminApi.deleteProduct(target.id));
      setProducts((list) => list.filter((p) => p.id !== target.id));
      setNotice({ tone: "success", text: `“${target.name}” was deleted.` });
      setDeleteOpen(false);
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not delete the product.") });
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = products.filter((p) => p.status === "active").length;
  const filtered = Boolean(query.trim() || statusFilter);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">Catalogue</p>
          <h1 className="mt-1 font-display text-[2.75rem] leading-none">Products</h1>
          {loadState === "ready" && (
            <p className="mt-2 text-sm">
              {products.length} {products.length === 1 ? "product" : "products"} · {activeCount} active
            </p>
          )}
        </div>
        <Link to="/admin/products/new" className="btn btn-primary">
          + Add product
        </Link>
      </div>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-6 flex items-start justify-between gap-4 rounded-[12px] px-4 py-3 text-sm text-white ${notice.tone === "success" ? "bg-[#2f7d4f]" : "bg-[#b3261e]"}`}
        >
          <p>{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message" className="-m-1 grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/15">
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">Search products</span>
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, slug or family"
            className={`${fieldClass} !mt-0 pl-11`}
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProductStatus | "")} className={`${fieldClass} !mt-0 w-48`}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded-[18px] border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-line bg-surface2 text-[11px] uppercase tracking-[0.16em]">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Product</th>
                <th scope="col" className="px-4 py-3 font-semibold">Families</th>
                <th scope="col" className="px-4 py-3 font-semibold">Price (50 ml)</th>
                <th scope="col" className="px-4 py-3 font-semibold">Stock</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Updated</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loadState === "loading" &&
                Array.from({ length: 4 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    <td className="px-5 py-4" colSpan={7}>
                      <div className="flex animate-pulse items-center gap-3">
                        <span className="h-14 w-14 rounded-[10px] bg-surface2" />
                        <span className="h-4 w-48 rounded bg-surface2" />
                      </div>
                    </td>
                  </tr>
                ))}

              {loadState === "ready" &&
                products.map((p) => {
                  const active = p.status === "active";
                  return (
                    <tr key={p.id} className="align-middle">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-surface2">
                            {p.images[0] ? (
                              <img src={sized(p.images[0], 160)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Bottle tint={p.tint} name={p.name} decorative className="h-11 w-auto" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs">/{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{p.families.join(", ")}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{formatPrice(p.prices["50"])}</td>
                      <td className="px-4 py-3">
                        <StockBadge inStock={p.inStock} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={active}
                          aria-label={`Show ${p.name} on the store`}
                          onClick={() => void toggleStatus(p)}
                          disabled={busyId === p.id}
                          className="inline-flex items-center gap-2.5 disabled:opacity-60"
                        >
                          <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${active ? "bg-[#2f7d4f]" : "bg-[color-mix(in_oklab,var(--ink)_28%,transparent)]"}`}>
                            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${active ? "translate-x-5" : "translate-x-0"}`} />
                          </span>
                          <span className="w-14 text-left text-xs font-semibold">{active ? "Active" : "Inactive"}</span>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">{formatDate(p.updatedAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/products/${p.id}/edit`} className="btn btn-secondary !h-9 !min-w-0 !px-4 !text-[11px]" aria-label={`Edit ${p.name}`}>
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(p);
                              setDeleteOpen(true);
                            }}
                            className="btn !h-9 !min-w-0 border-[#b3261e] !px-4 !text-[11px] text-[#b3261e]"
                            aria-label={`Delete ${p.name}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {loadState === "ready" && products.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-2xl">{filtered ? "No products match." : "No products yet."}</p>
            <p className="mt-2 text-sm">{filtered ? "Try a different search or status." : "Add your first product to get started."}</p>
          </div>
        )}

        {loadState === "error" && (
          <div role="alert" className="px-6 py-16 text-center">
            <p className="font-display text-2xl">Couldn&apos;t load products</p>
            <p className="mt-2 text-sm">{loadError}</p>
            <button type="button" className="btn btn-secondary mt-5" onClick={() => void load(query.trim(), statusFilter)}>
              Try again
            </button>
          </div>
        )}
      </div>

      <Modal open={deleteOpen} onClose={closeDelete} label="Delete product">
        <div className="p-7 md:p-8">
          <h2 className="font-display text-3xl">Delete this product?</h2>
          <p className="mt-3 leading-relaxed">
            <strong>{deleteTarget?.name}</strong> will be removed from the store and from this list. The record is kept in the
            database (soft delete).
          </p>
          <div className="mt-7 flex justify-end gap-3">
            <button type="button" className="btn btn-secondary !min-w-0" onClick={closeDelete}>
              Cancel
            </button>
            <button
              type="button"
              className="btn !min-w-0 border-[#b3261e] bg-[#b3261e] text-white"
              onClick={() => void confirmDelete()}
              disabled={Boolean(deleteTarget && busyId === deleteTarget.id)}
            >
              {deleteTarget && busyId === deleteTarget.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
