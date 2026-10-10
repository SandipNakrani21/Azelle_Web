import { useCallback, useEffect, useState, type FormEvent } from "react";
import { fieldClass, fieldErrorClass, labelClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { IconEdit, IconPlus, IconTrash } from "../icons";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminAnnouncementsApi, type AdminAnnouncement, type AnnouncementInput } from "../adminApi";
import { EmptyState, ExportButton, FilterSelect, formatDateTime, isUnauthorized, ListToolbar, messageOf, NoticeBanner, PageHeader, Pagination, useNotice } from "../ui";

// Catalogue → Announcements. A launch or an offer shows as a popup the first time someone lands on
// the storefront, then lives in the "What's new" ribbon on the right edge of every page.

const EMPTY: AnnouncementInput = {
  eyebrow: "",
  title: "",
  message: "",
  ctaLabel: "",
  ctaHref: "",
  placement: "both",
  tone: "gradient",
  image: "",
  active: true,
  startsAt: "",
  endsAt: "",
  priority: 0,
  dismissDays: 7,
};

/** <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toInput = (a: AdminAnnouncement): AnnouncementInput => ({
  eyebrow: a.eyebrow,
  title: a.title,
  message: a.message,
  ctaLabel: a.ctaLabel,
  ctaHref: a.ctaHref,
  placement: a.placement,
  tone: a.tone,
  image: a.image,
  active: a.active,
  startsAt: toLocalInput(a.startsAt),
  endsAt: toLocalInput(a.endsAt),
  priority: a.priority,
  dismissDays: a.dismissDays,
});

function state(a: AdminAnnouncement): { text: string; tone: string } {
  if (!a.active) return { text: "Paused", tone: "bg-[#ece8e1] text-[#5b5249]" };
  if (a.live) return { text: "Live", tone: "bg-[#dcefe2] text-[#1f6a3c]" };
  if (a.startsAt && new Date(a.startsAt) > new Date()) return { text: "Scheduled", tone: "bg-[#dfe9f7] text-[#1f4f8f]" };
  return { text: "Ended", tone: "bg-[#f6dedb] text-[#8c1d18]" };
}

const PLACEMENT_TEXT: Record<AdminAnnouncement["placement"], string> = {
  both: "Popup + ribbon",
  popup: "Popup only",
  ribbon: "Ribbon only",
};

export default function AdminAnnouncements() {
  const { guard, can } = useAdminAuth();
  const [items, setItems] = useState<AdminAnnouncement[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useNotice();
  const [editing, setEditing] = useState<AdminAnnouncement | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminAnnouncement | null>(null);
  const [busy, setBusy] = useState(false);
  const closeEditor = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  const load = useCallback(async () => {
    try {
      setItems((await guard(adminAnnouncementsApi.list())).announcements);
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not load announcements.") });
    }
  }, [guard, setNotice]);

  useEffect(() => {
    document.title = "Announcements — Azelle admin";
    void load();
  }, [load]);

  const togglePause = async (a: AdminAnnouncement) => {
    try {
      await guard(adminAnnouncementsApi.update(a.id, { ...toInput(a), active: !a.active }));
      setNotice({ tone: "success", text: a.active ? `"${a.title}" is paused.` : `"${a.title}" is live.` });
      await load();
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not update the announcement.") });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await guard(adminAnnouncementsApi.remove(deleting.id));
      setItems((list) => list?.filter((a) => a.id !== deleting.id) ?? null);
      setNotice({ tone: "success", text: `"${deleting.title}" was deleted.` });
      setDeleting(null);
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not delete the announcement.") });
    } finally {
      setBusy(false);
    }
  };

  const PER_PAGE = 8;
  const term = query.trim().toLowerCase();
  const shown = (items ?? []).filter((a) => {
    const matches = !term || `${a.title} ${a.message} ${a.eyebrow}`.toLowerCase().includes(term);
    const s = state(a).text;
    return matches && (!status || s === status);
  });
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const paged = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="New launches, offers and notices. The top live one greets first-time visitors as a popup; after that every announcement waits in the “What's new” ribbon on the right of the storefront."
        actions={
          <>
            <ExportButton path="/api/admin/announcements/export" perm="announcements.export" />
            {can("announcements.add") && (
              <button type="button" className="abtn abtn-add" onClick={() => setEditing("new")}>
                <IconPlus size={16} /> New announcement
              </button>
            )}
          </>
        }
      />
      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      <ListToolbar
        query={query}
        onQuery={(v) => {
          setQuery(v);
          setPage(1);
        }}
        placeholder="Search announcements"
        right={items ? `${shown.length} of ${items.length}` : undefined}
      >
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "Any status" },
            { value: "Live", label: "Live" },
            { value: "Scheduled", label: "Scheduled" },
            { value: "Paused", label: "Paused" },
            { value: "Ended", label: "Ended" },
          ]}
        />
      </ListToolbar>

      <div className="mt-5">
        {!items ? (
          <p className="py-16 text-center text-sm" role="status">
            Loading announcements…
          </p>
        ) : shown.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? "Nothing announced yet" : "Nothing matches"}
            body={
              items.length === 0
                ? "Write your first announcement — a launch, a festive offer or a delivery notice — and it appears on the storefront straight away."
                : "Try another word, or set the status filter back to “Any status”."
            }
            action={
              items.length === 0 && can("announcements.add") ? (
                <button type="button" className="abtn abtn-add" onClick={() => setEditing("new")}>
                  <IconPlus size={16} /> New announcement
                </button>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {paged.map((a, i) => {
              const s = state(a);
              return (
                <li key={a.id} className="admin-card admin-rise flex flex-col rounded-[20px] p-5" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {a.eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-soft">{a.eyebrow}</p>}
                      <h3 className="mt-1 font-display text-2xl leading-tight">{a.title}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${s.tone}`}>{s.text}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{a.message}</p>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                    <div className="flex justify-between gap-2">
                      <dt className="text-soft">Shows as</dt>
                      <dd className="text-right">{PLACEMENT_TEXT[a.placement]}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-soft">Priority</dt>
                      <dd className="tabular-nums">{a.priority}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-soft">Starts</dt>
                      <dd className="text-right">{a.startsAt ? formatDateTime(a.startsAt) : "Right away"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-soft">Ends</dt>
                      <dd className="text-right">{a.endsAt ? formatDateTime(a.endsAt) : "No end"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-soft">Button</dt>
                      <dd className="truncate text-right">{a.ctaHref ? `${a.ctaLabel || "Discover"} → ${a.ctaHref}` : "None"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-soft">Comes back after</dt>
                      <dd>{a.dismissDays === 0 ? "Next visit" : `${a.dismissDays} days`}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex gap-4 rounded-[12px] bg-surface2 px-4 py-2.5 text-[13px]">
                    <span>
                      <strong className="tabular-nums">{a.views}</strong> <span className="text-soft">shown</span>
                    </span>
                    <span>
                      <strong className="tabular-nums">{a.clicks}</strong> <span className="text-soft">clicked</span>
                    </span>
                    <span>
                      <strong className="tabular-nums">{a.dismissals}</strong> <span className="text-soft">dismissed</span>
                    </span>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    {can("announcements.update") && (
                      <>
                        <button type="button" className="abtn abtn-edit flex-1" onClick={() => setEditing(a)}>
                          <IconEdit size={16} /> Edit
                        </button>
                        <button type="button" className="abtn abtn-ghost flex-1" onClick={() => void togglePause(a)}>
                          {a.active ? "Pause" : "Publish"}
                        </button>
                      </>
                    )}
                    {can("announcements.delete") && (
                      <button type="button" className="abtn abtn-delete" onClick={() => setDeleting(a)}>
                        <IconTrash size={16} /> Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination page={page} pages={pages} total={shown.length} onChange={setPage} />
      </div>

      <AnnouncementEditor
        open={editing !== null}
        announcement={editing === "new" ? null : editing}
        onClose={closeEditor}
        onSave={async (input) => {
          const target = editing;
          await guard(target && target !== "new" ? adminAnnouncementsApi.update(target.id, input) : adminAnnouncementsApi.create(input));
          setNotice({ tone: "success", text: `"${input.title}" saved.` });
          setEditing(null);
          await load();
        }}
      />

      <Modal from="right" open={deleting !== null} onClose={closeDelete} label="Delete announcement">
        <div className="p-7 md:p-8">
          <h2 className="admin-title font-display text-3xl">Delete this announcement?</h2>
          <p className="mt-3 text-sm">“{deleting?.title}” disappears from the storefront. To stop showing it without losing it, pause it instead.</p>
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

function AnnouncementEditor({
  open,
  announcement,
  onClose,
  onSave,
}: {
  open: boolean;
  announcement: AdminAnnouncement | null;
  onClose: () => void;
  onSave: (input: AnnouncementInput) => Promise<void>;
}) {
  const [form, setForm] = useState<AnnouncementInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(announcement ? toInput(announcement) : EMPTY);
    setErrors({});
    setError("");
  }, [open, announcement]);

  const set = <K extends keyof AnnouncementInput>(key: K, value: AnnouncementInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setErrors({});
    try {
      await onSave({ ...form, title: form.title.trim(), message: form.message.trim() });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      if (!isUnauthorized(err)) setError(messageOf(err, "Could not save the announcement."));
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) => errors[key] && <p className={fieldErrorClass}>{errors[key]}</p>;

  return (
    <Modal from="right" open={open} onClose={onClose} label={announcement ? "Edit announcement" : "New announcement"} panelClassName="max-w-[640px]">
      <form onSubmit={submit} className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 md:p-8" noValidate>
        <h2 className="admin-title font-display text-3xl">{announcement ? "Edit announcement" : "New announcement"}</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="an-eyebrow" className={labelClass}>
              Small line above
            </label>
            <input id="an-eyebrow" value={form.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className={fieldClass} placeholder="New launch" />
            {fieldError("eyebrow")}
          </div>
          <div>
            <label htmlFor="an-priority" className={labelClass}>
              Priority
            </label>
            <input
              id="an-priority"
              type="number"
              min={-100}
              max={100}
              value={form.priority}
              onChange={(e) => set("priority", Number(e.target.value))}
              className={fieldClass}
            />
            <p className="mt-1 text-[12px] text-soft">Higher shows first — the top one is the popup.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="an-title" className={labelClass}>
              Title
            </label>
            <input id="an-title" value={form.title} onChange={(e) => set("title", e.target.value)} className={fieldClass} placeholder="Imperium is here" />
            {fieldError("title")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="an-message" className={labelClass}>
              Message
            </label>
            <textarea
              id="an-message"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              rows={3}
              className={`${fieldClass} h-auto py-3`}
              placeholder="Our new aromatic fruity extrait, composed slowly and bottled in small batches."
            />
            {fieldError("message")}
          </div>
          <div>
            <label htmlFor="an-cta" className={labelClass}>
              Button label
            </label>
            <input id="an-cta" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} className={fieldClass} placeholder="Shop the launch" />
            {fieldError("ctaLabel")}
          </div>
          <div>
            <label htmlFor="an-href" className={labelClass}>
              Button link
            </label>
            <input id="an-href" value={form.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} className={fieldClass} placeholder="/product/imperium" />
            {fieldError("ctaHref")}
          </div>
          <div>
            <label htmlFor="an-placement" className={labelClass}>
              Show as
            </label>
            <select id="an-placement" value={form.placement} onChange={(e) => set("placement", e.target.value as AnnouncementInput["placement"])} className={fieldClass}>
              <option value="both">Popup, then the ribbon</option>
              <option value="popup">Popup only</option>
              <option value="ribbon">Ribbon only (no popup)</option>
            </select>
          </div>
          <div>
            <label htmlFor="an-tone" className={labelClass}>
              Look
            </label>
            <select id="an-tone" value={form.tone} onChange={(e) => set("tone", e.target.value as AnnouncementInput["tone"])} className={fieldClass}>
              <option value="gradient">Azelle gradient</option>
              <option value="light">Plain / light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="an-image" className={labelClass}>
              Image link
            </label>
            <input id="an-image" value={form.image} onChange={(e) => set("image", e.target.value)} className={fieldClass} placeholder="/uploads/launch.jpg" />
            <p className="mt-1 text-[12px] text-soft">Optional — a product photo you have already uploaded.</p>
            {fieldError("image")}
          </div>
          <div>
            <label htmlFor="an-starts" className={labelClass}>
              Starts
            </label>
            <input id="an-starts" type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={fieldClass} />
            <p className="mt-1 text-[12px] text-soft">Leave blank to start now.</p>
            {fieldError("startsAt")}
          </div>
          <div>
            <label htmlFor="an-ends" className={labelClass}>
              Ends
            </label>
            <input id="an-ends" type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} className={fieldClass} />
            <p className="mt-1 text-[12px] text-soft">Leave blank to keep it running.</p>
            {fieldError("endsAt")}
          </div>
          <div>
            <label htmlFor="an-dismiss" className={labelClass}>
              Comes back after (days)
            </label>
            <input
              id="an-dismiss"
              type="number"
              min={0}
              max={365}
              value={form.dismissDays}
              onChange={(e) => set("dismissDays", Number(e.target.value))}
              className={fieldClass}
            />
            <p className="mt-1 text-[12px] text-soft">How long a dismissed popup stays away. 0 = next visit.</p>
          </div>
          <label className="flex items-end gap-3 pb-3 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4" />
            Publish on the storefront
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
            {saving ? "Saving…" : "Save announcement"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
