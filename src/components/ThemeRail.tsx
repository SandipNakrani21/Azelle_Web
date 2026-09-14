import { useEffect, useState } from "react";
import { DEFAULT_THEME, THEMES, THEME_STORAGE_KEY, isThemeId, type ThemeId } from "@/lib/themes";

// Design tool only — rendered when VITE_SHOW_THEME_RAIL=true.
export function ThemeRail() {
  const [active, setActive] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (isThemeId(current)) setActive(current);
  }, []);

  function select(id: ThemeId) {
    document.documentElement.dataset.theme = id;
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
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => select(theme.id)}
            aria-pressed={isActive}
            title={`${theme.label} — ${theme.fonts}`}
            className={`group relative h-8 w-8 rounded-full border duration-300 ease-reveal hover:scale-110 ${
              isActive ? "border-accent ring-1 ring-accent ring-offset-2 ring-offset-surface" : "border-line"
            }`}
            style={{
              background: `linear-gradient(135deg, ${theme.swatch.bg} 0 55%, ${theme.swatch.accent} 55% 100%)`,
            }}
          >
            <span className="sr-only">{theme.label}</span>
            <span
              aria-hidden
              className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {theme.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
