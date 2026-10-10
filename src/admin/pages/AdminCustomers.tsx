import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { fieldClass, fieldErrorClass, labelClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/products";
import { IconPlus } from "../icons";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminCommerceApi, type AdminCustomer, type CustomerInput, type CustomerList } from "../adminApi";
import { EmptyState, ExportButton, FilterSelect, formatDate, IconButton, isUnauthorized, ListToolbar, messageOf, NoticeBanner, PageHeader, Pagination, useNotice } from "../ui";

// Sales → Customers. Two lists:
//   Accounts — everyone who signed up on the storefront (name, email, mobile, orders).
//   Guests   — people who ordered without an account, grouped by the email on their orders.
// Only a Super Admin sees the add / edit / delete buttons; the API checks again.

const EMPTY: CustomerInput = { name: "", email: "", phone: "", active: true, marketing: false, notes: "", password: "" };

const toInput = (c: AdminCustomer): CustomerInput => ({
  name: c.name,
  email: c.email,
  phone: c.phone ?? "",
  active: c.active !== false,
  marketing: Boolean(c.marketing),
  notes: c.notes ?? "",
  password: "",
});

export default function AdminCustomers() {
  const { guard } = useAdminAuth();
  const [type, setType] = useState<"accounts" | "guests">("accounts");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomerList | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useNotice();
  const [editing, setEditing] = useState<AdminCustomer | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminCustomer | null>(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  const closeEditor = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  const load = useCallback(
    async (q: string, s: string, p: number, t: string) => {
      const id = ++requestId.current;
      try {
        const result = await guard(adminCommerceApi.listCustomers({ q, sort: s, page: p, type: t }));
        if (id !== requestId.current) return;
        setData(result);
        setError("");
      } catch (err) {
        if (id === requestId.current && !isUnauthorized(err)) setError(messageOf(err, "Could not load customers."));
      }
    },
    [guard],
  );

  useEffect(() => {
    document.title = "Customers — Azelle admin";
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(query.trim(), sort, page, type), query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [query, sort, page, type, load]);

  const reload = () => void load(query.trim(), sort, page, type);
  const canManage = Boolean(data?.canManage) && type === "accounts";

  const confirmDelete = async () => {
    if (!deleting?.id) return;
    setBusy(true);
    try {
      await guard(adminCommerceApi.deleteCustomer(deleting.id));
      setNotice({ tone: "success", text: `${deleting.name}'s account was deleted. Their orders are untouched.` });
      setDeleting(null);
      reload();
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not delete the account.") });
    } finally {
      setBusy(false);
    }
  };

  const tab = (id: "accounts" | "guests", label: string, count?: number) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setType(id);
        setPage(1);
      }}
      className={`rounded-full px-4 py-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 ${
        type === id ? "bg-ink text-surface" : "border border-line hover:border-ink"
      }`}
      aria-pressed={type === id}
    >
      {label}
      {count !== undefined && <span className="ml-2 tabular-nums opacity-70">{count}</span>}
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={
          type === "accounts"
            ? "Everyone who created an account on the storefront. Only a Super Admin can add, change or delete one."
            : "People who ordered without an account, grouped by the email on their orders."
        }
        actions={
          <>
            <ExportButton path={`/api/admin/customers/export?type=${type}`} perm="customers.export" />
            {canManage && (
              <button type="button" className="abtn abtn-add" onClick={() => setEditing("new")}>
                <IconPlus size={16} /> New customer
              </button>
            )}
          </>
        }
      />
      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      <div className="mt-8 flex flex-wrap gap-2">
        {tab("accounts", "Accounts", data?.counts.accounts)}
        {tab("guests", "Guest buyers", data?.counts.guests)}
      </div>

      <ListToolbar
        query={query}
        onQuery={(v) => {
          setQuery(v);
          setPage(1);
        }}
        placeholder="Search name, email or mobile"
        right={data ? `${data.total} ${data.total === 1 ? "customer" : "customers"}` : undefined}
      >
        <FilterSelect
          label="Sort by"
          value={sort}
          onChange={(v) => {
            setSort(v);
            setPage(1);
          }}
          options={[
            { value: "recent", label: type === "accounts" ? "Newest first" : "Latest order first" },
            { value: "orders", label: "Most orders" },
            { value: "spent", label: "Highest spend" },
            { value: "name", label: "Name (A–Z)" },
          ]}
        />
      </ListToolbar>

      {error && (
        <p role="alert" className="mt-6 rounded-[12px] border border-[#e7c9c5] bg-[#fdf1f0] px-4 py-3 text-sm text-[#8c1d18]">
          {error}
        </p>
      )}

      <div className="admin-card admin-rise mt-6 overflow-x-auto rounded-[20px]">
        {!data ? (
          <p className="p-10 text-center text-sm" role="status">
            Loading customers…
          </p>
        ) : data.customers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={query ? "No one matches that search" : type === "accounts" ? "No accounts yet" : "No guest buyers yet"}
              body={
                query
                  ? "Try part of a name, an email or a mobile number."
                  : type === "accounts"
                    ? "Accounts appear here as soon as shoppers sign up on the storefront."
                    : "Everyone who has ordered so far also has an account."
              }
            />
          </div>
        ) : (
          <table className="admin-table min-w-[880px]">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Mobile</th>
                <th className="!text-right">Orders</th>
                <th className="!text-right">Spent</th>
                <th>{type === "accounts" ? "Signed up" : "First order"}</th>
                <th>Last order</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c, i) => (
                <tr key={c.id ?? c.email} className="admin-rise" style={{ animationDelay: `${i * 35}ms` }}>
                  <td>
                    <p className="font-semibold">
                      {c.name}
                      {c.active === false && <span className="ml-2 rounded-full bg-[#f6dedb] px-2 py-0.5 text-[10px] font-bold uppercase text-[#8c1d18]">Disabled</span>}
                      {c.marketing && <span className="ml-2 rounded-full bg-[#dcefe2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1f6a3c]">Offers</span>}
                    </p>
                    <p className="text-[12.5px] text-soft">{c.email}</p>
                  </td>
                  <td className="tabular-nums">{c.phone || "—"}</td>
                  <td className="!text-right tabular-nums">
                    {c.orders > 0 ? (
                      <Link to={`/admin/orders?email=${encodeURIComponent(c.email)}`} className="font-semibold underline-offset-2 hover:underline">
                        {c.orders}
                      </Link>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="!text-right tabular-nums">{formatPrice(c.spent ?? 0)}</td>
                  <td>{formatDate(type === "accounts" ? c.createdAt : c.firstOrderAt)}</td>
                  <td>{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</td>
                  {canManage && (
                    <td>
                      <div className="flex justify-end gap-2">
                        <IconButton kind="edit" label={`Edit ${c.name}`} onClick={() => setEditing(c)} />
                        <IconButton kind="delete" label={`Delete ${c.name}`} onClick={() => setDeleting(c)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}

      <CustomerEditor
        open={editing !== null}
        customer={editing === "new" ? null : editing}
        onClose={closeEditor}
        onSave={async (input) => {
          const target = editing;
          await guard(target && target !== "new" && target.id ? adminCommerceApi.updateCustomer(target.id, input) : adminCommerceApi.createCustomer(input));
          setNotice({ tone: "success", text: `${input.name} saved.` });
          setEditing(null);
          reload();
        }}
      />

      <Modal from="right" open={deleting !== null} onClose={closeDelete} label="Delete customer account">
        <div className="p-7 md:p-8">
          <h2 className="admin-title font-display text-3xl">Delete {deleting?.name}?</h2>
          <p className="mt-3 text-sm">
            Their sign-in account is removed and they can no longer log in. Their orders stay in the shop&rsquo;s records. To block them without
            deleting anything, edit the account and switch it off instead.
          </p>
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

function CustomerEditor({
  open,
  customer,
  onClose,
  onSave,
}: {
  open: boolean;
  customer: AdminCustomer | null;
  onClose: () => void;
  onSave: (input: CustomerInput) => Promise<void>;
}) {
  const [form, setForm] = useState<CustomerInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(customer ? toInput(customer) : EMPTY);
    setErrors({});
    setError("");
  }, [open, customer]);

  const set = <K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setErrors({});
    try {
      await onSave({ ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      if (!isUnauthorized(err)) setError(messageOf(err, "Could not save the customer."));
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) => errors[key] && <p className={fieldErrorClass}>{errors[key]}</p>;

  return (
    <Modal from="right" open={open} onClose={onClose} label={customer ? "Edit customer" : "New customer"} panelClassName="max-w-[560px]">
      <form onSubmit={submit} className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 md:p-8" noValidate>
        <h2 className="admin-title font-display text-3xl">{customer ? `Edit ${customer.name}` : "New customer"}</h2>
        <p className="mt-2 text-sm text-soft">
          {customer ? "Leave the password blank to keep their current one." : "They can sign in on the storefront with this email and password."}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cu-name" className={labelClass}>
              Full name
            </label>
            <input id="cu-name" value={form.name} onChange={(e) => set("name", e.target.value)} className={fieldClass} autoComplete="off" />
            {fieldError("name")}
          </div>
          <div>
            <label htmlFor="cu-phone" className={labelClass}>
              Mobile
            </label>
            <input
              id="cu-phone"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              className={fieldClass}
              placeholder="9876543210"
              autoComplete="off"
            />
            {fieldError("phone")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cu-email" className={labelClass}>
              Email
            </label>
            <input id="cu-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={fieldClass} autoComplete="off" />
            {fieldError("email")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cu-password" className={labelClass}>
              {customer ? "New password" : "Password"}
            </label>
            <input
              id="cu-password"
              type="text"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className={fieldClass}
              placeholder={customer ? "Leave blank to keep the current password" : "8+ characters, upper and lower case, a number and a symbol"}
              autoComplete="off"
            />
            {fieldError("password")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cu-notes" className={labelClass}>
              Internal note
            </label>
            <input id="cu-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} className={fieldClass} placeholder="Only visible here" />
            {fieldError("notes")}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4" />
            Account is active (they can sign in)
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.marketing} onChange={(e) => set("marketing", e.target.checked)} className="h-4 w-4" />
            Happy to hear about launches and offers
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-[12px] border border-[#e7c9c5] bg-[#fdf1f0] px-4 py-3 text-sm text-[#8c1d18]">
            {error}
          </p>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <button type="button" className="abtn abtn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="abtn abtn-add" disabled={saving}>
            {saving ? "Saving…" : "Save customer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
