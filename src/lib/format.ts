// App-wide readability ladder for SOL / ORE / USD figures:
//   • ≥ 100,000 → compact k / M (231,973 → 231.9k, 1,234,567 → 1.2M) — six digits
//     of commas is just noise. 1 decimal, dropping a trailing zero (234,032 → 234k).
//   • 100 … 100k → a single decimal, trailing zero dropped (9,375.71 → 9,375.7).
//   • < 100 → the caller's full precision (0.996 stays 0.996).
// Percentages (formatPct) are exempt.
const compactBigFigure = (v: number): string => {
  const a = Math.abs(v), sign = v < 0 ? "-" : "";
  // truncate (not round) to one decimal so 231,973 reads 231.9k, not 232.0k
  if (a >= 1e6) {
    const m = Math.floor(a / 1e5) / 10;
    return `${sign}${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  const k = Math.floor(a / 100) / 10;
  return `${sign}${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}k`;
};

const bigFigureDigits = (v: number, decimals: number): { min: number; max: number } =>
  Math.abs(v) >= 100 ? { min: 0, max: Math.min(decimals, 1) } : { min: decimals, max: decimals };

export const formatSol = (sol: number, decimals = 4): string => {
  if (Math.abs(sol) >= 1e5) return compactBigFigure(sol);
  const { min, max } = bigFigureDigits(sol, decimals);
  return sol.toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
};

export const formatPct = (frac: number, decimals = 2): string =>
  `${(frac * 100).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;

export const formatNum = (n: number, decimals = 0): string => {
  // Only compact when the caller wants decimals (a money figure). Integer counts /
  // round IDs pass decimals=0 and must stay exact — #335,815 is not "#335.8k".
  if (decimals >= 1 && Math.abs(n) >= 1e5) return compactBigFigure(n);
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
