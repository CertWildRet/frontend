/**
 * Dark-mode chart series palette.
 * Mid–high luminance accents for ink/glass surfaces (#070912–#0E1222).
 * Canonical source for SVG stroke/fill; mirrored in Tailwind `chart.*` and
 * `:root --chart-*` CSS vars.
 */
export const CHART = {
  cyan: "#22E0E6",
  blue: "#5B6CFF",
  violet: "#9A6BFF",
  pink: "#FF5AC8",
  amber: "#E8881A",
  steel: "#9DB7D8",
  green: "#4ADE80",
  red: "#F87171",
  teal: "#2DD4BF",
  sky: "#38BDF8",
  indigo: "#818CF8",
  rose: "#FB7185",
  lime: "#A3E635",
  orange: "#FB923C",
} as const;

export type ChartColorName = keyof typeof CHART;
export type ChartColor = (typeof CHART)[ChartColorName];
