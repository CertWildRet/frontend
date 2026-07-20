// App-wide readability rule for SOL / ORE / USD figures: once a value crosses 100,
// the 3rd/4th decimals are just noise — cap the display at a single decimal and drop
// a trailing zero (9,375.71 → 9,375.7, 8,404.02 → 8,404, 1,185.928 → 1,185.9). Below
// 100 the caller's precision is kept (0.996 stays 0.996). Percentages are untouched.
const bigFigureDigits = (v: number, decimals: number): { min: number; max: number } =>
  Math.abs(v) >= 100 ? { min: 0, max: Math.min(decimals, 1) } : { min: decimals, max: decimals };

export const formatSol = (sol: number, decimals = 4): string => {
  const { min, max } = bigFigureDigits(sol, decimals);
  return sol.toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
};

export const formatPct = (frac: number, decimals = 2): string =>
  `${(frac * 100).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;

export const formatNum = (n: number, decimals = 0): string => {
  const { min, max } = bigFigureDigits(n, decimals);
  return n.toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
};

export const formatTime = (ts: number): string => {
  if (!ts) return "·";
  return new Date(ts).toLocaleString();
};

export const formatRelative = (ts: number): string => {
  if (!ts) return "·";
  const diff = Date.now() - ts;
  if (diff < 0) return "in the future";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const formatUptime = (ms: number): string => {
  if (!ms) return "·";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};
