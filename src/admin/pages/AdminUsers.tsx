import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { fieldClass, fieldErrorClass, labelClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminUsersApi, type AdminRole, type AdminUserRow, type Permission, type PermissionInfo, type RoleInput, type UserInput } from "../adminApi";
import { ActionButton, Card, EmptyState, formatDateTime, isUnauthorized, messageOf, NoticeBanner, PageHeader, useNotice } from "../ui";

type Tab = "users" | "roles";

// Users & roles (RBAC): who can sign in to the admin, and what each role may do.
export default function AdminUsers() {
  const { guard, admin } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [owner, setOwner] = useState<{ name: string; email: string } | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<PermissionInfo[]>([]);
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
      const [u, r, p] = await Promise.all([guard(adminUsersApi.list()), guard(adminUsersApi.roles()), guard(adminUsersApi.permissions())]);
      setOwner(u.owner);
      setUsers(u.users);
      setRoles(r.roles);
      setPermissions(p.permissions);
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not load users.") });
    }
  }, [guard, setNotice]);

  useEffect(() => {
    document.title = "Users & roles — Azelle admin";
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

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="Users & roles"
        subtitle="Give your team their own sign-in. Each person has one role, and a role decides which pages and actions they can use."
        actions={
          tab === "users" ? (
            <ActionButton kind="add" onClick={() => setEditingUser("new")} disabled={!roles.length}>
              Add user
            </ActionButton>
          ) : (
            <ActionButton kind="add" onClick={() => setEditingRole("new")}>
              Add role
            </ActionButton>
          )
        }
      />
      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      <div className="mt-8 inline-flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Users or roles">
        {(["users", "roles"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${tab === t ? "text-[#1b1815] shadow-md" : "text-soft hover:text-ink"}`}
            style={tab === t ? { background: "linear-gradient(110deg,#e6b45a,#e9a58f,#9fc2ad)" } : undefined}
          >
            {t === "users" ? `Users (${(users?.length ?? 0) + 1})` : `Roles (${roles.length + 1})`}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <div className="mt-6 space-y-3">
          {!users ? (
            <p className="py-10 text-center text-sm">Loading…</p>
          ) : (
            <>
              {owner && <UserRow name={owner.name} email={owner.email} role="Owner" note="Set in environment variables · all permissions" active you={Boolean(admin?.owner)} />}
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
                  onEdit={() => setEditingUser(u)}
                  onDelete={admin?.email === u.email ? undefined : () => setDeleting({ kind: "user", id: u.id, name: u.name })}
                />
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <RoleHeader name="Owner" users={1} />
            <p className="mt-2 text-sm">Full access to everything. Belongs to the ADMIN_EMAIL account and can't be changed here.</p>
          </Card>
          {roles.map((r, i) => (
            <Card key={r.id} delay={(i + 1) * 60} className="flex flex-col">
              <RoleHeader name={r.name} users={r.userCount} />
              {r.description && <p className="mt-2 text-sm">{r.description}</p>}
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {r.permissions.map((p) => (
                  <li key={p} className="rounded-full bg-surface2 px-2.5 py-1 text-[11.5px]">
                    {permissions.find((x) => x.key === p)?.label ?? p}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-2 pt-4">
                <ActionButton kind="edit" className="flex-1" onClick={() => setEditingRole(r)}>
                  Edit
                </ActionButton>
                <ActionButton kind="delete" className="flex-1" onClick={() => setDeleting({ kind: "role", id: r.id, name: r.name })}>
                  Delete
                </ActionButton>
              </div>
            </Card>
          ))}
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
        permissions={permissions}
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

function RoleHeader({ name, users }: { name: string; users: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="admin-title font-display text-2xl">{name}</p>
      <span className="rounded-full bg-surface2 px-2.5 py-1 text-[11px] font-semibold">
        {users} {users === 1 ? "user" : "users"}
      </span>
    </div>
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

function RoleEditor({ open, role, permissions, onClose, onSave }: { open: boolean; role: AdminRole | null; permissions: PermissionInfo[]; onClose: () => void; onSave: (input: RoleInput) => Promise<void> }) {
  const [form, setForm] = useState<RoleInput>({ name: "", description: "", permissions: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const groups = useMemo(() => [...new Set(permissions.map((p) => p.group))], [permissions]);

  useEffect(() => {
    if (!open) return;
    setForm(role ? { name: role.name, description: role.description, permissions: role.permissions } : { name: "", description: "", permissions: [] });
    setErrors({});
    setError("");
  }, [open, role]);

  const toggle = (key: Permission) =>
    setForm((f) => ({ ...f, permissions: f.permissions.includes(key) ? f.permissions.filter((p) => p !== key) : [...f.permissions, key] }));

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

  return (
    <Modal open={open} onClose={onClose} label={role ? "Edit role" : "Add role"} panelClassName="max-w-[620px]">
      <form onSubmit={submit} noValidate className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 md:p-8">
        <h2 className="admin-title font-display text-3xl">{role ? `Edit ${role.name}` : "New role"}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="r-name" className={labelClass}>
              Role name
            </label>
            <input id="r-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} placeholder="e.g. Warehouse" />
            {errors.name && <p className={fieldErrorClass}>{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="r-desc" className={labelClass}>
              Description
            </label>
            <input id="r-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldClass} />
          </div>
        </div>
        <fieldset className="mt-6">
          <legend className={labelClass}>Permissions</legend>
          {errors.permissions && <p className={fieldErrorClass}>{errors.permissions}</p>}
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g} className="rounded-[14px] border border-line p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-soft">{g}</p>
                <div className="mt-2 space-y-2">
                  {permissions
                    .filter((p) => p.group === g)
                    .map((p) => (
                      <label key={p.key} className="flex cursor-pointer items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" checked={form.permissions.includes(p.key)} onChange={() => toggle(p.key)} />
                        {p.label}
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
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
            {saving ? "Saving…" : "Save role"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
