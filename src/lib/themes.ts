// Theme registry. The token values themselves live in src/index.css;
// this file names the themes and carries swatch colours for the theme rail.

export const THEME_STORAGE_KEY = "azelle.theme";

export const THEMES = [
  {
    id: "blanc-osmanthe",
    label: "Ivory Osmanthus",
    fonts: "Marcellus + Manrope",
    swatch: { bg: "#f7f3ec", accent: "oklch(0.62 0.11 32)" },
  },
  {
    id: "noir-ambre",
    label: "Black Amber",
    fonts: "Cormorant Garamond + Jost",
    swatch: { bg: "#0b0a09", accent: "oklch(0.78 0.11 78)" },
  },
  {
    id: "vert-cristal",
    label: "Crystal Green",
    fonts: "Bodoni Moda + Space Grotesk",
    swatch: { bg: "#0a1512", accent: "oklch(0.78 0.11 168)" },
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

export const showThemeRail = import.meta.env.VITE_SHOW_THEME_RAIL === "true";
