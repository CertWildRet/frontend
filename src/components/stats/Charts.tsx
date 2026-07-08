"use client";

/**
 * Hand-rolled SVG charts for the Stats page — NO charting dependency (the repo is
 * deliberately minimal-deps). Dark-native (the app has no light mode), following
 * the dataviz method: thin 2px marks, recessive grid, an emphasized endpoint,
 * selective direct labels, and a hover layer drawn IN the SVG (viewBox space) so
 * there's no px/DOM coordinate mapping. Palette matches the design tokens:
 * steel #9DB7D8 (primary), amber #E8881A (secondary), green #4ADE80.
 */
import { useState } from "react";

const STEEL = "#9DB7D8";
const GRID = "rgba(255,255,255,0.06)";
const AXIS = "#9094A0"; // fog-muted
const SURFACE = "#0E1222"; // ink-800 (tooltip bg)

export type Pt = { label: string; value: number };

/** Frame: title + optional subtitle + the plot, in a card. */
export function ChartCard({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="card px-4 py-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="section-label">{title}</div>
          {subtitle && <div className="mt-0.5 font-mono text-[11px] leading-snug text-fog-muted">{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const niceMax = (v: number): number => {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

/** Single-series line + area with a hover crosshair + in-SVG tooltip. */
export function AreaLine({
  points,
  color = STEEL,
  height = 170,
  fmt = (v) => v.toLocaleString(),
  yLabel,
  zeroBaseline = true,
}: {
  points: Pt[];
  color?: string;
  height?: number;
  fmt?: (v: number) => string;
  yLabel?: string;
  zeroBaseline?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 680;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 22;
  const n = points.length;
  if (n === 0) return <Empty h={H} />;

  const ys = points.map((p) => p.value);
  // zeroBaseline anchors the fill at 0 (magnitude charts); false zooms to the data
  // range so a nearly-flat series (e.g. cumulative emission) shows its real slope.
  let yMax: number;
  let yMin: number;
  if (zeroBaseline) {
    yMax = niceMax(Math.max(...ys, 0));
    yMin = Math.min(...ys, 0);
  } else {
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    const pad = (hi - lo) * 0.12 || 1;
    yMin = lo - pad;
    yMax = hi + pad;
  }
  const span = yMax - yMin || 1;
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - yMin) / span) * (H - padT - padB);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${(H - padB).toFixed(1)} L${x(0).toFixed(1)},${(H - padB).toFixed(1)} Z`;
  const gid = `g-${color.replace(/[^a-z0-9]/gi, "")}`;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - padL) / Math.max(1, W - padL - padR)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={yLabel ?? "line chart"}
      style={{ display: "block", overflow: "visible" }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridLines.map((g) => {
        const gy = padT + g * (H - padT - padB);
        return <line key={g} x1={padL} y1={gy} x2={W - padR} y2={gy} stroke={GRID} strokeWidth={1} />;
      })}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* emphasized endpoint */}
      <circle cx={x(n - 1)} cy={y(points[n - 1].value)} r={3.5} fill={color} />
      {/* y range labels */}
      <text x={padL} y={padT - 2} fontSize={10} fill={AXIS} fontFamily="monospace">{fmt(yMax)}</text>
      {/* x endpoints */}
      <text x={padL} y={H - 6} fontSize={10} fill={AXIS} fontFamily="monospace">{points[0].label}</text>
      <text x={W - padR} y={H - 6} fontSize={10} fill={AXIS} textAnchor="end" fontFamily="monospace">{points[n - 1].label}</text>

      {hover != null && (
        <g>
          <line x1={x(hover)} y1={padT} x2={x(hover)} y2={H - padB} stroke={AXIS} strokeWidth={1} strokeDasharray="3 3" />
          <circle cx={x(hover)} cy={y(points[hover].value)} r={4} fill={color} stroke={SURFACE} strokeWidth={1.5} />
          <Tooltip
            x={x(hover)}
            y={y(points[hover].value)}
            W={W}
            lines={[points[hover].label, fmt(points[hover].value)]}
          />
        </g>
      )}
    </svg>
  );
}

/** Categorical bars with an optional expected reference line + hover tooltip. */
export function Bars({
  bars,
  color = STEEL,
  height = 190,
  fmt = (v) => v.toLocaleString(),
  expected,
  highlight,
}: {
  bars: Pt[];
  color?: string;
  height?: number;
  fmt?: (v: number) => string;
  expected?: number; // draws a dashed reference line (e.g. uniform expectation)
  highlight?: (i: number) => boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 680;
  const H = height;
  const padT = 12;
  const padB = 22;
  const n = bars.length;
  if (n === 0) return <Empty h={H} />;
  const vMax = niceMax(Math.max(...bars.map((b) => b.value), expected ?? 0));
  const bw = W / n;
  const gap = Math.min(6, bw * 0.28);
  const y = (v: number) => padT + (1 - v / vMax) * (H - padT - padB);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="bar chart"
      style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHover(null)}>
      <line x1={0} y1={H - padB} x2={W} y2={H - padB} stroke={GRID} strokeWidth={1} />
      {expected != null && (
        <line x1={0} y1={y(expected)} x2={W} y2={y(expected)} stroke={AXIS} strokeWidth={1} strokeDasharray="4 3" />
      )}
      {bars.map((b, i) => {
        const bx = i * bw + gap / 2;
        const top = y(b.value);
        const h = Math.max(0, H - padB - top);
        const hot = highlight?.(i) || hover === i;
        return (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={bx} y={top} width={bw - gap} height={h} rx={3} fill={color} opacity={hot ? 1 : 0.62} />
            {/* generous invisible hit target */}
            <rect x={i * bw} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
          </g>
        );
      })}
      <text x={2} y={padT - 2} fontSize={10} fill={AXIS} fontFamily="monospace">{fmt(vMax)}</text>
      {hover != null && (
        <Tooltip x={hover * bw + bw / 2} y={y(bars[hover].value)} W={W} lines={[bars[hover].label, fmt(bars[hover].value)]} />
      )}
    </svg>
  );
}

/** Horizontal percentile-band bars (leaderboard ROI bands). */
export function HBars({
  rows,
  color = STEEL,
  fmt = (v) => v.toFixed(2) + "×",
}: {
  rows: { label: string; value: number }[];
  color?: string;
  fmt?: (v: number) => string;
}) {
  const max = niceMax(Math.max(...rows.map((r) => r.value), 1));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-16 shrink-0 font-mono text-[11px] text-fog-muted">{r.label}</span>
          <div className="relative h-4 flex-1 overflow-hidden rounded bg-ink-700">
            <div className="h-full rounded" style={{ width: `${Math.min(100, (r.value / max) * 100)}%`, background: color, opacity: 0.7 }} />
          </div>
          <span className="num w-16 shrink-0 text-right text-xs text-gray-200">{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Tooltip({ x, y, W, lines }: { x: number; y: number; W: number; lines: string[] }) {
  const w = Math.max(...lines.map((l) => l.length)) * 6.6 + 14;
  const h = lines.length * 14 + 8;
  const left = x + w + 10 > W ? x - w - 8 : x + 8;
  const top = Math.max(2, y - h - 8);
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={w} height={h} rx={5} fill={SURFACE} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      {lines.map((l, i) => (
        <text key={i} x={left + 7} y={top + 15 + i * 14} fontSize={11} fontFamily="monospace"
          fill={i === 0 ? AXIS : "#EDEDF0"} fontWeight={i === 0 ? 400 : 600}>{l}</text>
      ))}
    </g>
  );
}

function Empty({ h }: { h: number }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-line bg-ink-800/40 font-mono text-xs text-fog-muted"
      style={{ height: h }}>
      no data yet
    </div>
  );
}
