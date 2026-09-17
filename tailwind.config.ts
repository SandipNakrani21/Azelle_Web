import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

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
  plugins: [
    // Hover utilities only apply where a pointer can actually hover, so a tap on a
    // phone or tablet never leaves a "stuck" hover state. `any-hover` (not `hover`)
    // keeps them working on touchscreen laptops, where the primary pointer is
    // reported as touch even with a mouse attached. Same gate as the custom hover
    // rules in src/index.css.
    plugin(({ addVariant }) => {
      addVariant("hover", "@media (any-hover: hover) { &:hover }");
      addVariant("group-hover", "@media (any-hover: hover) { :merge(.group):hover & }");
      addVariant("peer-hover", "@media (any-hover: hover) { :merge(.peer):hover ~ & }");
    }),
  ],
} satisfies Config;
