/**
 * Dispersion spectral palette + chart tokens.
 * Shared by the home-page APY graphic and stats AreaLine charts.
 */

/** Core brand spectral stops (cyan → blue → violet → pink → amber). */
export const SPECTRAL = {
  cyan: "#22E0E6",
  blue: "#5B6CFF",
  violet: "#9A6BFF",
  pink: "#FF5AC8",
  amber: "#FFC061",
  /** Endpoint / hover dot on spectral charts. */
  mark: "#EAF6FF",
} as const;

export type SpectralGradientStop = {
  offset: string;
  color: string;
  opacity?: number;
};

export type SpectralLinearGradient = {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  stops: readonly SpectralGradientStop[];
};

/** 3-stop diagonal line stroke used on yield / trend charts. */
export const SPECTRAL_CHART_LINE: SpectralLinearGradient = {
  x1: "0",
  y1: "1",
  x2: "1",
  y2: "0",
  stops: [
    { offset: "0%", color: SPECTRAL.cyan },
    { offset: "50%", color: SPECTRAL.blue },
    { offset: "100%", color: SPECTRAL.pink },
  ],
};

/** Vertical fill under the spectral chart line. */
export const SPECTRAL_CHART_AREA: SpectralLinearGradient = {
  x1: "0",
  y1: "0",
  x2: "0",
  y2: "1",
  stops: [
    { offset: "0%", color: SPECTRAL.blue, opacity: 0.4 },
    { offset: "100%", color: SPECTRAL.blue, opacity: 0 },
  ],
};

/** Full chart styling bundle for line, fill, and endpoint marks. */
export const SPECTRAL_CHART = {
  line: SPECTRAL_CHART_LINE,
  area: SPECTRAL_CHART_AREA,
  mark: SPECTRAL.mark,
  lineGlow: "drop-shadow(0 0 3px rgba(91,108,255,0.7))",
  markGlow: "drop-shadow(0 0 5px rgba(255,90,200,0.9))",
} as const;

export const spectralChartLineUrl = (id: string) => `url(#${id})`;
export const spectralChartAreaUrl = (id: string) => `url(#${id})`;
