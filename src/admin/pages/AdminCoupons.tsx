import { useCallback, useEffect, useState, type FormEvent } from "react";
import { fieldClass, fieldErrorClass, labelClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/products";
import { IconEdit, IconPlus, IconTrash } from "../icons";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminCommerceApi, type AdminCoupon, type CouponInput } from "../adminApi";
import { EmptyState, ExportButton, formatDate, isUnauthorized, messageOf, NoticeBanner, PageHeader, useNotice } from "../ui";

const EMPTY: CouponInput = { code: "", label: "", kind: "percent", value: "", maxDiscount: "", minSubtotal: 0, active: true, public: true, usageLimit: "", expiresAt: "" };

function toInput(c: AdminCoupon): CouponInput {
  return {
    code: c.code,
    label: c.label,
    kind: c.kind,
    value: c.kind === "shipping" ? "" : c.value,
    maxDiscount: c.maxDiscount ?? "",
    minSubtotal: c.minSubtotal,
    active: c.active,
    public: c.public,
    usageLimit: c.usageLimit ?? "",
    expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
  };
}

function couponState(c: AdminCoupon): { text: string; tone: string } {
  if (!c.active) return { text: "Off", tone: "bg-[#ece8e1] text-[#5b5249]" };
  if (c.expiresAt && new Date(c.expiresAt) <= new Date()) return { text: "Expired", tone: "bg-[#f6dedb] text-[#8c1d18]" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { text: "Used up", tone: "bg-[#f6dedb] text-[#8c1d18]" };
  return { text: "Live", tone: "bg-[#dcefe2] text-[#1f6a3c]" };
}

function offerText(c: AdminCoupon) {
  if (c.kind === "shipping") return "Free shipping";
  if (c.kind === "flat") return `${formatPrice(c.value)} off`;
  return `${c.value}% off${c.maxDiscount ? ` (up to ${formatPrice(c.maxDiscount)})` : ""}`;
}

export default function AdminCoupons() {
  const { guard, can } = useAdminAuth();
  const [coupons, setCoupons] = useState<AdminCoupon[] | null>(null);
  const [notice, setNotice] = useNotice();
  const [editing, setEditing] = useState<AdminCoupon | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);
  const [busy, setBusy] = useState(false);
  const closeEditor = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  const load = useCallback(async () => {
    try {
      setCoupons((await guard(adminCommerceApi.listCoupons())).coupons);
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not load coupons.") });
    }
  }, [guard, setNotice]);

  useEffect(() => {
    document.title = "Coupons — Azelle admin";
    void load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await guard(adminCommerceApi.deleteCoupon(deleting.id));
      setCoupons((list) => list?.filter((c) => c.id !== deleting.id) ?? null);
      setNotice({ tone: "success", text: `${deleting.code} was deleted.` });
      setDeleting(null);
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not delete the coupon.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Marketing"
        title="Coupons"
        subtitle="Live, public coupons appear in the cart's “View all coupons” list. Hidden ones work when typed."
        actions={
          <>
            <ExportButton path="/api/admin/coupons/export" perm="coupons.export" />
            {can("coupons.add") && (
              <button type="button" className="abtn abtn-add" onClick={() => setEditing("new")}>
                <IconPlus size={16} /> New coupon
              </button>
            )}
          </>
        }
      />
      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      <div className="mt-8">
        {!coupons ? (
          <p className="py-16 text-center text-sm" role="status">
            Loading coupons…
          </p>
        ) : coupons.length === 0 ? (
          <EmptyState title="No coupons yet" body="Create a code to offer a discount or free shipping." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {coupons.map((c) => {
              const state = couponState(c);
              return (
                <li key={c.id} className="admin-card admin-rise flex flex-col rounded-[20px] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="rounded-[6px] border border-dashed border-ink/40 px-2 py-0.5 font-bold tracking-[0.1em]">{c.code}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${state.tone}`}>{state.text}</span>
                  </div>
                  <p className="mt-3 font-semibold">{offerText(c)}</p>
                  <p className="text-sm">{c.label}</p>
                  <dl className="mt-3 space-y-1 text-[13px]">
                    <div className="flex justify-between">
                      <dt className="text-soft">Min. order</dt>
                      <dd>{formatPrice(c.minSubtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-soft">Used</dt>
                      <dd className="tabular-nums">
                        {c.usedCount}
                        {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-soft">Expires</dt>
                      <dd>{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-soft">Shown in cart</dt>
                      <dd>{c.public ? "Yes" : "Hidden"}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex gap-2 pt-4">
                    {can("coupons.update") && (
                      <button type="button" className="abtn abtn-edit flex-1" onClick={() => setEditing(c)}>
                        <IconEdit size={16} /> Edit
                      </button>
                    )}
                    {can("coupons.delete") && (
                      <button type="button" className="abtn abtn-delete flex-1" onClick={() => setDeleting(c)}>
                        <IconTrash size={16} /> Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CouponEditor
        open={editing !== null}
        coupon={editing === "new" ? null : editing}
        onClose={closeEditor}
        onSave={async (input) => {
          const target = editing;
          const { coupon } = await guard(target && target !== "new" ? adminCommerceApi.updateCoupon(target.id, input) : adminCommerceApi.createCoupon(input));
          setCoupons((list) => {
            const rest = (list ?? []).filter((c) => c.id !== coupon.id);
            return target && target !== "new" ? (list ?? []).map((c) => (c.id === coupon.id ? coupon : c)) : [coupon, ...rest];
          });
          setNotice({ tone: "success", text: `${coupon.code} saved.` });
          setEditing(null);
        }}
      />

      <Modal open={deleting !== null} onClose={closeDelete} label="Delete coupon">
        <div className="p-7 md:p-8">
          <h2 className="admin-title font-display text-3xl">Delete {deleting?.code}?</h2>
          <p className="mt-3 text-sm">Customers will no longer be able to use it. Past orders keep their discount. To pause a coupon instead, edit it and switch it off.</p>
          <div className="mt-7 flex justify-end gap-3">
            <button type="button" className="abtn abtn-ghost" onClick={closeDelete}>
              Keep it
            </button>
            <button type="button" className="abtn abtn-delete" disabled={busy} onClick={() => void confirmDelete()}>
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CouponEditor({ open, coupon, onClose, onSave }: { open: boolean; coupon: AdminCoupon | null; onClose: () => void; onSave: (input: CouponInput) => Promise<void> }) {
  const [form, setForm] = useState<CouponInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(coupon ? toInput(coupon) : EMPTY);
    setErrors({});
    setError("");
  }, [open, coupon]);

  const set = <K extends keyof CouponInput>(key: K, value: CouponInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const numberOrEmpty = (v: string) => (v === "" ? "" : Number(v));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, code: form.code.trim().toUpperCase() });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      if (!isUnauthorized(err)) setError(messageOf(err, "Could not save the coupon."));
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) => errors[key] && <p className={fieldErrorClass}>{errors[key]}</p>;

  return (
    <Modal open={open} onClose={onClose} label={coupon ? "Edit coupon" : "New coupon"} panelClassName="max-w-[560px]">
      <form onSubmit={submit} className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 md:p-8" noValidate>
        <h2 className="admin-title font-display text-3xl">{coupon ? `Edit ${coupon.code}` : "New coupon"}</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="c-code" className={labelClass}>
              Code
            </label>
            <input id="c-code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className={`${fieldClass} uppercase`} placeholder="WELCOME10" />
            {fieldError("code")}
          </div>
          <div>
            <label htmlFor="c-kind" className={labelClass}>
              Type
            </label>
            <select id="c-kind" value={form.kind} onChange={(e) => set("kind", e.target.value as CouponInput["kind"])} className={fieldClass}>
              <option value="percent">Percentage off</option>
              <option value="flat">Fixed amount off</option>
              <option value="shipping">Free shipping</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="c-label" className={labelClass}>
              Shown to customers as
            </label>
            <input id="c-label" value={form.label} onChange={(e) => set("label", e.target.value)} className={fieldClass} placeholder="10% off (up to ₹300)" />
            {fieldError("label")}
          </div>
          {form.kind !== "shipping" && (
            <div>
              <label htmlFor="c-value" className={labelClass}>
                {form.kind === "percent" ? "Percent off" : "Rupees off"}
              </label>
              <input id="c-value" type="number" min={1} value={form.value} onChange={(e) => set("value", numberOrEmpty(e.target.value))} className={fieldClass} />
              {fieldError("value")}
            </div>
          )}
          {form.kind === "percent" && (
            <div>
              <label htmlFor="c-max" className={labelClass}>
                Max discount (₹) <span className="font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <input id="c-max" type="number" min={1} value={form.maxDiscount} onChange={(e) => set("maxDiscount", numberOrEmpty(e.target.value))} className={fieldClass} />
              {fieldError("maxDiscount")}
            </div>
          )}
          <div>
            <label htmlFor="c-min" className={labelClass}>
              Min. product total (₹)
            </label>
            <input id="c-min" type="number" min={0} value={form.minSubtotal} onChange={(e) => set("minSubtotal", numberOrEmpty(e.target.value))} className={fieldClass} />
            {fieldError("minSubtotal")}
          </div>
          <div>
            <label htmlFor="c-limit" className={labelClass}>
              Usage limit <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input id="c-limit" type="number" min={1} value={form.usageLimit} onChange={(e) => set("usageLimit", numberOrEmpty(e.target.value))} className={fieldClass} placeholder="Unlimited" />
            {fieldError("usageLimit")}
          </div>
          <div>
            <label htmlFor="c-exp" className={labelClass}>
              Expires on <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input id="c-exp" type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className={fieldClass} />
            {fieldError("expiresAt")}
          </div>
          <div className="flex flex-col justify-end gap-2 text-sm sm:col-span-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              Active — customers can use it
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.public} onChange={(e) => set("public", e.target.checked)} />
              Show in the cart's coupon list
            </label>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-[#b3261e]">
            {error}
          </p>
        )}
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" className="abtn abtn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="abtn abtn-add" disabled={saving}>
            {saving ? "Saving…" : "Save coupon"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
