import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { applyTheme, DEFAULT_THEME, storedTheme, THEMES, THEME_PAGES, THEME_STORAGE_KEY, type ThemeId } from "@/lib/themes";

// Design tool only — rendered when VITE_SHOW_THEME_RAIL=true.
export function ThemeRail() {
  const [active, setActive] = useState<ThemeId>(DEFAULT_THEME);
  const { pathname } = useLocation();

  useEffect(() => {
    setActive(storedTheme());
  }, []);

  // A theme that is only being tried on some pages goes back to the default elsewhere.
  useEffect(() => {
    applyTheme(active, pathname);
  }, [active, pathname]);

  function select(id: ThemeId) {
    applyTheme(id, pathname);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // Storage unavailable (private mode); the switch still applies for this visit.
    }
    setActive(id);
  }

  return (
    <nav
      aria-label="Theme (design tool)"
      className="fixed right-4 top-1/2 z-[60] flex -translate-y-1/2 flex-col gap-2 rounded-full border border-line bg-surface p-2 shadow-[0_10px_30px_rgba(0,0,0,.12)]"
    >
      {THEMES.map((theme) => {
        const isActive = theme.id === active;
        const mid = "mid" in theme.swatch ? theme.swatch.mid : null;
        const limited = Boolean(THEME_PAGES[theme.id]);
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => select(theme.id)}
            aria-pressed={isActive}
            title={`${theme.label} — ${theme.fonts}${limited ? " · landing and product pages only" : ""}`}
            className={`group relative h-8 w-8 rounded-full border duration-300 ease-reveal hover:scale-110 ${
              isActive ? "border-accent ring-1 ring-accent ring-offset-2 ring-offset-surface" : "border-line"
            }`}
            style={{
              background: mid
                ? `linear-gradient(135deg, ${theme.swatch.bg} 0 38%, ${mid} 38% 66%, ${theme.swatch.accent} 66% 100%)`
                : `linear-gradient(135deg, ${theme.swatch.bg} 0 55%, ${theme.swatch.accent} 55% 100%)`,
            }}
          >
            <span className="sr-only">{theme.label}</span>
            <span
              aria-hidden
              className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {theme.label}
              {limited && <span className="ml-1.5 opacity-60">· 2 pages</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
