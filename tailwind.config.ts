import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0d12",
          surface: "#11141c",
          elevated: "#161a24",
          border: "#222836",
        },
        accent: {
          simple: "#22c55e",   // green
          refined: "#eab308",  // amber
          ultra: "#ef4444",    // red
          info: "#3b82f6",     // blue
        },
        muted: "#6b7280",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
