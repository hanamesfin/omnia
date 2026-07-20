import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        sidebar: "var(--sidebar)",
        navSelected: "var(--nav-selected)",
        textPrimary: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",
        textTertiary: "var(--text-tertiary)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        alive: "var(--alive)",
        "on-alive": "var(--on-alive)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        ratingStar: "var(--rating-star)",
        border: "var(--border)",
        ring: "var(--ring)",
      },
      fontFamily: {
        display: ["var(--omnia-font-stack)"],
        body: ["var(--omnia-font-stack)"],
        mono: ["var(--font-mono)", "SF Mono", "ui-monospace", "Menlo", "monospace"],
      },
      fontSize: {
        "display-xl": [
          "clamp(2.75rem, 8vw, 5.25rem)",
          { lineHeight: "1.05", letterSpacing: "-0.035em", fontWeight: "600" },
        ],
        "display-lg": [
          "clamp(1.75rem, 4vw, 2.65rem)",
          { lineHeight: "1.2", letterSpacing: "-0.028em", fontWeight: "600" },
        ],
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        float: "var(--shadow-float)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.4, 0.64, 1)",
        soft: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
      minHeight: {
        tap: "44px",
      },
      minWidth: {
        tap: "44px",
      },
    },
  },
  plugins: [],
};
export default config;
