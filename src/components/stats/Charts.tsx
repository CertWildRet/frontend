"use client";

/**
 * Hand-rolled SVG charts for the Stats page — NO charting dependency (the repo is
 * deliberately minimal-deps). Dark-native (the app has no light mode), following
 * the dataviz method: thin 2px marks, recessive grid, an emphasized endpoint,
 * selective direct labels, and a hover layer drawn IN the SVG (viewBox space) so
 * there's no px/DOM coordinate mapping. Palette matches the design tokens:
 * steel #9DB7D8 (primary), amber #E8881A (secondary), green #4ADE80.
 */
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import styles from "@/app/dispersion.module.css";
import { SPECTRAL_CHART, spectralChartAreaUrl, spectralChartLineUrl } from "@/lib/spectral";
import { SpectralChartDefs } from "@/lib/SpectralChartDefs";
import { ChartSkeleton } from "@/components/primitives/Skeleton";

const STEEL = "#9DB7D8";
const GRID = "rgba(255,255,255,0.06)";
const AXIS = "#B7BDD2"; // lightened for axis legibility (was fog-muted #9094A0)
const SURFACE = "#0E1222"; // ink-800 (tooltip bg)

export type Pt = { label: string; value: number };

/** Frame: title + optional subtitle + the plot, in a card. */
/** Turns the screenshot watermark on for every ChartCard beneath the provider.
 *  Scoped to /stats so it never appears on the profile page (which also uses
 *  ChartCard). Default off. */
export const ChartWatermarkContext = createContext(false);

export function ChartCard({
  title,
  subtitle,
  children,
  right,
  variant = "default",
  cutCorner = "tr",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  /** Home-page step-row glass container — spectral edge + crystal cut. */
  variant?: "default" | "dispersion";
  /** Crystal cut corner when variant is dispersion. */
  cutCorner?: "tr" | "bl";
}) {
  const watermark = useContext(ChartWatermarkContext);
  const cutClass = cutCorner === "bl" ? styles.cutBL : styles.cutTR;
  const wrapperClass =
    variant === "dispersion"
      ? `${styles.glass} ${styles.spectralEdge} ${cutClass} h-full overflow-hidden rounded-3xl px-5 py-5 sm:px-6 sm:py-6`
      : `${styles.glass} ${styles.spectralEdge} ${cutClass} h-full overflow-hidden rounded-2xl px-5 py-5 sm:px-6 sm:py-6`;

  return (
    <div className={wrapperClass}>
      {(title || subtitle || right || watermark) && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            {title && (
              <h2
                className="text-[19px] font-semibold tracking-tight text-[#EAECF6]"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                {title}
              </h2>
            )}
            {subtitle && <div className="mt-1 font-mono text-[13px] leading-relaxed text-[#A8B0CC]">{subtitle}</div>}
          </div>
          {(watermark || right) && (
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              {watermark && (
                // Branding watermark for shared screenshots: subtle enough not to
                // distract, opaque enough to stay legible in a heading crop.
                <div
                  aria-hidden
                  className="pointer-events-none select-none whitespace-nowrap font-mono text-[12px] leading-none tracking-tight text-[#C7D0EA]"
                  style={{ opacity: 0.75 }}
                >
                  diamondpools.app/stats
                </div>
              )}
              {right}
            </div>
          )}
        </div>
      )}
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

/** Compact axis formatter (340K, 1.2M, 1.41) — for wide magnitude axes. */
export const compactNum = (v: number): string => {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 0 : 1) + "B";
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
  if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + "K";
  if (a >= 10) return v.toFixed(a % 1 === 0 ? 0 : 1);
  if (a >= 1) return v.toFixed(2);
  return v.toFixed(3);
};

/**
 * Single-series line + area with a real y-axis (labelled gridlines), x-axis
 * ticks, hover crosshair + in-SVG tooltip. `yFmt` formats the axis labels
 * (defaults to `fmt`); pass `compactNum` for wide magnitude axes.
 */
export function AreaLine({
  points,
  color = STEEL,
  height = 210,
  fmt = (v) => v.toLocaleString(),
  yFmt,
  yLabel,
  zeroBaseline = true,
  spectral = false,
  loading = false,
}: {
  points: Pt[];
  color?: string;
  height?: number;
  fmt?: (v: number) => string;
  yFmt?: (v: number) => string;
  yLabel?: string;
  zeroBaseline?: boolean;
  /** Home-page APY chart look: cyan→blue→pink stroke + purple gradient fill. */
  spectral?: boolean;
  /** First fetch still in flight — renders a skeleton instead of "no data yet". */
  loading?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  // Render at the container's ACTUAL pixel width (viewBox == px) so fonts/marks are
  // a constant size regardless of chart width — a shared viewBox otherwise scales
  // fonts up ~2x on a full-width chart and down on a half-width one.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(680);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => {
      const cw = es[0]?.contentRect.width;
      if (cw && cw > 60) setW(Math.round(cw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const padL = 50;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const FS = 12; // px — real, because viewBox is 1:1 with rendered px
  const n = points.length;
  const yl = yFmt ?? fmt;

  if (n === 0) return <div ref={wrapRef} className="w-full"><Empty h={H} loading={loading} /></div>;

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
    const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.02 || 1;
    yMin = lo - pad;
    yMax = hi + pad;
    if (lo >= 0) yMin = Math.max(0, yMin); // no negative floor for non-negative data
  }
  const span = yMax - yMin || 1;
  const plotR = W - padR;
  const plotB = H - padB;
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (plotR - padL);
  const y = (v: number) => padT + (1 - (v - yMin) / span) * (plotB - padT);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${plotB.toFixed(1)} L${x(0).toFixed(1)},${plotB.toFixed(1)} Z`;
  const areaGid = spectral ? `spectral-area-${uid}` : `g-${color.replace(/[^a-z0-9]/gi, "")}-${uid}`;
  const lineGid = `spectral-line-${uid}`;
  const markColor = spectral ? SPECTRAL_CHART.mark : color;
  const markGlow = spectral ? SPECTRAL_CHART.markGlow : undefined;
  const lineGlow = spectral ? SPECTRAL_CHART.lineGlow : undefined;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - padL) / Math.max(1, plotR - padL)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const gy = [0, 0.25, 0.5, 0.75, 1];
  const nTicks = Math.min(W < 460 ? 3 : W < 640 ? 4 : 5, n);
  const xt = Array.from({ length: nTicks }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, nTicks - 1)));

  return (
    <div ref={wrapRef} className="w-full">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={yLabel ?? "line chart"}
        style={{ display: "block", maxWidth: "100%", overflow: "visible", touchAction: "pan-y" }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {spectral ? (
            <SpectralChartDefs lineId={lineGid} areaId={areaGid} />
          ) : (
            <linearGradient id={areaGid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.24" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          )}
        </defs>
        {gy.map((g, gi) => {
          const yy = padT + g * (plotB - padT);
          const val = yMax - g * span;
          return (
            <g key={gi}>
              <line x1={padL} y1={yy} x2={plotR} y2={yy} stroke={GRID} strokeWidth={1} />
              <text x={padL - 6} y={yy + 3.5} fontSize={FS} fontWeight={700} fill={AXIS} textAnchor="end" fontFamily="monospace">{yl(val)}</text>
            </g>
          );
        })}
        <path d={area} fill={spectral ? spectralChartAreaUrl(areaGid) : `url(#${areaGid})`} />
        <path
          d={line}
          fill="none"
          stroke={spectral ? spectralChartLineUrl(lineGid) : color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={lineGlow ? { filter: lineGlow } : undefined}
        />
        <circle
          cx={x(n - 1)}
          cy={y(points[n - 1].value)}
          r={3.5}
          fill={markColor}
          stroke={SURFACE}
          strokeWidth={1.5}
          style={markGlow ? { filter: markGlow } : undefined}
        />
        {xt.map((idx, ti) => (
          <text key={ti} x={x(idx)} y={H - 8} fontSize={FS} fontWeight={700} fill={AXIS} fontFamily="monospace"
            textAnchor={ti === 0 ? "start" : ti === xt.length - 1 ? "end" : "middle"}>{points[idx].label}</text>
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} y1={padT} x2={x(hover)} y2={plotB} stroke={AXIS} strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(points[hover].value)} r={4} fill={markColor} stroke={SURFACE} strokeWidth={1.5} style={markGlow ? { filter: markGlow } : undefined} />
            <Tooltip x={x(hover)} y={y(points[hover].value)} W={W} lines={[points[hover].label, fmt(points[hover].value)]} />
          </g>
        )}
      </svg>
    </div>
  );
}

/** Categorical bars with an optional expected reference line + hover tooltip. */
export function Bars({
  bars,
  color = STEEL,
  height = 190,
  fmt = (v) => v.toLocaleString(),
  expected,
  expectedLabel,
  highlight,
  highlightColor,
  loading = false,
}: {
  bars: Pt[];
  color?: string;
  height?: number;
  fmt?: (v: number) => string;
  expected?: number; // draws a dashed reference line (e.g. uniform expectation)
  /** Small caption rendered on the expected line so it explains itself. */
  expectedLabel?: string;
  highlight?: (i: number) => boolean;
  /** Fill for highlighted bars (defaults to `color`; pass a contrasting hue). */
  highlightColor?: string;
  loading?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // Measured width (viewBox == px) so fonts render at constant size — a fixed
  // 680 viewBox scaled bar-chart text ~1.5x against sibling line charts.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(680);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => {
      const cw = es[0]?.contentRect.width;
      if (cw && cw > 60) setW(Math.round(cw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const padT = 12;
  const padB = 22;
  const n = bars.length;
  if (n === 0) return <div ref={wrapRef} className="w-full"><Empty h={H} loading={loading} /></div>;
  const vMax = niceMax(Math.max(...bars.map((b) => b.value), expected ?? 0));
  const bw = W / n;
  const gap = Math.min(6, bw * 0.28);
  const y = (v: number) => padT + (1 - v / vMax) * (H - padT - padB);

  return (
    <div ref={wrapRef} className="w-full">
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="bar chart"
      style={{ display: "block", maxWidth: "100%", overflow: "visible", touchAction: "pan-y" }} onPointerLeave={() => setHover(null)}>
      <line x1={0} y1={H - padB} x2={W} y2={H - padB} stroke={GRID} strokeWidth={1} />
      {expected != null && (
        <g>
          <line x1={0} y1={y(expected)} x2={W} y2={y(expected)} stroke={AXIS} strokeWidth={1} strokeDasharray="4 3" />
          {expectedLabel && (
            <text x={W - 4} y={y(expected) - 5} fontSize={12} fontWeight={700} fill={AXIS} textAnchor="end" fontFamily="monospace">{expectedLabel}</text>
          )}
        </g>
      )}
      {bars.map((b, i) => {
        const bx = i * bw + gap / 2;
        const top = y(b.value);
        const h = Math.max(0, H - padB - top);
        const marked = highlight?.(i) ?? false;
        const hot = marked || hover === i;
        return (
          <g key={i} onPointerEnter={() => setHover(i)}>
            <rect x={bx} y={top} width={bw - gap} height={h} rx={3}
              fill={marked && highlightColor ? highlightColor : color} opacity={hot ? 1 : 0.62} />
            {/* generous invisible hit target */}
            <rect x={i * bw} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
          </g>
        );
      })}
      <text x={2} y={padT - 2} fontSize={12} fontWeight={700} fill={AXIS} fontFamily="monospace">{fmt(vMax)}</text>
      {hover != null && (
        <Tooltip x={hover * bw + bw / 2} y={y(bars[hover].value)} W={W} lines={[bars[hover].label, fmt(bars[hover].value)]} />
      )}
    </svg>
    </div>
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
          <span className="w-16 shrink-0 font-mono text-[13px] font-bold text-[#bcc3da]">{r.label}</span>
          <div className="relative h-4 flex-1 overflow-hidden rounded bg-ink-700">
            <div
              className="h-full rounded"
              style={{
                width: `${Math.min(100, (r.value / max) * 100)}%`,
                background: `linear-gradient(90deg, ${color}, #5B6CFF 52%, #9A6BFF)`,
                boxShadow: "0 0 16px rgba(91,108,255,0.45)",
                opacity: 0.82,
              }}
            />
          </div>
          <span className="num w-16 shrink-0 text-right text-[13px] font-semibold text-gray-100">{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Tooltip({ x, y, W, lines }: { x: number; y: number; W: number; lines: string[] }) {
  const w = Math.max(...lines.map((l) => l.length)) * 7.6 + 16;
  const h = lines.length * 17 + 10;
  const left = x + w + 10 > W ? x - w - 8 : x + 8;
  const top = Math.max(2, y - h - 8);
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={w} height={h} rx={5} fill={SURFACE} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      {lines.map((l, i) => (
        <text key={i} x={left + 8} y={top + 17 + i * 17} fontSize={13} fontFamily="monospace"
          fill={i === 0 ? AXIS : "#EDEDF0"} fontWeight={i === 0 ? 400 : 600}>{l}</text>
      ))}
    </g>
  );
}

function Empty({ h, loading }: { h: number; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={h} />;
  return (
    <div className="flex items-center justify-center rounded-lg border border-line bg-ink-800/40 font-mono text-xs text-fog-muted"
      style={{ height: h }}>
      no data yet
    </div>
  );
}
