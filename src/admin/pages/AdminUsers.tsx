import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { fieldClass, fieldErrorClass, labelClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminUsersApi, type Action, type AdminRole, type AdminUserRow, type ModuleInfo, type Permission, type RoleInput, type UserInput } from "../adminApi";
import { ActionButton, EmptyState, formatDateTime, isUnauthorized, messageOf, NoticeBanner, PageHeader, useNotice } from "../ui";

type Tab = "users" | "roles";
const ACTION_LABELS: Record<Action, string> = { view: "View", add: "Add", update: "Update", delete: "Delete", export: "Export" };

// System → Users and System → Roles (RBAC). The same page, opened with view="users" or view="roles".
export default function AdminUsers({ view = "users" }: { view?: Tab }) {
  const { guard, admin, can } = useAdminAuth();
  const canUsers = can("users.view");
  const canRoles = can("roles.view");
  const tab = view;
  const [owner, setOwner] = useState<{ name: string; email: string; role: string } | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [notice, setNotice] = useNotice();
  const [editingUser, setEditingUser] = useState<AdminUserRow | "new" | null>(null);
  const [editingRole, setEditingRole] = useState<AdminRole | "new" | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "user" | "role"; id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const closeUser = useCallback(() => setEditingUser(null), []);
  const closeRole = useCallback(() => setEditingRole(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  const load = useCallback(async () => {
    try {
      const [u, r, p] = await Promise.all([
        canUsers ? guard(adminUsersApi.list()) : Promise.resolve(null),
        canRoles || can("users.add", "users.update") ? guard(adminUsersApi.roles()) : Promise.resolve({ roles: [] }),
        guard(adminUsersApi.permissions()),
      ]);
      if (u) {
        setOwner(u.owner);
        setUsers(u.users);
      }
      setRoles(r.roles);
      setModules(p.modules);
      setActions(p.actions);
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not load users.") });
    }
  }, [guard, setNotice, canUsers, canRoles, can]);

  useEffect(() => {
    document.title = `${view === "users" ? "Users" : "Roles"} — Azelle admin`;
    void load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await guard(deleting.kind === "user" ? adminUsersApi.remove(deleting.id) : adminUsersApi.removeRole(deleting.id));
      setNotice({ tone: "success", text: `${deleting.name} was deleted.` });
      setDeleting(null);
      await load();
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not delete.") });
    } finally {
      setBusy(false);
    }
  };

  const totalPermissions = modules.reduce((n, m) => n + m.actions.length, 0);

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title={tab === "users" ? "Users" : "Roles"}
        subtitle={
          tab === "users"
            ? "Give each team member their own sign-in and one role."
            : "A role decides what its users can view, add, update, delete and export in each module."
        }
        actions={
          tab === "users"
            ? can("users.add") && (
                <ActionButton kind="add" onClick={() => setEditingUser("new")} disabled={!roles.length}>
                  Add user
                </ActionButton>
              )
            : can("roles.add") && (
                <ActionButton kind="add" onClick={() => setEditingRole("new")}>
                  Add role
                </ActionButton>
              )
        }
      />
      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      <div className="mt-8" />

      {tab === "users" ? (
        <div className="mt-6 space-y-3">
          {!users ? (
            <p className="py-10 text-center text-sm">Loading…</p>
          ) : (
            <>
              {owner && <UserRow name={owner.name} email={owner.email} role={owner.role} note="Main account (ADMIN_EMAIL) · can never be locked out" active you={Boolean(admin?.owner)} />}
              {users.length === 0 && <EmptyState title="No team members yet" body="Add a user to give someone their own admin sign-in with limited access." />}
              {users.map((u, i) => (
                <UserRow
                  key={u.id}
                  delay={(i + 1) * 60}
                  name={u.name}
                  email={u.email}
                  role={u.role?.name ?? "—"}
                  note={u.lastLoginAt ? `Last sign-in ${formatDateTime(u.lastLoginAt)}` : "Never signed in"}
                  active={u.active}
                  you={admin?.email === u.email}
                  onEdit={can("users.update") ? () => setEditingUser(u) : undefined}
                  onDelete={admin?.email === u.email || !can("users.delete") ? undefined : () => setDeleting({ kind: "user", id: u.id, name: u.name })}
                />
              ))}
            </>
          )}
        </div>
      ) : (
        /* Role list */
        <div className="admin-card admin-rise mt-6 overflow-x-auto rounded-[20px]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-surface2 text-[11px] uppercase tracking-[0.14em]">
              <tr>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 text-center font-semibold">Users</th>
                <th className="px-5 py-3 font-semibold">Access</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {roles.map((r, i) => {
                const locked = r.key === "super_admin";
                const share = totalPermissions ? r.permissions.length / totalPermissions : 0;
                return (
                  <tr key={r.id} className="admin-rise transition-colors duration-300 hover:bg-surface2/50" style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="px-5 py-4">
                      <p className="admin-title font-display text-xl">{r.name}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-soft">{r.system ? `Built-in · level ${i + 1}` : "Custom"}</p>
                    </td>
                    <td className="max-w-[280px] px-5 py-4 text-[13px]">{r.description || "—"}</td>
                    <td className="px-5 py-4 text-center font-semibold tabular-nums">{r.userCount + (locked ? 1 : 0)}</td>
                    <td className="px-5 py-4">
                      <p className="text-[13px] tabular-nums">
                        {r.permissions.length} of {totalPermissions} permissions
                      </p>
                      <span className="mt-1.5 block h-1.5 w-40 rounded-full bg-surface2" aria-hidden="true">
                        <span className="admin-fade block h-full rounded-full" style={{ width: `${share * 100}%`, background: "var(--menu-gradient)" }} />
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {locked || !can("roles.update") ? (
                          <ActionButton kind="ghost" onClick={() => setEditingRole(r)}>
                            View
                          </ActionButton>
                        ) : (
                          <ActionButton kind="edit" onClick={() => setEditingRole(r)}>
                            Edit
                          </ActionButton>
                        )}
                        {!r.system && can("roles.delete") && (
                          <ActionButton kind="delete" onClick={() => setDeleting({ kind: "role", id: r.id, name: r.name })}>
                            Delete
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UserEditor
        open={editingUser !== null}
        user={editingUser === "new" ? null : editingUser}
        roles={roles}
        onClose={closeUser}
        onSave={async (input) => {
          const target = editingUser;
          await guard(target && target !== "new" ? adminUsersApi.update(target.id, input) : adminUsersApi.create(input));
          setNotice({ tone: "success", text: `${input.name} saved.` });
          setEditingUser(null);
          await load();
        }}
      />
      <RoleEditor
        open={editingRole !== null}
        role={editingRole === "new" ? null : editingRole}
        modules={modules}
        actions={actions}
        readOnly={editingRole !== null && editingRole !== "new" && (editingRole.key === "super_admin" || !can("roles.update"))}
        onClose={closeRole}
        onSave={async (input) => {
          const target = editingRole;
          await guard(target && target !== "new" ? adminUsersApi.updateRole(target.id, input) : adminUsersApi.createRole(input));
          setNotice({ tone: "success", text: `Role “${input.name}” saved. Changes apply on the users' next click.` });
          setEditingRole(null);
          await load();
        }}
      />
      <Modal open={deleting !== null} onClose={closeDelete} label="Confirm delete">
        <div className="p-7 md:p-8">
          <h2 className="admin-title font-display text-3xl">Delete {deleting?.name}?</h2>
          <p className="mt-3 text-sm">
            {deleting?.kind === "user" ? "They will be signed out and can no longer sign in to the admin." : "Roles can only be deleted when no user has them."}
          </p>
          <div className="mt-7 flex justify-end gap-3">
            <ActionButton kind="ghost" onClick={closeDelete}>
              Keep
            </ActionButton>
            <ActionButton kind="delete" disabled={busy} onClick={() => void confirmDelete()}>
              {busy ? "Deleting…" : "Delete"}
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Checkbox that can show a "some selected" (indeterminate) state. */
function TriCheckbox({ checked, indeterminate, onChange, label, disabled }: { checked: boolean; indeterminate?: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      ref={(el) => {
        if (el) el.indeterminate = Boolean(indeterminate) && !checked;
      }}
      onChange={(e) => onChange(e.target.checked)}
      className="h-[18px] w-[18px] cursor-pointer accent-[#b46a7a] disabled:cursor-not-allowed"
    />
  );
}

// Add / edit a role: name, description and the module × action permission matrix.
function RoleEditor({
  open,
  role,
  modules,
  actions,
  readOnly,
  onClose,
  onSave,
}: {
  open: boolean;
  role: AdminRole | null;
  modules: ModuleInfo[];
  actions: Action[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (input: RoleInput) => Promise<void>;
}) {
  const [form, setForm] = useState<RoleInput>({ name: "", description: "", permissions: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(role ? { name: role.name, description: role.description, permissions: role.permissions } : { name: "", description: "", permissions: [] });
    setErrors({});
    setError("");
  }, [open, role]);

  const selected = useMemo(() => new Set(form.permissions), [form.permissions]);
  const key = (m: ModuleInfo, a: Action) => `${m.key}.${a}` as Permission;
  const allKeys = useMemo(() => modules.flatMap((m) => m.actions.map((a) => key(m, a))), [modules]);

  /** Apply a change, keeping "view" consistent: any other action needs view; removing view clears the row. */
  const apply = (change: (set: Set<Permission>) => void) => {
    if (readOnly) return;
    const next = new Set(selected);
    change(next);
    for (const m of modules) {
      const hasOther = m.actions.some((a) => a !== "view" && next.has(key(m, a)));
      if (hasOther && m.actions.includes("view")) next.add(key(m, "view"));
    }
    setForm((f) => ({ ...f, permissions: allKeys.filter((k) => next.has(k)) }));
  };

  const toggleCell = (m: ModuleInfo, a: Action, on: boolean) =>
    apply((s) => {
      if (on) s.add(key(m, a));
      else if (a === "view") m.actions.forEach((x) => s.delete(key(m, x)));
      else s.delete(key(m, a));
    });
  const toggleRow = (m: ModuleInfo, on: boolean) => apply((s) => m.actions.forEach((a) => (on ? s.add(key(m, a)) : s.delete(key(m, a)))));
  const toggleColumn = (a: Action, on: boolean) =>
    apply((s) =>
      modules.forEach((m) => {
        if (!m.actions.includes(a)) return;
        if (on) s.add(key(m, a));
        else if (a === "view") m.actions.forEach((x) => s.delete(key(m, x)));
        else s.delete(key(m, a));
      }),
    );
  const toggleAll = (on: boolean) => apply((s) => allKeys.forEach((k) => (on ? s.add(k) : s.delete(k))));

  const columnState = (a: Action) => {
    const keys = modules.filter((m) => m.actions.includes(a)).map((m) => key(m, a));
    const n = keys.filter((k) => selected.has(k)).length;
    return { all: n === keys.length && n > 0, some: n > 0 };
  };
  const everything = allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      if (!isUnauthorized(err)) setError(messageOf(err, "Could not save."));
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(modules.map((m) => m.group))];

  return (
    <Modal open={open} onClose={onClose} label={role ? `${readOnly ? "View" : "Edit"} role` : "Add role"} panelClassName="max-w-[980px]">
      <form onSubmit={submit} noValidate className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="admin-title font-display text-3xl">{role ? (readOnly ? role.name : `Edit ${role.name}`) : "Add a role"}</h2>
          <span className="rounded-full bg-surface2 px-3 py-1 text-[12px] font-semibold tabular-nums">
            {form.permissions.length} of {allKeys.length} permissions
          </span>
        </div>
        {readOnly && <p className="mt-2 text-sm text-soft">{role?.key === "super_admin" ? "Super Admin always has every permission — it can't be changed." : "You can view this role but not change it."}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="r-name" className={labelClass}>
              Role name
            </label>
            <input
              id="r-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={readOnly || Boolean(role?.system)}
              className={`${fieldClass} disabled:bg-surface2`}
              placeholder="e.g. Warehouse team"
            />
            {role?.system && !readOnly && <p className="mt-1.5 text-[12.5px] text-soft">Built-in role — the name stays; permissions can change.</p>}
            {errors.name && <p className={fieldErrorClass}>{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="r-desc" className={labelClass}>
              Description
            </label>
            <input id="r-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={readOnly} className={`${fieldClass} disabled:bg-surface2`} />
          </div>
        </div>

        {/* Permission matrix: modules × actions */}
        <fieldset className="mt-7">
          <legend className={labelClass}>Permissions</legend>
          <p className="mt-1 text-[12.5px] text-soft">Tick a column header to select that action for every module, or “All” to select a whole row. Any action also ticks View.</p>
          {errors.permissions && <p className={fieldErrorClass}>{errors.permissions}</p>}
          <div className="mt-3 overflow-x-auto rounded-[16px] border border-line">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-surface2">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <label className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.14em]">
                      <TriCheckbox checked={everything} indeterminate={form.permissions.length > 0} onChange={toggleAll} label="Select every permission" disabled={readOnly} />
                      Module
                    </label>
                  </th>
                  {actions.map((a) => {
                    const st = columnState(a);
                    return (
                      <th key={a} className="px-3 py-3 text-center">
                        <label className="flex flex-col items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em]">
                          {ACTION_LABELS[a]}
                          <TriCheckbox checked={st.all} indeterminate={st.some} onChange={(on) => toggleColumn(a, on)} label={`${ACTION_LABELS[a]} for every module`} disabled={readOnly} />
                        </label>
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em]">All</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g}>
                    <tr className="bg-surface">
                      <td colSpan={actions.length + 2} className="px-4 pb-1.5 pt-4 text-[10.5px] font-bold uppercase tracking-[0.2em] text-soft">
                        {g}
                      </td>
                    </tr>
                    {modules
                      .filter((m) => m.group === g)
                      .map((m) => {
                        const rowKeys = m.actions.map((a) => key(m, a));
                        const rowCount = rowKeys.filter((k) => selected.has(k)).length;
                        return (
                          <tr key={m.key} className="border-t border-line transition-colors duration-200 hover:bg-surface2/60">
                            <td className="px-4 py-3">
                              <p className="font-semibold">{m.label}</p>
                              {m.notes && (
                                <p className="text-[11.5px] text-soft">
                                  {Object.entries(m.notes)
                                    .map(([a, note]) => `${ACTION_LABELS[a as Action]}: ${note}`)
                                    .join(" · ")}
                                </p>
                              )}
                            </td>
                            {actions.map((a) => (
                              <td key={a} className="px-3 py-3 text-center">
                                {m.actions.includes(a) ? (
                                  <TriCheckbox checked={selected.has(key(m, a))} onChange={(on) => toggleCell(m, a, on)} label={`${m.label}: ${ACTION_LABELS[a]}`} disabled={readOnly} />
                                ) : (
                                  <span className="text-soft" aria-label="Not applicable">
                                    —
                                  </span>
                                )}
                              </td>
                            ))}
                            <td className="px-3 py-3 text-center">
                              <TriCheckbox checked={rowCount === rowKeys.length} indeterminate={rowCount > 0} onChange={(on) => toggleRow(m, on)} label={`All ${m.label} permissions`} disabled={readOnly} />
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 text-sm text-[#b3261e]">
            {error}
          </p>
        )}
        <div className="mt-7 flex justify-end gap-3">
          <ActionButton kind="ghost" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </ActionButton>
          {!readOnly && (
            <button type="submit" className="abtn abtn-add" disabled={saving}>
              {saving ? "Saving…" : role ? "Save role" : "Add role"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}


function UserRow({
  name,
  email,
  role,
  note,
  active,
  you,
  onEdit,
  onDelete,
  delay = 0,
}: {
  name: string;
  email: string;
  role: string;
  note: string;
  active: boolean;
  you: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  delay?: number;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="admin-card admin-rise flex flex-wrap items-center gap-4 rounded-[18px] p-4" style={{ animationDelay: `${delay}ms` }}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-md" style={{ background: role === "Owner" ? "linear-gradient(135deg,#e6b45a,#c9772b)" : "linear-gradient(135deg,#b46a7a,#3f6b58)" }}>
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {name}
          {you && <span className="rounded-full bg-[#dfe9f7] px-2 py-0.5 text-[10.5px] font-bold uppercase text-[#1f4f8f]">You</span>}
          {!active && <span className="rounded-full bg-[#ece8e1] px-2 py-0.5 text-[10.5px] font-bold uppercase text-[#5b5249]">Inactive</span>}
        </p>
        <p className="break-all text-[13px]">{email}</p>
        <p className="text-[12px] text-soft">{note}</p>
      </div>
      <span className="rounded-full border border-line px-3 py-1 text-[12px] font-semibold">{role}</span>
      {(onEdit || onDelete) && (
        <div className="flex gap-2">
          {onEdit && (
            <ActionButton kind="edit" onClick={onEdit}>
              Edit
            </ActionButton>
          )}
          {onDelete && (
            <ActionButton kind="delete" onClick={onDelete}>
              Delete
            </ActionButton>
          )}
        </div>
      )}
    </div>
  );
}

function UserEditor({ open, user, roles, onClose, onSave }: { open: boolean; user: AdminUserRow | null; roles: AdminRole[]; onClose: () => void; onSave: (input: UserInput) => Promise<void> }) {
  const [form, setForm] = useState<UserInput>({ name: "", email: "", role: "", active: true, password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(user ? { name: user.name, email: user.email, role: user.role?._id ?? "", active: user.active, password: "" } : { name: "", email: "", role: roles[0]?.id ?? "", active: true, password: "" });
    setErrors({});
    setError("");
  }, [open, user, roles]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      if (!isUnauthorized(err)) setError(messageOf(err, "Could not save."));
    } finally {
      setSaving(false);
    }
  };

  const err = (k: string) => errors[k] && <p className={fieldErrorClass}>{errors[k]}</p>;
  return (
    <Modal open={open} onClose={onClose} label={user ? "Edit user" : "Add user"} panelClassName="max-w-[520px]">
      <form onSubmit={submit} noValidate className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 md:p-8">
        <h2 className="admin-title font-display text-3xl">{user ? `Edit ${user.name}` : "Add a team member"}</h2>
        <div className="mt-6 grid gap-4">
          <div>
            <label htmlFor="u-name" className={labelClass}>
              Name
            </label>
            <input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
            {err("name")}
          </div>
          <div>
            <label htmlFor="u-email" className={labelClass}>
              Email (their sign-in)
            </label>
            <input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={fieldClass} />
            {err("email")}
          </div>
          <div>
            <label htmlFor="u-role" className={labelClass}>
              Role
            </label>
            <select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={fieldClass}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {err("role")}
          </div>
          <div>
            <label htmlFor="u-pass" className={labelClass}>
              {user ? "New password (leave empty to keep)" : "Password"}
            </label>
            <input id="u-pass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={fieldClass} />
            <p className="mt-1.5 text-[12.5px] text-soft">8+ characters with upper and lower case, a number and a symbol. Share it with them privately.</p>
            {err("password")}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active — can sign in
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-[#b3261e]">
            {error}
          </p>
        )}
        <div className="mt-7 flex justify-end gap-3">
          <ActionButton kind="ghost" onClick={onClose}>
            Cancel
          </ActionButton>
          <button type="submit" className="abtn abtn-add" disabled={saving}>
            {saving ? "Saving…" : "Save user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

