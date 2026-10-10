// Theme registry. The token values themselves live in src/index.css;
// this file names the themes and carries swatch colours for the theme rail.

export const THEME_STORAGE_KEY = "azelle.theme";

export const THEMES = [
  {
    id: "blanc-osmanthe",
    label: "Pastel Bloom",
    fonts: "Marcellus + Manrope",
    swatch: { bg: "#eee3f3", mid: "#ffe0d0", accent: "#c7ece2" },
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "blanc-osmanthe";

export const TOKEN_NAMES = [
  "--bg",
  "--surface",
  "--surface2",
  "--ink",
  "--soft",
  "--line",
  "--accent",
  "--accent-ink",
] as const;

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export const THEME_PAGES: Partial<Record<ThemeId, (path: string) => boolean>> = {};

/** The theme that actually applies on this page. */
export function themeForPath(theme: ThemeId, path: string): ThemeId {
  const allowed = THEME_PAGES[theme];
  return !allowed || allowed(path) ? theme : DEFAULT_THEME;
}

/** The theme chosen in the rail (or the default), whatever page we are on. */
export function storedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Puts the right theme on <html> for the page being shown. */
export function applyTheme(theme: ThemeId, path: string) {
  document.documentElement.dataset.theme = themeForPath(theme, path);
}

export const showThemeRail = import.meta.env.VITE_SHOW_THEME_RAIL === "true";

