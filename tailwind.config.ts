import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Every colour resolves to a CSS variable set per theme in src/index.css.
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        ink: "var(--ink)",
        soft: "var(--soft)",
        line: "var(--line)",
        accent: {
          DEFAULT: "var(--accent)",
          ink: "var(--accent-ink)",
        },
      },
      borderColor: {
        DEFAULT: "var(--line)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
      },
      transitionTimingFunction: {
        reveal: "cubic-bezier(.16,1,.3,1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
