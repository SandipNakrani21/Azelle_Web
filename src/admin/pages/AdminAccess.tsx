import { useCallback, useEffect, useMemo, useState } from "react";
import { fieldClass } from "@/components/ui/Field";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminUsersApi, type Action, type AdminRole, type AdminUserRow, type ModuleInfo } from "../adminApi";
import { EmptyState, isUnauthorized, messageOf, NoticeBanner, PageHeader, useNotice } from "../ui";

// Letter + colour for each action in the access grid (the letter carries the meaning, not colour alone).
const ACTION_CHIP: Record<Action, { letter: string; label: string; tone: string }> = {
  view: { letter: "V", label: "View", tone: "bg-[#dfe9f7] text-[#1f4f8f]" },
  add: { letter: "A", label: "Add", tone: "bg-[#dcefe2] text-[#1f6a3c]" },
  update: { letter: "U", label: "Update", tone: "bg-[#fbecc8] text-[#7a5200]" },
  delete: { letter: "D", label: "Delete", tone: "bg-[#f6dedb] text-[#8c1d18]" },
  export: { letter: "E", label: "Export", tone: "bg-[#e6e1f6] text-[#4a3a8c]" },
};

type Person = { id: string; name: string; email: string; roleId: string; roleName: string; active: boolean; owner: boolean };

// System → User role access: who can do what, across every module. Changing a person's role here
// (with users.update) applies on their next click.
export default function AdminAccess() {
  const { guard, can, admin } = useAdminAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useNotice();

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
        list.push({ id: "owner", name: u.owner.name, email: u.owner.email, roleId: superRole?.id ?? "", roleName: u.owner.role, active: true, owner: true });
        for (const x of u.users as AdminUserRow[]) list.push({ id: x.id, name: x.name, email: x.email, roleId: x.role?._id ?? "", roleName: x.role?.name ?? "—", active: x.active, owner: false });
      }
      setPeople(list);
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not load access.") });
    }
  }, [guard, can, setNotice]);

  useEffect(() => {
    document.title = "User role access — Azelle admin";
    void load();
  }, [load]);

  const permsByRole = useMemo(() => new Map(roles.map((r) => [r.id, new Set(r.permissions)])), [roles]);

  const changeRole = async (person: Person, roleId: string) => {
    const user = person.owner ? null : { name: person.name, email: person.email, role: roleId, active: person.active, password: "" };
    if (!user) return;
    setSavingId(person.id);
    try {
      await guard(adminUsersApi.update(person.id, user));
      setNotice({ tone: "success", text: `${person.name} is now ${roles.find((r) => r.id === roleId)?.name}.` });
      await load();
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not change the role.") });
    } finally {
      setSavingId("");
    }
  };

  const shown = (people ?? []).filter(
    (p) => (!roleFilter || p.roleId === roleFilter) && (!query.trim() || `${p.name} ${p.email}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="User role access"
        subtitle="Every admin and what their role lets them do in each module. V = view, A = add, U = update, D = delete, E = export."
      />
      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      {!can("users.view") ? (
        <div className="mt-8">
          <EmptyState title="Users are hidden for your role" body="You can see roles, but not who has them. Ask a Super Admin for the Users → View permission." />
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

          {/* Legend */}
          <ul className="mt-4 flex flex-wrap gap-2 text-[12px]" aria-label="Legend">
            {actions.map((a) => (
              <li key={a} className="flex items-center gap-1.5">
                <span className={`grid h-5 w-5 place-items-center rounded-[5px] text-[10.5px] font-bold ${ACTION_CHIP[a].tone}`}>{ACTION_CHIP[a].letter}</span>
                {ACTION_CHIP[a].label}
              </li>
            ))}
          </ul>

          <div className="admin-card admin-rise mt-4 overflow-x-auto rounded-[20px]">
            {!people ? (
              <p className="p-10 text-center text-sm">Loading…</p>
            ) : (
              <table className="w-full min-w-[1040px] text-sm">
                <thead className="border-b border-line bg-surface2 text-[11px] uppercase tracking-[0.1em]">
                  <tr>
                    <th className="sticky left-0 z-10 bg-surface2 px-4 py-3 text-left font-semibold">Person</th>
                    <th className="px-3 py-3 text-left font-semibold">Role</th>
                    {modules.map((m) => (
                      <th key={m.key} className="px-2 py-3 text-center font-semibold">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((p, i) => {
                    const perms = permsByRole.get(p.roleId) ?? new Set<string>();
                    const editable = can("users.update") && !p.owner && admin?.email !== p.email;
                    return (
                      <tr key={p.id} className="admin-rise hover:bg-surface2/50" style={{ animationDelay: `${i * 40}ms` }}>
                        <td className="sticky left-0 z-10 bg-surface px-4 py-3">
                          <p className="font-semibold">
                            {p.name}
                            {!p.active && <span className="ml-2 rounded-full bg-[#ece8e1] px-2 py-0.5 text-[10px] font-bold uppercase text-[#5b5249]">Inactive</span>}
                          </p>
                          <p className="text-[12px] text-soft">{p.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          {editable ? (
                            <select
                              aria-label={`Role for ${p.name}`}
                              value={p.roleId}
                              disabled={savingId === p.id}
                              onChange={(e) => void changeRole(p, e.target.value)}
                              className="h-9 rounded-[8px] border border-line bg-surface px-2 text-[13px]"
                            >
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold">{p.roleName}</span>
                          )}
                        </td>
                        {modules.map((m) => {
                          const granted = m.actions.filter((a) => perms.has(`${m.key}.${a}`));
                          return (
                            <td key={m.key} className="px-2 py-3 text-center">
                              {granted.length === 0 ? (
                                <span className="text-soft" aria-label="No access">
                                  —
                                </span>
                              ) : (
                                <span className="inline-flex flex-wrap justify-center gap-0.5" aria-label={granted.map((a) => ACTION_CHIP[a].label).join(", ")}>
                                  {granted.map((a) => (
                                    <span key={a} className={`grid h-5 w-5 place-items-center rounded-[5px] text-[10.5px] font-bold ${ACTION_CHIP[a].tone}`} aria-hidden="true">
                                      {ACTION_CHIP[a].letter}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={modules.length + 2} className="px-4 py-10 text-center text-sm text-soft">
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
    </div>
  );
}
