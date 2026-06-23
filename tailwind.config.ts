import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#050506",
          950: "#050506",
          900: "#0A0A0C",
          800: "#101013",
          700: "#17171C",
          600: "#23232A",
        },
        line: {
          DEFAULT: "#1C1C20",
          bright: "#33322B",
        },
        gold: { DEFAULT: "#F5C518", soft: "#FFE08A", deep: "#C2901A", bright: "#FFEBB0" },
        amber: { DEFAULT: "#E8881A" },
        red: { DEFAULT: "#FF5C66" },
        pos: { DEFAULT: "#4ADE80", bright: "#86EFAC" },
        silver: { DEFAULT: "#C8CCD4", bright: "#EEF0F4", deep: "#9AA0AB" },
        fog: { DEFAULT: "#EDEDF0", dim: "#9A9AA4", muted: "#5E5E68" },
        // legacy aliases (kept so older class names still resolve to gold/black)
        bg: { DEFAULT: "#050506", surface: "#0A0A0C", elevated: "#17171C", border: "#1C1C20" },
        accent: { simple: "#F5C518", refined: "#E8881A", ultra: "#FF5C66", info: "#F5C518" },
        muted: "#5E5E68",
      },
      fontFamily: {
        display: ['"Chakra Petch"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Sora Variable"', "Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono Variable"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "glow-gold": "0 0 0 1px rgba(245,197,24,.28), 0 0 30px -6px rgba(245,197,24,.55)",
        "glow-gold-lg": "0 0 60px -10px rgba(245,197,24,.55)",
        "glow-red": "0 0 0 1px rgba(255,92,102,.28), 0 0 28px -6px rgba(255,92,102,.5)",
        card: "inset 0 1px 0 0 rgba(255,255,255,.04)",
      },
      backgroundImage: {
        "grad-gold": "linear-gradient(100deg, #FFE9A8 0%, #F5C518 45%, #C2901A 100%)",
        "grad-gold-soft":
          "linear-gradient(100deg, rgba(245,197,24,.16) 0%, rgba(194,144,26,.10) 100%)",
        "grad-sheen":
          "linear-gradient(180deg, #FFEBB0 0%, #F5C518 38%, #C2901A 100%)",
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
