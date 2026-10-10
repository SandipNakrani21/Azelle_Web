import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { fieldClass, labelClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminUsersApi, type Action, type AdminRole, type AdminUserRow, type ModuleInfo } from "../adminApi";
import { ActionButton, EmptyState, IconButton, isUnauthorized, messageOf, NoticeBanner, PageHeader, useNotice } from "../ui";

// System â User role access: the people who can sign in and the role each one has.
// The eye shows exactly what that role may do; the pencil moves them to another role
// (with the same permissions shown live as you pick).

const ACTION_LABELS: Record<Action, string> = { view: "View", add: "Add", update: "Update", delete: "Delete", export: "Export" };

type Person = { id: string; name: string; email: string; phone: string; roleId: string; roleName: string; active: boolean; owner: boolean };

/** Read-only version of the role editor's matrix: what this role can do, module by module. */
function PermissionGrid({ modules, actions, permissions }: { modules: ModuleInfo[]; actions: Action[]; permissions: Set<string> }) {
  const groups = [...new Set(modules.map((m) => m.group))];
  return (
    <div className="overflow-x-auto rounded-[16px] border border-line">
      <table className="perm-table w-full min-w-[620px] text-sm">
        <thead className="perm-head">
          <tr>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em]">Module</th>
            {actions.map((a) => (
              <th key={a} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em]">
                {ACTION_LABELS[a]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g}>
              <tr className="perm-group">
                <td colSpan={actions.length + 1} className="px-4 py-2 text-[10.5px] font-bold uppercase tracking-[0.2em]">
                  {g}
                </td>
              </tr>
              {modules
                .filter((m) => m.group === g)
                .map((m) => (
                  <tr key={m.key} className="border-t border-line">
                    <td className="px-4 py-2.5 font-semibold">{m.label}</td>
                    {actions.map((a) => (
                      <td key={a} className="px-3 py-2.5 text-center">
                        {!m.actions.includes(a) ? (
                          <span className="text-soft" aria-label="Not applicable">
                            â
                          </span>
                        ) : permissions.has(`${m.key}.${a}`) ? (
                          <span className="perm-yes" role="img" aria-label={`${m.label}: ${ACTION_LABELS[a]} allowed`} />
                        ) : (
                          <span className="perm-no" role="img" aria-label={`${m.label}: ${ACTION_LABELS[a]} not allowed`} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAccess() {
  const { guard, can, admin } = useAdminAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Person | null>(null);
  const [editing, setEditing] = useState<Person | null>(null);
  const [draftRole, setDraftRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useNotice();

  const closeView = useCallback(() => setViewing(null), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  const load = useCallback(async () => {
    try {
      const [r, p, u] = await Promise.all([
        guard(adminUsersApi.roles()),
        guard(adminUsersApi.permissions()),
        can("users.view") ? guard(adminUsersApi.list()) : Promise.resolve(null),
      ]);
      setRoles(r.roles);
      setModules(p.modules);
      setActions(p.actions);
      const superRole = r.roles.find((x) => x.key === "super_admin");
      const list: Person[] = [];
      if (u) {
        list.push({ id: "owner", name: u.owner.name, email: u.owner.email, phone: "", roleId: superRole?.id ?? "", roleName: u.owner.role, active: true, owner: true });
        for (const x of u.users as AdminUserRow[]) {
          list.push({ id: x.id, name: x.name, email: x.email, phone: x.phone ?? "", roleId: x.role?._id ?? "", roleName: x.role?.name ?? "—", active: x.active, owner: false });
        }
      }
      setPeople(list);
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not load access.") });
    }
  }, [guard, can, setNotice]);

  useEffect(() => {
    document.title = "User role access â Azelle admin";
    void load();
  }, [load]);

  const permsByRole = useMemo(() => new Map(roles.map((r) => [r.id, new Set(r.permissions)])), [roles]);
  const shown = (people ?? []).filter(
    (p) => (!roleFilter || p.roleId === roleFilter) && (!query.trim() || `${p.name} ${p.email}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const startEdit = (person: Person) => {
    setDraftRole(person.roleId);
    setEditing(person);
  };

  const saveRole = async () => {
    if (!editing || !draftRole) return;
    setSaving(true);
    try {
      await guard(adminUsersApi.update(editing.id, { name: editing.name, email: editing.email, phone: editing.phone, role: draftRole, active: editing.active, password: "" }));
      setNotice({ tone: "success", text: `${editing.name} is now ${roles.find((r) => r.id === draftRole)?.name}.` });
      setEditing(null);
      await load();
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not change the role.") });
    } finally {
      setSaving(false);
    }
  };

  const viewPerms = viewing ? (permsByRole.get(viewing.roleId) ?? new Set<string>()) : new Set<string>();
  const draftPerms = permsByRole.get(draftRole) ?? new Set<string>();
  const total = modules.reduce((n, m) => n + m.actions.length, 0);

  return (
    <div>
      <PageHeader title="User role access" subtitle="Everyone who can sign in, and the role they have. Open the eye to see exactly what that role allows." />
      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      {!can("users.view") ? (
        <div className="mt-8">
          <EmptyState title="Users are hidden for your role" body="You can see roles, but not who has them. Ask a Super Admin for the Users â View permission." />
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="access-q" className="sr-only">
              Search people
            </label>
            <input id="access-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className={`${fieldClass} !mt-0 flex-1`} />
            <label htmlFor="access-role" className="sr-only">
              Filter by role
            </label>
            <select id="access-role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`${fieldClass} !mt-0 sm:w-56`}>
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-card admin-rise mt-4 overflow-hidden rounded-[20px]">
            {!people ? (
              <p className="p-10 text-center text-sm">Loadingâ¦</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface2 text-[11px] uppercase tracking-[0.1em]">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Person</th>
                    <th className="px-5 py-3 text-left font-semibold">Role</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((p, i) => {
                    const perms = permsByRole.get(p.roleId) ?? new Set<string>();
                    const editable = can("users.update") && !p.owner && admin?.email !== p.email;
                    return (
                      <tr key={p.id} className="admin-rise hover:bg-surface2/50" style={{ animationDelay: `${i * 40}ms` }}>
                        <td className="px-5 py-4">
                          <p className="font-semibold">
                            {p.name}
                            {!p.active && <span className="ml-2 rounded-full bg-[#ece8e1] px-2 py-0.5 text-[10px] font-bold uppercase text-[#5b5249]">Inactive</span>}
                          </p>
                          <p className="text-[12.5px] text-soft">{p.email}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full border border-line px-3 py-1 text-[12px] font-semibold">{p.roleName}</span>
                          <span className="ml-2 text-[12px] tabular-nums text-soft">
                            {perms.size} of {total}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <IconButton kind="view" label={`View what ${p.name} can do`} onClick={() => setViewing(p)} />
                            {editable && <IconButton kind="edit" label={`Change ${p.name}'s role`} onClick={() => startEdit(p)} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-10 text-center text-sm text-soft">
                        No one matches.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Look: the role's permissions, read-only. */}
      <Modal from="right" open={viewing !== null} onClose={closeView} label="Permissions" panelClassName="max-w-[860px]">
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="admin-title font-display text-3xl">{viewing?.name}</h2>
              <p className="mt-1 text-sm text-soft">
                {viewing?.email} Â· {viewing?.roleName}
              </p>
            </div>
            <span className="rounded-full bg-surface2 px-3 py-1 text-[12px] font-semibold tabular-nums">
              {viewPerms.size} of {total} permissions
            </span>
          </div>
          <div className="mt-6">
            <PermissionGrid modules={modules} actions={actions} permissions={viewPerms} />
          </div>
          <div className="mt-7 flex justify-end">
            <ActionButton kind="ghost" onClick={closeView}>
              Close
            </ActionButton>
          </div>
        </div>
      </Modal>

      {/* Change: pick another role and see what it allows before saving. */}
      <Modal from="right" open={editing !== null} onClose={closeEdit} label="Change role" panelClassName="max-w-[860px]">
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 md:p-8">
          <h2 className="admin-title font-display text-3xl">Change {editing?.name}&rsquo;s role</h2>
          <p className="mt-1 text-sm text-soft">{editing?.email} Â· applies on their next click</p>

          <div className="mt-6 max-w-sm">
            <label htmlFor="access-new-role" className={labelClass}>
              Role
            </label>
            <select id="access-new-role" value={draftRole} onChange={(e) => setDraftRole(e.target.value)} className={fieldClass}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[12.5px] text-soft">{roles.find((r) => r.id === draftRole)?.description}</p>
          </div>

          <div className="mt-6">
            <p className={labelClass}>
              What this role allows{" "}
              <span className="ml-1 font-normal normal-case tracking-normal text-soft">
                ({draftPerms.size} of {total})
              </span>
            </p>
            <div className="mt-3">
              <PermissionGrid modules={modules} actions={actions} permissions={draftPerms} />
            </div>
            <p className="mt-2 text-[12.5px] text-soft">To change what a role allows, open System â Roles.</p>
          </div>

          <div className="mt-7 flex justify-end gap-3">
            <ActionButton kind="ghost" onClick={closeEdit}>
              Cancel
            </ActionButton>
            <button type="button" className="abtn abtn-add" disabled={saving || !draftRole || draftRole === editing?.roleId} onClick={() => void saveRole()}>
              {saving ? "Savingâ¦" : "Save role"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
