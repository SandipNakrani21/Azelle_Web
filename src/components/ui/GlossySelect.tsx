import { useEffect, useId, useRef, useState } from "react";

type Option = { id: string; label: string };

export function GlossySelect({ value, options, onChange, label }: { value: string; options: readonly Option[]; onChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const selected = Math.max(0, options.findIndex(option => option.id === value));
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const show = () => { setActive(selected); setOpen(true); };
  useEffect(() => {
    if (!open) return;
    optionRefs.current[active]?.focus();
  }, [open, active]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div className="glossy-select" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <button ref={trigger} type="button" className="glossy-select-trigger" aria-label={`${label}: ${options[selected].label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
      onClick={() => open ? close() : show()} onKeyDown={event => { if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); setActive(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : selected); setOpen(true); } }}>
      <span>{label}: {options[selected].label}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    {open && <div id={id} role="listbox" aria-label={label} className="glossy-select-menu" onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); setActive(index => event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length); }
      else if (event.key.length === 1 && event.key !== " ") { const index = options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase())); if (index >= 0) setActive(index); }
    }}>
      {options.map((option, index) => <button key={option.id} ref={element => { optionRefs.current[index] = element; }} type="button" role="option" aria-selected={option.id === value} tabIndex={active === index ? 0 : -1} className="glossy-select-option" onFocus={() => setActive(index)} onClick={() => { onChange(option.id); close(); }}>
        <span>{option.label}</span>{option.id === value && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>}
      </button>)}
    </div>}
  </div>;
}
