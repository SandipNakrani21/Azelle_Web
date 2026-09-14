import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon, SearchIcon } from "@/components/ui/Icons";

type Option = { value: string; label: string };

type MultiSelectProps = {
  /** Accessible name, e.g. "Notes". */
  label: string;
  /** Shown when nothing is selected, e.g. "All notes". */
  allLabel: string;
  /** Plural noun for the summary, e.g. "notes" → "3 notes selected". */
  plural: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Adds a search box inside the panel (for long lists). */
  searchable?: boolean;
};

// Dropdown with a checkbox list: pick any number of options. Closes on outside click, Escape or Done.
export function MultiSelect({ label, allLabel, plural, options, selected, onChange, searchable = false }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      setFilter("");
      return;
    }
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const chosen = options.filter((o) => selected.includes(o.value));
  const summary = chosen.length === 0 ? allLabel : chosen.length <= 2 ? chosen.map((o) => o.label).join(", ") : `${chosen.length} ${plural} selected`;
  const visible = filter ? options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase())) : options;
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-14 w-full items-center gap-2 rounded-[12px] border bg-bg px-4 text-left text-[16px] transition-colors duration-300 hover:border-ink ${open ? "border-ink" : "border-line"}`}
      >
        <span className="sr-only">{label}: </span>
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        {chosen.length > 0 && (
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-ink px-1.5 text-[12px] font-semibold text-bg" aria-hidden="true">
            {chosen.length}
          </span>
        )}
        <ChevronDownIcon className={`shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          className="menu-panel absolute left-0 top-full z-30 mt-2 w-full min-w-[270px] rounded-[16px] border border-line bg-surface p-3 shadow-[0_18px_40px_rgba(27,24,21,.16)]"
        >
          {searchable && (
            <div className="relative mb-2">
              <label htmlFor={`${panelId}-search`} className="sr-only">
                Search {plural}
              </label>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" width={16} height={16} aria-hidden="true" />
              <input
                id={`${panelId}-search`}
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Search ${plural}`}
                autoFocus
                className="h-11 w-full rounded-[10px] border border-line bg-bg pl-9 pr-3 text-[15px] outline-none focus:border-ink"
              />
            </div>
          )}
          <fieldset>
            <legend className="sr-only">{label}</legend>
            <ul className="max-h-[280px] space-y-0.5 overflow-y-auto">
              {visible.map((o) => (
                <li key={o.value}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] transition-colors duration-200 hover:bg-bg">
                    <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} className="h-4 w-4 shrink-0" style={{ accentColor: "var(--ink)" }} />
                    {o.label}
                  </label>
                </li>
              ))}
              {visible.length === 0 && <li className="px-3 py-2.5 text-sm">No matches</li>}
            </ul>
          </fieldset>
          <div className="mt-2 flex items-center justify-between border-t border-line px-1 pt-3">
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={selected.length === 0}
              className="link-underline text-[12px] font-semibold uppercase tracking-[0.14em] disabled:opacity-40"
            >
              Clear
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-primary !h-9 !min-w-0 !px-5 !text-[12px]">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
