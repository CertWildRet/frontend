"use client";

/**
 * Cohort-tab charts — hand-rolled SVG (no charting dep), same idiom as the other
 * stats charts (measured px-true viewBox, recessive grid, monospace axis text,
 * in-SVG hover tooltip). Two shapes:
 *   Donut              ORE holder-size distribution (count or supply share)
 *   CohortBalanceBars  diverging stacked bars: net ORE Δ per cohort over time
 *
 * Neon cohort palette (Plankton→Whale) is CVD-verified: worst adjacent-pair ΔE
 * 15.8 under deuter/protanopia (Machado+CIEDE2000), all readable on the dark
 * surface. Order reads cool→warm = small→big, whale = the bright-gold headliner.
 */
import { useEffect, useRef, useState } from "react";
import { ChartSkeleton } from "@/components/primitives/Skeleton";

const GRID = "rgba(255,255,255,0.06)";
const AXIS = "#B7BDD2";
const SURFACE = "#0E1222";
const FS = 12;

export type Cohort = { id: number; name: string; range: string; color: string };
export const COHORTS: Cohort[] = [
  { id: 1, name: "Plankton", range: "0–1", color: "#2DD4BF" },
  { id: 2, name: "Shrimp", range: ">1–10", color: "#3B82F6" },
  { id: 3, name: "Fish", range: ">10–100", color: "#EC4899" },
  { id: 4, name: "Shark", range: ">100–500", color: "#F97316" },
  { id: 5, name: "Whale", range: ">500", color: "#FDE047" },
];
export const cohortOf = (id: number) => COHORTS.find((c) => c.id === id);

function useMeasuredWidth(initial = 520): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => {
      const cw = es[0]?.contentRect.width;
      if (cw && cw > 60) setW(Math.round(cw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Empty({ h, loading, text }: { h: number; loading?: boolean; text?: string }) {
  if (loading) return <ChartSkeleton height={h} />;
  return (
    <div className="flex items-center justify-center rounded-lg border border-line bg-ink-800/40 px-6 text-center font-mono text-xs leading-relaxed text-fog-muted"
      style={{ height: h }}>
      {text ?? "no data yet"}
    </div>
  );
}

// annular-sector path, angles in radians (0 = 3 o'clock, clockwise as y grows down)
function arc(cx: number, cy: number, rO: number, rI: number, a0: number, a1: number): string {
  const P = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${P(rO, a0)} A${rO},${rO} 0 ${large} 1 ${P(rO, a1)} L${P(rI, a1)} A${rI},${rI} 0 ${large} 0 ${P(rI, a0)} Z`;
}

export type DonutSlice = { label: string; sub?: string; value: number; color: string };

/** Donut chart: proportional neon arcs, 2px surface gaps, center total, hover. */
export function Donut({
  slices, centerLabel, centerSub, fmt = (v: number) => v.toLocaleString(), unit,
  height = 300, loading = false,
}: {
  slices: DonutSlice[];
  centerLabel?: string;
  centerSub?: string;
  fmt?: (v: number) => string;
  unit?: string;
  height?: number;
  loading?: boolean;
}) {
  const [ref, W] = useMeasuredWidth();
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0);
  if (!slices.length || total <= 0) return <div ref={ref} className="w-full"><Empty h={height} loading={loading} /></div>;

  const H = height;
  const cx = W / 2, cy = H / 2;
  const rO = Math.min(W, H) / 2 - 6;
  const rI = rO * 0.6;
  const pad = 0.006; // tiny angular gap; the 2px SURFACE stroke does most of the separating
  // Give every non-empty cohort a minimum arc so tiny slices (Whale at 0.4% of
  // holders, Plankton at 0.5% of ORE) still read as a colored SECTOR, not a
  // hairline the gap swallows. The floor is borrowed proportionally from the rest;
  // the tooltip/label still shows the TRUE share (frac).
  const MIN_A = 0.1; // ~5.7° floor per slice
  const nnz = slices.filter((s) => s.value > 0).length;
  const free = Math.max(0, 2 * Math.PI - MIN_A * nnz);
  let a = -Math.PI / 2; // start at 12 o'clock
  const segs = slices.map((s, i) => {
    const frac = Math.max(0, s.value) / total; // TRUE share (label/tooltip)
    const ang = s.value > 0 ? MIN_A + frac * free : 0; // arc angle, floored so it's visible
    const a0 = a + pad / 2, a1 = a + ang - pad / 2;
    a += ang;
    return { s, i, a0: Math.min(a0, a1), a1: Math.max(a0, a1), mid: (a0 + a1) / 2, frac };
  });

  return (
    <div ref={ref} className="w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="cohort distribution donut"
        style={{ display: "block", maxWidth: "100%", overflow: "visible" }} onPointerLeave={() => setHover(null)}>
        {segs.map(({ s, i, a0, a1 }) => (
          <path key={i} d={arc(cx, cy, hover === i ? rO + 4 : rO, rI, a0, a1)} fill={s.color}
            opacity={hover == null || hover === i ? 1 : 0.35}
            stroke={SURFACE} strokeWidth={2} strokeLinejoin="round"
            style={{ transition: "opacity 140ms" }}
            onPointerEnter={() => setHover(i)} />
        ))}
        {/* center label */}
        <text x={cx} y={cy - (centerSub ? 6 : 0)} textAnchor="middle" fontSize={hover != null ? 20 : 22} fontWeight={700}
          fill="#EAECF6" fontFamily="'Chakra Petch', sans-serif">
          {hover != null ? fmt(segs[hover].s.value) : centerLabel ?? fmt(total)}
        </text>
        {(centerSub || hover != null) && (
          <text x={cx} y={cy + 15} textAnchor="middle" fontSize={FS} fill={AXIS} fontFamily="monospace">
            {hover != null ? `${segs[hover].s.label} · ${(segs[hover].frac * 100).toFixed(1)}%` : centerSub}
          </text>
        )}
        {unit && hover == null && (
          <text x={cx} y={cy + 32} textAnchor="middle" fontSize={11} fill="#8891ad" fontFamily="monospace">{unit}</text>
        )}
      </svg>
    </div>
  );
}

export type StackBucket = {
  label: string;
  values: number[];
  totals?: number[];
  approximate?: boolean;
}; // values/totals aligned to `series`

/** Diverging stacked bars: positive stacks up, negative down, around a zero line.
 *  `series` gives the name+color of each stack layer (cohorts). */
export function CohortBalanceBars({
  buckets, series, height = 320, fmt = (v: number) => v.toFixed(1), unit, loading = false, emptyText,
}: {
  buckets: StackBucket[];
  series: { name: string; color: string }[];
  height?: number;
  fmt?: (v: number) => string;
  unit?: string;
  loading?: boolean;
  emptyText?: string;
}) {
  const [ref, W] = useMeasuredWidth(640);
  const [hover, setHover] = useState<number | null>(null);
  const H = height, padL = 54, padR = 12, padT = 12, padB = 30;
  const n = buckets.length;
  if (!n) return <div ref={ref} className="w-full"><Empty h={H} loading={loading} text={emptyText} /></div>;

  // per-bucket positive & negative extents (stacked)
  const posMax = Math.max(1e-9, ...buckets.map((b) => b.values.filter((v) => v > 0).reduce((a, v) => a + v, 0)));
  const negMax = Math.max(1e-9, ...buckets.map((b) => -b.values.filter((v) => v < 0).reduce((a, v) => a + v, 0)));
  const top = posMax, bot = -negMax;
  const plotR = W - padR, plotB = H - padB, plotT = padT;
  const y = (v: number) => plotT + (top - v) / (top - bot) * (plotB - plotT);
  const zeroY = y(0);
  const bw = (plotR - padL) / n;
  const bwInner = Math.min(26, Math.max(3, bw - 4));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.floor((px - padL) / bw))));
  };
  // y gridlines: 0 plus a couple each side
  const gy = [top, top / 2, 0, bot / 2, bot].filter((v, i, arr) => arr.indexOf(v) === i);
  const nTicks = Math.min(W < 460 ? 3 : W < 640 ? 5 : 7, n);
  const xt = Array.from({ length: nTicks }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, nTicks - 1)));

  return (
    <div ref={ref} className="w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="cohort balance changes"
        style={{ display: "block", maxWidth: "100%", overflow: "visible", touchAction: "pan-y" }}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        {gy.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={y(v)} x2={plotR} y2={y(v)} stroke={v === 0 ? "rgba(255,255,255,0.22)" : GRID} strokeWidth={v === 0 ? 1.5 : 1} />
            <text x={padL - 6} y={y(v) + 3.5} fontSize={FS} fontWeight={700} fill={AXIS} textAnchor="end" fontFamily="monospace">
              {v > 0 ? "+" : ""}{fmt(v)}
            </text>
          </g>
        ))}
        {buckets.map((b, bi) => {
          const x = padL + bi * bw + (bw - bwInner) / 2;
          let up = 0, dn = 0;
          return (
            <g key={bi} opacity={hover == null || hover === bi ? 1 : 0.4} style={{ transition: "opacity 120ms" }}>
              {b.values.map((v, si) => {
                if (!v) return null;
                let y0: number, y1: number;
                if (v > 0) { y1 = y(up); up += v; y0 = y(up); } else { y0 = y(dn); dn += v; y1 = y(dn); }
                const h = Math.abs(y0 - y1); // y grows downward, so top/bottom order flips by sign
                if (h < 0.4) return null;
                return <rect key={si} x={x} y={Math.min(y0, y1)} width={bwInner} height={h} fill={series[si]?.color ?? "#888"}
                  stroke={b.approximate ? "rgba(255,255,255,0.65)" : SURFACE} strokeWidth={0.75}
                  strokeDasharray={b.approximate ? "2 1" : undefined} />;
              })}
            </g>
          );
        })}
        {xt.map((idx, ti) => (
          <text key={ti} x={padL + idx * bw + bw / 2} y={H - 9} fontSize={FS} fontWeight={700} fill={AXIS} fontFamily="monospace"
            textAnchor={ti === 0 ? "start" : ti === xt.length - 1 ? "end" : "middle"}>{buckets[idx].label}{buckets[idx].approximate ? " Approx*" : ""}</text>
        ))}
        {hover != null && (() => {
          const b = buckets[hover];
          const net = b.values.reduce((a, v) => a + v, 0);
          const lines = [
            `${b.label}${b.approximate ? " · Approx*" : ""}`,
            ...series.map((s, i) => {
              if (!b.values[i]) return "";
              // % of that cohort's own total — makes clear a big-looking ORE move is tiny
              const t = b.totals?.[i];
              const pct = t ? ` (${b.values[i] > 0 ? "+" : ""}${((b.values[i] / t) * 100).toFixed(2)}%)` : "";
              return `${s.name}: ${b.values[i] > 0 ? "+" : ""}${fmt(b.values[i])}${pct}`;
            }).filter(Boolean),
            `net: ${net > 0 ? "+" : ""}${fmt(net)}`,
          ];
          const tw = Math.max(...lines.map((l) => l.length)) * 7 + 16;
          const th = lines.length * 15 + 10;
          const bx = padL + hover * bw + bw / 2;
          const left = bx + tw + 10 > W ? bx - tw - 8 : bx + 8;
          return (
            <g pointerEvents="none">
              <rect x={left} y={padT} width={tw} height={th} rx={5} fill={SURFACE} stroke="rgba(255,255,255,0.15)" />
              {lines.map((l, i) => (
                <text key={i} x={left + 8} y={padT + 15 + i * 15} fontSize={11.5} fontFamily="monospace"
                  fill={i === 0 ? AXIS : i === lines.length - 1 ? "#EDEDF0" : (series[i - 1]?.color ?? "#EDEDF0")}
                  fontWeight={i === 0 || i === lines.length - 1 ? 700 : 600}>{l}</text>
              ))}
            </g>
          );
        })()}
      </svg>
      {unit && <div className="mt-1 text-center font-mono text-[11px] text-fog-muted">{unit}</div>}
    </div>
  );
}
