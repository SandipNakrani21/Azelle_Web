import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { fieldClass, fieldErrorClass, labelClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminUsersApi, type Action, type AdminRole, type AdminUserRow, type ModuleInfo, type Permission, type RoleInput, type UserInput } from "../adminApi";
import { ActionButton, EmptyState, formatDateTime, IconButton, isUnauthorized, ListToolbar, messageOf, NoticeBanner, PageHeader, Pagination, useNotice } from "../ui";

type Tab = "users" | "roles";
/** One line in the user list (the main account included). */
type UserRowData = { id: string; name: string; email: string; phone: string; roleName: string; roleId: string; active: boolean; lastLoginAt: string | null; owner: boolean };
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
  /** The eye opens the same editor, read-only. */
  const [viewingRole, setViewingRole] = useState<AdminRole | null>(null);
  /** Clicking a role's user count lists the people who have it. */
  const [peopleOf, setPeopleOf] = useState<AdminRole | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<{ kind: "user" | "role"; id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const closeUser = useCallback(() => setEditingUser(null), []);
  const closeRole = useCallback(() => setEditingRole(null), []);
  const closeRoleView = useCallback(() => setViewingRole(null), []);
  const closePeople = useCallback(() => setPeopleOf(null), []);
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

  // ── The lists: search, then a page at a time ───────────────────────────
  const PER_PAGE = 10;
  const term = query.trim().toLowerCase();

  /** The main account (from the environment) sits at the top of the user list, read-only. */
  const allUsers: UserRowData[] = useMemo(
    () => [
      ...(owner ? [{ id: "owner", name: owner.name, email: owner.email, phone: "", roleName: owner.role, roleId: "", active: true, lastLoginAt: null, owner: true }] : []),
      ...(users ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? "",
        roleName: u.role?.name ?? "—",
        roleId: u.role?._id ?? "",
        active: u.active,
        lastLoginAt: u.lastLoginAt,
        owner: false,
      })),
    ],
    [owner, users],
  );

  const byId = new Map((users ?? []).map((u) => [u.id, u]));
  const shownUsers = allUsers.filter((u) => !term || `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(term));
  const userPages = Math.max(1, Math.ceil(shownUsers.length / PER_PAGE));
  const pagedUsers = shownUsers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const shownRoles = roles.filter((r) => !term || `${r.name} ${r.description}`.toLowerCase().includes(term));
  const rolePages = Math.max(1, Math.ceil(shownRoles.length / PER_PAGE));
  const pagedRoles = shownRoles.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /** Everyone who has the role whose count was clicked. */
  const rolePeople = peopleOf ? allUsers.filter((u) => (peopleOf.key === "super_admin" && u.owner) || u.roleId === peopleOf.id) : [];

  return (
    <div>
      <PageHeader
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

      <ListToolbar
        query={query}
        onQuery={(v) => {
          setQuery(v);
          setPage(1);
        }}
        placeholder={tab === "users" ? "Search name, email or mobile" : "Search roles"}
        right={tab === "users" ? `${shownUsers.length} shown` : `${shownRoles.length} of ${roles.length}`}
      />

      {tab === "users" ? (
        <div className="mt-5 space-y-3">
          {!users ? (
            <p className="py-10 text-center text-sm">Loading…</p>
          ) : (
            <>
              {pagedUsers.map((u, i) => (
                <UserRow
                  key={u.id}
                  delay={i * 60}
                  name={u.name}
                  email={u.email}
                  phone={u.phone ?? ""}
                  role={u.roleName}
                  note={u.owner ? "Main account (ADMIN_EMAIL) · can never be locked out" : u.lastLoginAt ? `Last sign-in ${formatDateTime(u.lastLoginAt)}` : "Never signed in"}
                  active={u.active}
                  you={admin?.email === u.email}
                  onEdit={u.owner || !can("users.update") ? undefined : () => setEditingUser(byId.get(u.id) ?? null)}
                  onDelete={u.owner || admin?.email === u.email || !can("users.delete") ? undefined : () => setDeleting({ kind: "user", id: u.id, name: u.name })}
                />
              ))}
              {shownUsers.length === 0 && (
                <EmptyState
                  title={query ? "Nobody matches that search" : "No team members yet"}
                  body={query ? "Try part of a name, an email or a mobile number." : "Add a user to give someone their own admin sign-in with limited access."}
                />
              )}
            </>
          )}
          <Pagination page={page} pages={userPages} total={shownUsers.length} onChange={setPage} />
        </div>
      ) : (
        /* Role list — the name opens the role, the count opens the people who have it. */
        <div className="mt-5">
          <div className="admin-card admin-rise overflow-x-auto rounded-[20px]">
            <table className="admin-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Role</th>
                  <th className="!text-center">Users</th>
                  <th>Access</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRoles.map((r, i) => {
                  const locked = r.key === "super_admin";
                  const share = totalPermissions ? r.permissions.length / totalPermissions : 0;
                  const people = r.userCount + (locked ? 1 : 0);
                  return (
                    <tr key={r.id} className="admin-rise" style={{ animationDelay: `${i * 50}ms` }}>
                      <td>
                        <button type="button" className="admin-link-title" onClick={() => setViewingRole(r)}>
                          {r.name}
                        </button>
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-soft">{r.system ? "Built-in" : "Custom"}</p>
                      </td>
                      <td className="!text-center">
                        {people > 0 ? (
                          <button type="button" className="admin-count" onClick={() => setPeopleOf(r)} aria-label={`Show the ${people} people with the ${r.name} role`}>
                            {people}
                          </button>
                        ) : (
                          <span className="text-soft">0</span>
                        )}
                      </td>
                      <td>
                        <p className="text-[13px] tabular-nums">
                          {r.permissions.length} of {totalPermissions} permissions
                        </p>
                        <span className="mt-1.5 block h-1.5 w-40 rounded-full bg-surface2" aria-hidden="true">
                          <span className="admin-fade block h-full rounded-full" style={{ width: `${share * 100}%`, background: "var(--menu-gradient)" }} />
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <IconButton kind="view" label={`View ${r.name} permissions`} onClick={() => setViewingRole(r)} />
                          {!locked && can("roles.update") && <IconButton kind="edit" label={`Edit ${r.name}`} onClick={() => setEditingRole(r)} />}
                          {!r.system && can("roles.delete") && (
                            <IconButton kind="delete" label={`Delete ${r.name}`} onClick={() => setDeleting({ kind: "role", id: r.id, name: r.name })} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {shownRoles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="!text-center text-soft">
                      No role matches that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={rolePages} total={shownRoles.length} onChange={setPage} />
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
      <RoleEditor
        open={viewingRole !== null}
        role={viewingRole}
        modules={modules}
        actions={actions}
        readOnly
        onClose={closeRoleView}
        onSave={async () => undefined}
      />
      {/* Who has this role — opened from the count in the Users column. */}
      <Modal from="right" open={peopleOf !== null} onClose={closePeople} label="People with this role" panelClassName="max-w-[560px]">
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 md:p-8">
          <h2 className="admin-title font-display text-3xl">{peopleOf?.name}</h2>
          <p className="mt-1 text-sm text-soft">
            {rolePeople.length} {rolePeople.length === 1 ? "person has" : "people have"} this role.
          </p>
          <ul className="mt-6 space-y-3">
            {rolePeople.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-[16px] border border-line bg-surface p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {p.name}
                    {p.owner && <span className="ml-2 rounded-full bg-[#f6ecdc] px-2 py-0.5 text-[10.5px] font-bold uppercase text-[#7a5200]">Main account</span>}
                    {!p.active && <span className="ml-2 rounded-full bg-[#ece8e1] px-2 py-0.5 text-[10.5px] font-bold uppercase text-[#5b5249]">Inactive</span>}
                  </p>
                  <p className="break-all text-[13px]">{p.email}</p>
                  <p className="text-[13px] tabular-nums text-soft">{p.phone || "No mobile number"}</p>
                </div>
                {!p.owner && admin?.email !== p.email && can("users.delete") && (
                  <IconButton
                    kind="delete"
                    label={`Delete ${p.name}`}
                    onClick={() => {
                      setPeopleOf(null);
                      setDeleting({ kind: "user", id: p.id, name: p.name });
                    }}
                  />
                )}
              </li>
            ))}
            {rolePeople.length === 0 && <li className="rounded-[16px] border border-dashed border-line p-6 text-center text-sm text-soft">Nobody has this role yet.</li>}
          </ul>
          <div className="mt-7 flex justify-end">
            <ActionButton kind="ghost" onClick={closePeople}>
              Close
            </ActionButton>
          </div>
        </div>
      </Modal>

      <Modal from="right" open={deleting !== null} onClose={closeDelete} label="Confirm delete">
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
      className="perm-box"
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
    <Modal from="right" open={open} onClose={onClose} label={role ? `${readOnly ? "View" : "Edit"} role` : "Add role"} panelClassName="max-w-[980px]">
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
            <table className="perm-table w-full min-w-[680px] text-sm">
              <thead className="perm-head">
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
                    <tr className="perm-group">
                      <td colSpan={actions.length + 2} className="px-4 py-2 text-[10.5px] font-bold uppercase tracking-[0.2em]">
                        {g}
                      </td>
                    </tr>
                    {modules
                      .filter((m) => m.group === g)
                      .map((m) => {
                        const rowKeys = m.actions.map((a) => key(m, a));
                        const rowCount = rowKeys.filter((k) => selected.has(k)).length;
                        return (
                          <tr key={m.key} className="border-t border-line">
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
  phone,
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
  phone: string;
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
        <p className="break-all text-[13px]">
          {email}
          {phone && <span className="ml-2 tabular-nums text-soft">· {phone}</span>}
        </p>
        <p className="text-[12px] text-soft">{note}</p>
      </div>
      <span className="rounded-full border border-line px-3 py-1 text-[12px] font-semibold">{role}</span>
      {(onEdit || onDelete) && (
        <div className="flex gap-2">
          {onEdit && <IconButton kind="edit" label={`Edit ${name}`} onClick={onEdit} />}
          {onDelete && <IconButton kind="delete" label={`Delete ${name}`} onClick={onDelete} />}
        </div>
      )}
    </div>
  );
}

function UserEditor({ open, user, roles, onClose, onSave }: { open: boolean; user: AdminUserRow | null; roles: AdminRole[]; onClose: () => void; onSave: (input: UserInput) => Promise<void> }) {
  const [form, setForm] = useState<UserInput>({ name: "", email: "", phone: "", role: "", active: true, password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      user
        ? { name: user.name, email: user.email, phone: user.phone ?? "", role: user.role?._id ?? "", active: user.active, password: "" }
        : { name: "", email: "", phone: "", role: roles[0]?.id ?? "", active: true, password: "" },
    );
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
    <Modal from="right" open={open} onClose={onClose} label={user ? "Edit user" : "Add user"} panelClassName="max-w-[520px]">
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
            <label htmlFor="u-phone" className={labelClass}>
              Mobile <span className="font-normal normal-case tracking-normal text-soft">(optional)</span>
            </label>
            <input
              id="u-phone"
              inputMode="numeric"
              autoComplete="off"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              className={fieldClass}
              placeholder="9876543210"
            />
            {err("phone")}
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

