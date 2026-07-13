"use client";

/**
 * Trends-tab chart primitives — hand-rolled SVG, NO charting dependency, same
 * idiom as Charts.tsx (measured px-true viewBox, recessive grid, monospace axis
 * text, in-SVG tooltip). Three shapes the miner-actionable layout needs:
 *   DualLine    two series, independent left/right y-scales (prices)
 *   CostEvChart market ratio + production cost (left, SOL/ORE) with the EV%
 *               difference as a signed green/red area (right axis)
 *   BarsLine    bars on the left scale + a line on the right (activity)
 * Dual axes are deliberate here — the quant's layout spec pins each pairing.
 */
import { useEffect, useRef, useState } from "react";
import { ChartSkeleton } from "@/components/primitives/Skeleton";

const GRID = "rgba(255,255,255,0.06)";
const AXIS = "#B7BDD2"; // lightened for axis legibility
const SURFACE = "#0E1222";
const FS = 12;

export type TPt = { label: string; value: number | null };

function useMeasuredWidth(initial = 680): [React.RefObject<HTMLDivElement>, number] {
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

function TrendTooltip({ x, y, W, lines }: { x: number; y: number; W: number; lines: string[] }) {
  const w = Math.max(...lines.map((l) => l.length)) * 7.2 + 16;
  const h = lines.length * 16 + 10;
  const left = x + w + 10 > W ? x - w - 8 : x + 8;
  const top = Math.max(2, y - h - 8);
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={w} height={h} rx={5} fill={SURFACE} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      {lines.map((l, i) => (
        <text key={i} x={left + 8} y={top + 15 + i * 16} fontSize={12} fontFamily="monospace"
          fill={i === 0 ? AXIS : "#EDEDF0"} fontWeight={i === 0 ? 400 : 600}>{l}</text>
      ))}
    </g>
  );
}

function EmptyBox({ h, loading, text }: { h: number; loading?: boolean; text?: string }) {
  if (loading) return <ChartSkeleton height={h} />;
  return (
    <div className="flex items-center justify-center rounded-lg border border-line bg-ink-800/40 px-6 text-center font-mono text-xs leading-relaxed text-fog-muted"
      style={{ height: h }}>
      {text ?? "no data yet"}
    </div>
  );
}

/** Path for a series with gaps (null values break the line). */
function gapPath(pts: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = "";
  let pen = false;
  pts.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
  });
  return d;
}

/** gapPath variant that ALSO lifts the pen when the value drops below the
 *  previous point — renders reset-style sawtooths (the motherlode pool) as
 *  broken ascending segments instead of drawing the vertical reset cliff. */
function dropPath(pts: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = "";
  let pen = false;
  let prev: number | null = null;
  pts.forEach((v, i) => {
    if (v == null) { pen = false; prev = null; return; }
    if (prev != null && v < prev) pen = false;
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
    prev = v;
  });
  return d;
}

function scaleOf(values: (number | null)[], zeroFloor = false): { min: number; max: number } {
  const vs = values.filter((v): v is number => v != null);
  if (!vs.length) return { min: 0, max: 1 };
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.05 || 1;
  let min = lo - pad;
  const max = hi + pad;
  if (zeroFloor && lo >= 0) min = Math.max(0, min);
  return { min, max };
}

// ── DualLine: two series, independent left/right axes ────────────────────────
export function DualLine({
  a, b, aName, bName,
  aColor = "#22E0E6", bColor = "#9DB7D8",
  height = 210,
  aFmt = (v: number) => v.toFixed(2),
  bFmt = (v: number) => v.toFixed(2),
  loading = false,
  shared = false,
  band,
  emptyText,
}: {
  a: TPt[]; b: TPt[]; aName: string; bName: string;
  aColor?: string; bColor?: string; height?: number;
  aFmt?: (v: number) => string; bFmt?: (v: number) => string;
  loading?: boolean;
  /** Same-unit series: one combined y-scale, single left axis (no dual-axis). */
  shared?: boolean;
  /** shared-mode only: fill the gap between the lines, green where a > b and
   *  red where a < b, and name it in the legend + tooltip (the "carry"). */
  band?: { name: string };
  /** Copy shown when there are no points yet (and not loading). */
  emptyText?: string;
}) {
  const [ref, W] = useMeasuredWidth();
  const [hover, setHover] = useState<number | null>(null);
  const H = height, padL = 52, padR = 52, padT = 14, padB = 26;
  const n = a.length;
  if (!n) return <div ref={ref} className="w-full"><EmptyBox h={H} loading={loading} text={emptyText} /></div>;

  const sa = shared
    ? scaleOf([...a.map((p) => p.value), ...b.map((p) => p.value)])
    : scaleOf(a.map((p) => p.value));
  const sb = shared ? sa : scaleOf(b.map((p) => p.value));
  const plotR = W - padR, plotB = H - padB;
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (plotR - padL);
  const ya = (v: number) => padT + (1 - (v - sa.min) / (sa.max - sa.min || 1)) * (plotB - padT);
  const yb = (v: number) => padT + (1 - (v - sb.min) / (sb.max - sb.min || 1)) * (plotB - padT);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - padL) / Math.max(1, plotR - padL)) * (n - 1)))));
  };
  const gy = [0, 0.25, 0.5, 0.75, 1];
  const nTicks = Math.min(5, n);
  const xt = Array.from({ length: nTicks }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, nTicks - 1)));

  return (
    <div ref={ref} className="w-full">
      <div className="mb-1.5 flex flex-wrap gap-4 font-mono text-[12.5px] font-semibold text-[#bcc3da]">
        <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: aColor }} /> {aName}</span>
        <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: bColor }} /> {bName}</span>
        {shared && band && (
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#4ADE80", opacity: 0.5 }} /> {band.name}</span>
        )}
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${aName} and ${bName}`}
        style={{ display: "block", maxWidth: "100%", overflow: "visible", touchAction: "pan-y" }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        {gy.map((g, gi) => {
          const yy = padT + g * (plotB - padT);
          return (
            <g key={gi}>
              <line x1={padL} y1={yy} x2={plotR} y2={yy} stroke={GRID} strokeWidth={1} />
              <text x={padL - 6} y={yy + 3.5} fontSize={FS} fontWeight={700} fill={shared ? AXIS : aColor} textAnchor="end" fontFamily="monospace">{aFmt(sa.max - g * (sa.max - sa.min))}</text>
              {!shared && (
                <text x={plotR + 6} y={yy + 3.5} fontSize={FS} fontWeight={700} fill={bColor} textAnchor="start" fontFamily="monospace">{bFmt(sb.max - g * (sb.max - sb.min))}</text>
              )}
            </g>
          );
        })}
        {shared && band && Array.from({ length: n - 1 }, (_, i) => i + 1).map((i) => {
          const a0 = a[i - 1].value, a1 = a[i].value, b0 = b[i - 1].value, b1 = b[i].value;
          if (a0 == null || a1 == null || b0 == null || b1 == null) return null;
          const pos = (a0 + a1) / 2 >= (b0 + b1) / 2;
          return (
            <path key={`band-${i}`} opacity={0.16} fill={pos ? "#4ADE80" : "#F87171"}
              d={`M${x(i - 1).toFixed(1)},${ya(a0).toFixed(1)} L${x(i).toFixed(1)},${ya(a1).toFixed(1)} L${x(i).toFixed(1)},${yb(b1).toFixed(1)} L${x(i - 1).toFixed(1)},${yb(b0).toFixed(1)} Z`} />
          );
        })}
        <path d={gapPath(a.map((p) => p.value), x, ya)} fill="none" stroke={aColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={gapPath(b.map((p) => p.value), x, yb)} fill="none" stroke={bColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {xt.map((idx, ti) => (
          <text key={ti} x={x(idx)} y={H - 8} fontSize={FS} fontWeight={700} fill={AXIS} fontFamily="monospace"
            textAnchor={ti === 0 ? "start" : ti === xt.length - 1 ? "end" : "middle"}>{a[idx].label}</text>
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} y1={padT} x2={x(hover)} y2={plotB} stroke={AXIS} strokeWidth={1} strokeDasharray="3 3" />
            {a[hover].value != null && <circle cx={x(hover)} cy={ya(a[hover].value!)} r={3.5} fill={aColor} stroke={SURFACE} strokeWidth={1.5} />}
            {b[hover].value != null && <circle cx={x(hover)} cy={yb(b[hover].value!)} r={3.5} fill={bColor} stroke={SURFACE} strokeWidth={1.5} />}
            <TrendTooltip x={x(hover)} y={padT + 10} W={W} lines={[
              a[hover].label,
              `${aName}: ${a[hover].value != null ? aFmt(a[hover].value!) : "·"}`,
              `${bName}: ${b[hover].value != null ? bFmt(b[hover].value!) : "·"}`,
              ...(shared && band && a[hover].value != null && b[hover].value != null
                ? [`carry: ${a[hover].value! - b[hover].value! >= 0 ? "+" : ""}${aFmt(a[hover].value! - b[hover].value!)}`]
                : []),
            ]} />
          </g>
        )}
      </svg>
    </div>
  );
}

// ── CostEvChart: market vs production cost (left) + signed EV% area (right) ──
export function CostEvChart({
  market, cost, ev,
  height = 240,
  loading = false,
}: {
  market: TPt[]; cost: TPt[]; ev: TPt[];
  height?: number;
  loading?: boolean;
}) {
  const [ref, W] = useMeasuredWidth();
  const [hover, setHover] = useState<number | null>(null);
  const H = height, padL = 52, padR = 52, padT = 14, padB = 26;
  const MARKET = "#9DB7D8", COST = "#E8881A", POS = "#4ADE80", NEG = "#F87171";
  const n = market.length;
  if (!n) return <div ref={ref} className="w-full"><EmptyBox h={H} loading={loading} /></div>;

  const sl = scaleOf([...market.map((p) => p.value), ...cost.map((p) => p.value)], true);
  // EV scale symmetric around 0 so the zero line sits at a stable position.
  const evAbs = Math.max(...ev.map((p) => Math.abs(p.value ?? 0)), 5) * 1.15;
  const plotR = W - padR, plotB = H - padB;
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (plotR - padL);
  const yl = (v: number) => padT + (1 - (v - sl.min) / (sl.max - sl.min || 1)) * (plotB - padT);
  const ye = (v: number) => padT + (1 - (v + evAbs) / (2 * evAbs)) * (plotB - padT);
  const zeroY = ye(0);

  // Signed area: clip the ev area above/below the zero line into green/red.
  let evArea = "";
  {
    const pts = ev.map((p) => p.value);
    let seg: string[] = [];
    let start = -1;
    pts.forEach((v, i) => {
      if (v == null) { if (seg.length) { evArea += `M${seg.join(" L")} L${x(i - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(start).toFixed(1)},${zeroY.toFixed(1)} Z `; seg = []; } return; }
      if (!seg.length) start = i;
      seg.push(`${x(i).toFixed(1)},${ye(v).toFixed(1)}`);
    });
    if (seg.length) evArea += `M${seg.join(" L")} L${x(n - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(start).toFixed(1)},${zeroY.toFixed(1)} Z`;
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - padL) / Math.max(1, plotR - padL)) * (n - 1)))));
  };
  const gy = [0, 0.25, 0.5, 0.75, 1];
  const nTicks = Math.min(5, n);
  const xt = Array.from({ length: nTicks }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, nTicks - 1)));
  const evNow = ev[n - 1]?.value;

  return (
    <div ref={ref} className="w-full">
      <div className="mb-1.5 flex flex-wrap items-center gap-4 font-mono text-[12.5px] font-semibold text-[#bcc3da]">
        <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: MARKET }} /> market (ORE/SOL)</span>
        <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: COST }} /> production cost</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: POS, opacity: 0.55 }} /> EV+ <span className="h-2.5 w-2.5 rounded-sm" style={{ background: NEG, opacity: 0.55 }} /> EV−</span>
        {evNow != null && (
          <span className="ml-auto rounded-md border border-line px-2 py-1 font-mono text-[13px] font-bold" style={{ color: evNow >= 0 ? POS : NEG }}>
            EV now {evNow >= 0 ? "+" : ""}{evNow.toFixed(1)}%
          </span>
        )}
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="production cost vs market with EV"
        style={{ display: "block", maxWidth: "100%", overflow: "visible", touchAction: "pan-y" }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <clipPath id="ev-above"><rect x={0} y={0} width={W} height={zeroY} /></clipPath>
          <clipPath id="ev-below"><rect x={0} y={zeroY} width={W} height={H - zeroY} /></clipPath>
        </defs>
        {gy.map((g, gi) => {
          const yy = padT + g * (plotB - padT);
          return (
            <g key={gi}>
              <line x1={padL} y1={yy} x2={plotR} y2={yy} stroke={GRID} strokeWidth={1} />
              <text x={padL - 6} y={yy + 3.5} fontSize={FS} fontWeight={700} fill={AXIS} textAnchor="end" fontFamily="monospace">{(sl.max - g * (sl.max - sl.min)).toFixed(2)}</text>
              <text x={plotR + 6} y={yy + 3.5} fontSize={FS} fontWeight={700} fill={AXIS} textAnchor="start" fontFamily="monospace">{(evAbs - g * 2 * evAbs).toFixed(0)}%</text>
            </g>
          );
        })}
        {/* EV area: same path clipped twice, tinted by sign */}
        <path d={evArea} fill={POS} opacity={0.28} clipPath="url(#ev-above)" />
        <path d={evArea} fill={NEG} opacity={0.28} clipPath="url(#ev-below)" />
        <line x1={padL} y1={zeroY} x2={plotR} y2={zeroY} stroke={AXIS} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
        <path d={gapPath(cost.map((p) => p.value), x, yl)} fill="none" stroke={COST} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={gapPath(market.map((p) => p.value), x, yl)} fill="none" stroke={MARKET} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {xt.map((idx, ti) => (
          <text key={ti} x={x(idx)} y={H - 8} fontSize={FS} fontWeight={700} fill={AXIS} fontFamily="monospace"
            textAnchor={ti === 0 ? "start" : ti === xt.length - 1 ? "end" : "middle"}>{market[idx].label}</text>
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} y1={padT} x2={x(hover)} y2={plotB} stroke={AXIS} strokeWidth={1} strokeDasharray="3 3" />
            <TrendTooltip x={x(hover)} y={padT + 10} W={W} lines={[
              market[hover].label,
              `market: ${market[hover].value != null ? market[hover].value!.toFixed(3) : "·"} SOL/ORE`,
              `cost:   ${cost[hover].value != null ? cost[hover].value!.toFixed(3) : "·"} SOL/ORE`,
              `EV:     ${ev[hover].value != null ? (ev[hover].value! >= 0 ? "+" : "") + ev[hover].value!.toFixed(1) + "%" : "·"}`,
            ]} />
          </g>
        )}
      </svg>
    </div>
  );
}

// ── BarsLine: bars (left axis) + line (right axis) ───────────────────────────
export function BarsLine({
  bars, line, barName, lineName,
  barColor = "#5B6CFF", lineColor = "#E8881A",
  height = 210,
  barFmt = (v: number) => v.toFixed(1),
  lineFmt = (v: number) => v.toFixed(0),
  lineBreakOnDrop = false,
  loading = false,
}: {
  bars: TPt[]; line: TPt[]; barName: string; lineName: string;
  barColor?: string; lineColor?: string; height?: number;
  barFmt?: (v: number) => string; lineFmt?: (v: number) => string;
  /** Sawtooth series (motherlode pool): break the line where it resets down. */
  lineBreakOnDrop?: boolean;
  loading?: boolean;
}) {
  const [ref, W] = useMeasuredWidth();
  const [hover, setHover] = useState<number | null>(null);
  const H = height, padL = 52, padR = 52, padT = 14, padB = 26;
  const n = bars.length;
  if (!n) return <div ref={ref} className="w-full"><EmptyBox h={H} loading={loading} /></div>;

  const sb = scaleOf(bars.map((p) => p.value), true);
  sb.min = 0;
  const sln = scaleOf(line.map((p) => p.value), true);
  const plotR = W - padR, plotB = H - padB;
  const bw = (plotR - padL) / n;
  const gap = Math.min(4, bw * 0.25);
  const xC = (i: number) => padL + i * bw + bw / 2;
  const yB = (v: number) => padT + (1 - v / (sb.max || 1)) * (plotB - padT);
  const yL = (v: number) => padT + (1 - (v - sln.min) / (sln.max - sln.min || 1)) * (plotB - padT);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.floor((px - padL) / bw))));
  };
  const gy = [0, 0.25, 0.5, 0.75, 1];
  const nTicks = Math.min(5, n);
  const xt = Array.from({ length: nTicks }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, nTicks - 1)));

  return (
    <div ref={ref} className="w-full">
      <div className="mb-1.5 flex gap-4 font-mono text-[12.5px] font-semibold text-[#bcc3da]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: barColor, opacity: 0.7 }} /> {barName}</span>
        <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: lineColor }} /> {lineName}</span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${barName} and ${lineName}`}
        style={{ display: "block", maxWidth: "100%", overflow: "visible", touchAction: "pan-y" }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        {gy.map((g, gi) => {
          const yy = padT + g * (plotB - padT);
          return (
            <g key={gi}>
              <line x1={padL} y1={yy} x2={plotR} y2={yy} stroke={GRID} strokeWidth={1} />
              <text x={padL - 6} y={yy + 3.5} fontSize={FS} fontWeight={700} fill={barColor} textAnchor="end" fontFamily="monospace">{barFmt(sb.max - g * sb.max)}</text>
              <text x={plotR + 6} y={yy + 3.5} fontSize={FS} fontWeight={700} fill={lineColor} textAnchor="start" fontFamily="monospace">{lineFmt(sln.max - g * (sln.max - sln.min))}</text>
            </g>
          );
        })}
        {bars.map((b, i) =>
          b.value != null ? (
            <rect key={i} x={padL + i * bw + gap / 2} y={yB(b.value)} width={Math.max(1, bw - gap)}
              height={Math.max(0, plotB - yB(b.value))} rx={2} fill={barColor} opacity={hover === i ? 0.95 : 0.55} />
          ) : null,
        )}
        <path d={(lineBreakOnDrop ? dropPath : gapPath)(line.map((p) => p.value), xC, yL)} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {xt.map((idx, ti) => (
          <text key={ti} x={xC(idx)} y={H - 8} fontSize={FS} fontWeight={700} fill={AXIS} fontFamily="monospace"
            textAnchor={ti === 0 ? "start" : ti === xt.length - 1 ? "end" : "middle"}>{bars[idx].label}</text>
        ))}
        {hover != null && (
          <g>
            <TrendTooltip x={xC(hover)} y={padT + 10} W={W} lines={[
              bars[hover].label,
              `${barName}: ${bars[hover].value != null ? barFmt(bars[hover].value!) : "·"}`,
              `${lineName}: ${line[hover].value != null ? lineFmt(line[hover].value!) : "·"}`,
            ]} />
          </g>
        )}
      </svg>
    </div>
  );
}


// ── PopBars: motherlode pops vs the 125 ORE long-run average ─────────────────
// EV-chart language on bars: the slice of a pop ABOVE 125 is green (surplus),
// pops that landed short of 125 draw red, the live still-accruing pool is cyan.
export function PopBars({
  bars, expected, height = 210,
  fmt = (v: number) => v.toFixed(1),
  liveLast = false,
  loading = false,
}: {
  bars: TPt[]; expected: number; height?: number;
  fmt?: (v: number) => string;
  /** The final bar is the live pool (not a settled pop). */
  liveLast?: boolean;
  loading?: boolean;
}) {
  const [ref, W] = useMeasuredWidth();
  const [hover, setHover] = useState<number | null>(null);
  const H = height, padL = 52, padR = 14, padT = 14, padB = 26;
  const POS = "#4ADE80", NEG = "#F87171", BASE = "#5B6CFF", LIVE = "#22E0E6";
  const n = bars.length;
  if (!n) return <div ref={ref} className="w-full"><EmptyBox h={H} loading={loading} /></div>;

  const hi = Math.max(...bars.map((p) => p.value ?? 0), expected) * 1.12;
  const plotR = W - padR, plotB = H - padB;
  const bw = (plotR - padL) / n;
  const gap = Math.min(4, bw * 0.25);
  const xC = (i: number) => padL + i * bw + bw / 2;
  const y = (v: number) => padT + (1 - v / (hi || 1)) * (plotB - padT);
  const yExp = y(expected);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.floor((px - padL) / bw))));
  };
  const gy = [0, 0.25, 0.5, 0.75, 1];
  const nTicks = Math.min(5, n);
  const xt = Array.from({ length: nTicks }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, nTicks - 1)));

  return (
    <div ref={ref} className="w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="motherlode pops vs long-run average"
        style={{ display: "block", maxWidth: "100%", overflow: "visible", touchAction: "pan-y" }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        {gy.map((g, gi) => {
          const yy = padT + g * (plotB - padT);
          return (
            <g key={gi}>
              <line x1={padL} y1={yy} x2={plotR} y2={yy} stroke={GRID} strokeWidth={1} />
              <text x={padL - 6} y={yy + 3.5} fontSize={FS} fontWeight={700} fill={AXIS} textAnchor="end" fontFamily="monospace">{fmt(hi - g * hi)}</text>
            </g>
          );
        })}
        {bars.map((b, i) => {
          if (b.value == null) return null;
          const v = b.value;
          const isLive = liveLast && i === n - 1;
          const bx = padL + i * bw + gap / 2;
          const bwid = Math.max(1, bw - gap);
          const hot = hover === i;
          if (isLive) {
            return <rect key={i} x={bx} y={y(v)} width={bwid} height={Math.max(0, plotB - y(v))} rx={2} fill={LIVE} opacity={hot ? 1 : 0.9} />;
          }
          if (v >= expected) {
            return (
              <g key={i}>
                <rect x={bx} y={yExp} width={bwid} height={Math.max(0, plotB - yExp)} rx={2} fill={BASE} opacity={hot ? 0.85 : 0.55} />
                <rect x={bx} y={y(v)} width={bwid} height={Math.max(0, yExp - y(v))} rx={2} fill={POS} opacity={hot ? 0.95 : 0.7} />
              </g>
            );
          }
          return <rect key={i} x={bx} y={y(v)} width={bwid} height={Math.max(0, plotB - y(v))} rx={2} fill={NEG} opacity={hot ? 0.9 : 0.6} />;
        })}
        <line x1={padL} y1={yExp} x2={plotR} y2={yExp} stroke={AXIS} strokeWidth={1} strokeDasharray="4 3" opacity={0.8} />
        <text x={plotR - 4} y={yExp - 5} fontSize={FS} fontWeight={700} fill={AXIS} textAnchor="end" fontFamily="monospace">{fmt(expected)}</text>
        {xt.map((idx, ti) => (
          <text key={ti} x={xC(idx)} y={H - 8} fontSize={FS} fontWeight={700} fill={AXIS} fontFamily="monospace"
            textAnchor={ti === 0 ? "start" : ti === xt.length - 1 ? "end" : "middle"}>{bars[idx].label}</text>
        ))}
        {hover != null && bars[hover].value != null && (
          <TrendTooltip x={xC(hover)} y={padT + 10} W={W} lines={
            liveLast && hover === n - 1
              ? [bars[hover].label, `live pool: ${fmt(bars[hover].value!)}`, `vs avg: ${bars[hover].value! - expected >= 0 ? "+" : ""}${fmt(bars[hover].value! - expected)}`]
              : [bars[hover].label, `pop: ${fmt(bars[hover].value!)}`, `vs avg: ${bars[hover].value! - expected >= 0 ? "+" : ""}${fmt(bars[hover].value! - expected)}`]
          } />
        )}
      </svg>
    </div>
  );
}

// ── PnlChart: cumulative P/L line with signed green/red fill + end badge ─────
export function PnlChart({
  points, height = 220, fmt = (v: number) => v.toFixed(2),
  loading = false, emptyText,
}: {
  points: TPt[]; height?: number; fmt?: (v: number) => string;
  loading?: boolean; emptyText?: string;
}) {
  const [ref, W] = useMeasuredWidth();
  const [hover, setHover] = useState<number | null>(null);
  const H = height, padL = 14, padR = 64, padT = 14, padB = 26;
  const POS = "#4ADE80", NEG = "#F87171";
  const n = points.length;
  if (!n) return <div ref={ref} className="w-full"><EmptyBox h={H} loading={loading} text={emptyText} /></div>;

  const vs = points.map((p) => p.value ?? 0);
  const lo = Math.min(...vs, 0), hi = Math.max(...vs, 0);
  const pad = (hi - lo) * 0.1 || 1;
  const min = lo - pad, max = hi + pad;
  const plotR = W - padR, plotB = H - padB;
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (plotR - padL);
  const y = (v: number) => padT + (1 - (v - min) / (max - min || 1)) * (plotB - padT);
  const zeroY = y(0);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value ?? 0).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z`;
  const last = points[n - 1].value ?? 0;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - padL) / Math.max(1, plotR - padL)) * (n - 1)))));
  };
  const gy = [0, 0.25, 0.5, 0.75, 1];
  const nTicks = Math.min(5, n);
  const xt = Array.from({ length: nTicks }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, nTicks - 1)));

  return (
    <div ref={ref} className="w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="cumulative profit and loss"
        style={{ display: "block", maxWidth: "100%", overflow: "visible", touchAction: "pan-y" }}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <clipPath id="pnl-above"><rect x={0} y={0} width={W} height={zeroY} /></clipPath>
          <clipPath id="pnl-below"><rect x={0} y={zeroY} width={W} height={H - zeroY} /></clipPath>
        </defs>
        {gy.map((g, gi) => {
          const yy = padT + g * (plotB - padT);
          return (
            <g key={gi}>
              <line x1={padL} y1={yy} x2={plotR} y2={yy} stroke={GRID} strokeWidth={1} />
              <text x={plotR + 6} y={yy + 3.5} fontSize={FS} fontWeight={700} fill={AXIS} textAnchor="start" fontFamily="monospace">{fmt(max - g * (max - min))}</text>
            </g>
          );
        })}
        <path d={area} fill={POS} opacity={0.22} clipPath="url(#pnl-above)" />
        <path d={area} fill={NEG} opacity={0.22} clipPath="url(#pnl-below)" />
        <line x1={padL} y1={zeroY} x2={plotR} y2={zeroY} stroke={AXIS} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
        <path d={line} fill="none" stroke={last >= 0 ? POS : NEG} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" clipPath="url(#pnl-above)" />
        <path d={line} fill="none" stroke={NEG} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" clipPath="url(#pnl-below)" />
        <g>
          <rect x={plotR + 4} y={y(last) - 10} width={padR - 8} height={20} rx={4} fill={last >= 0 ? POS : NEG} />
          <text x={plotR + padR / 2} y={y(last) + 4} fontSize={12} fontWeight={700} fill="#070912" textAnchor="middle" fontFamily="monospace">{fmt(last)}</text>
        </g>
        {xt.map((idx, ti) => (
          <text key={ti} x={x(idx)} y={H - 8} fontSize={FS} fontWeight={700} fill={AXIS} fontFamily="monospace"
            textAnchor={ti === 0 ? "start" : ti === xt.length - 1 ? "end" : "middle"}>{points[idx].label}</text>
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} y1={padT} x2={x(hover)} y2={plotB} stroke={AXIS} strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(points[hover].value ?? 0)} r={3.5} fill={(points[hover].value ?? 0) >= 0 ? POS : NEG} stroke={SURFACE} strokeWidth={1.5} />
            <TrendTooltip x={x(hover)} y={padT + 10} W={W} lines={[points[hover].label, `cumulative: ${fmt(points[hover].value ?? 0)}`]} />
          </g>
        )}
      </svg>
    </div>
  );
}
