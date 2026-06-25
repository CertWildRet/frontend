import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#070912",
          950: "#070912",
          900: "#0A0C14",
          800: "#0E1222",
          700: "#141828",
          600: "#1A1E32",
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.08)",
          bright: "rgba(255,255,255,0.15)",
        },
        // Primary brand accent — retheme to silver-blue (the diamond). Class names
        // keep the "gold" key so every `text-gold` / `bg-gold` etc. retints at once.
        gold: { DEFAULT: "#9DB7D8", soft: "#C9D2DE", deep: "#5A6E8C", bright: "#E8EFFA" },
        amber: { DEFAULT: "#E8881A" },
        red: { DEFAULT: "#FF5C66" },
        pos: { DEFAULT: "#4ADE80", bright: "#86EFAC" },
        silver: { DEFAULT: "#C8CCD4", bright: "#EEF0F4", deep: "#9AA0AB" },
        fog: { DEFAULT: "#EDEDF0", dim: "#9A9AA4", muted: "#84848E" },
        // legacy aliases (kept so older class names still resolve to gold/black)
        bg: { DEFAULT: "#050506", surface: "#0A0A0C", elevated: "#17171C", border: "#1C1C20" },
        accent: { simple: "#9DB7D8", refined: "#E8881A", ultra: "#FF5C66", info: "#9DB7D8" },
        muted: "#84848E",
      },
      fontFamily: {
        display: ['"Chakra Petch"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Sora Variable"', "Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono Variable"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "glow-gold": "0 0 0 1px rgba(157,183,216,.3), 0 0 30px -6px rgba(157,183,216,.5)",
        "glow-gold-lg": "0 0 60px -10px rgba(157,183,216,.5)",
        "glow-red": "0 0 0 1px rgba(255,92,102,.28), 0 0 28px -6px rgba(255,92,102,.5)",
        card: "inset 0 1px 0 0 rgba(255,255,255,.04)",
      },
      backgroundImage: {
        "grad-gold": "linear-gradient(100deg, #E8EFFA 0%, #9DB7D8 45%, #5A6E8C 100%)",
        "grad-gold-soft":
          "linear-gradient(100deg, rgba(157,183,216,.16) 0%, rgba(90,110,140,.10) 100%)",
        "grad-sheen":
          "linear-gradient(180deg, #E8EFFA 0%, #9DB7D8 38%, #5A6E8C 100%)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".4" },
        },
        sheen: {
          "0%": { backgroundPosition: "-150% 0" },
          "100%": { backgroundPosition: "250% 0" },
        },
      },
      animation: {
        "fade-up": "fadeUp .6s cubic-bezier(.2,.7,.2,1) both",
        "pulse-dot": "pulseDot 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
