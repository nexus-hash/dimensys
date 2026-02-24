import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        serif: ["'DM Serif Display'", "serif"],
      },
      colors: {
        bg:      "var(--bg)",
        bg2:     "var(--bg2)",
        ink:     "var(--ink)",
        ink2:    "var(--ink2)",
        ink3:    "var(--ink3)",
        "card-bg": "var(--card-bg)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        token:   "var(--border)",
      },
      backgroundColor: {
        "tag":  "var(--bg)",
      },
      boxShadow: {
        glow: "0 12px 40px var(--glow)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        scrollPulse: {
          "0%, 100%": { transform: "scaleX(1)", opacity: "1" },
          "50%":       { transform: "scaleX(1.5)", opacity: "0.5" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up":      "fadeUp 0.7s both",
        "fade-up-d1":   "fadeUp 0.7s 0.2s both",
        "fade-up-d2":   "fadeUp 0.7s 0.35s both",
        "fade-up-d3":   "fadeUp 0.7s 0.5s both",
        "fade-up-d4":   "fadeUp 0.7s 0.65s both",
        "fade-up-d5":   "fadeUp 0.7s 0.8s both",
        "fade-in":      "fadeIn 1.2s 0.4s both",
        "fade-in-slow": "fadeIn 1s 1.2s both",
        "scroll-pulse": "scrollPulse 2s 1.5s infinite",
        marquee:        "marquee 30s linear infinite",
      },
      transitionDelay: {
        "100": "100ms",
        "200": "200ms",
        "300": "300ms",
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
};

export default config;
