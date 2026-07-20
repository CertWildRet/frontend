"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Shared stat primitives used across the ORE and ZINC pool surfaces (PoolStats/
 * ZincStats, PoolEconomics/ZincEconomics, ...). Previously every one of those
 * components hand-rolled its own near-identical "label + num + unit + hint"
 * tile and "k / v / unit / sub" row. These are the single source of truth.
 */

// SSR-safe layout effect (measure before paint on the client, plain effect on the server).
const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Shrink-to-fit for a value row: when its (whitespace-nowrap) content is wider
 * than the tile — a six-figure whale like FeNY's 63,528.13 SOL — scale it down
 * to fit instead of overflowing the tile / forcing the grid track wider. Returns
 * 1 (no transform) for the overwhelming majority of tiles that already fit.
 */
function useFitScale(deps: unknown[]): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useIsoLayout(() => {
    const el = ref.current;
    if (!el) return;
    // scrollWidth/clientWidth are layout metrics, untouched by the CSS transform,
    // so re-measuring while already scaled is stable — no feedback loop.
    const fit = () => {
      const need = el.scrollWidth, avail = el.clientWidth;
      setScale(need > avail + 1 && avail > 0 ? Math.max(0.5, avail / need) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [ref, scale];
}

type Tone = "gold" | "silver";

function toneClass(tone?: Tone) {
  return tone === "gold"
    ? "gradient-text"
    : tone === "silver"
      ? "gradient-silver text-glow-silver"
      : "text-white";
}

/**
 * A labelled stat tile. `variant="card"` is the headline stat-grid tile (TVL,
 * price, ...); `variant="inset"` is the smaller boxed figure used inside the
 * economics panels. `valueSize` is a full Tailwind text-size class.
 */
export function StatTile({
  label,
  value,
  unit,
  hint,
  tone,
  variant = "card",
  valueSize = "text-xl",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  tone?: Tone;
  variant?: "card" | "inset";
  valueSize?: string;
  className?: string;
}) {
  const wrap =
    variant === "card"
      ? "card px-4 py-3.5"
      : "rounded-lg border border-line bg-ink-800 px-3 py-2.5";
  const [fitRef, scale] = useFitScale([value, unit, valueSize]);
  return (
    <div className={`${wrap} min-w-0 ${className ?? ""}`}>
      <div className="label">{label}</div>
      <div
        ref={fitRef}
        className="mt-1.5 flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap"
        style={scale < 1 ? { transform: `scale(${scale})`, transformOrigin: "left center" } : undefined}
      >
        <span className={`num ${valueSize} ${toneClass(tone)}`}>{value}</span>
        {unit && <span className="font-mono text-xs text-fog-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 font-mono text-[12px] leading-tight text-fog-muted">{hint}</div>}
    </div>
  );
}

/** A key / value row (value right-aligned, optional unit + sub-line). */
export function StatRow({
  k,
  v,
  unit,
  sub,
  strong,
  className,
}: {
  k: ReactNode;
  v: string;
  unit?: string;
  sub?: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 font-mono text-xs ${className ?? ""}`}>
      <span className="min-w-0 text-fog-muted">{k}</span>
      {/* min-w-0 (NOT shrink-0): the column must be allowed to shrink below its
          content width, or a long `sub` annotation renders as one unwrappable
          line and drags the whole page out sideways on mobile. The VALUE line
          alone stays nowrap (numbers never break); the sub wraps, capped at a
          readable measure. */}
      <span className="flex min-w-0 flex-col items-end text-right leading-tight">
        <span className="whitespace-nowrap">
          <span className={`num ${strong ? "text-gold" : "text-gray-200"}`}>{v}</span>
          {unit && <span className="ml-1 text-[12px] text-fog-muted">{unit}</span>}
        </span>
        {sub && (
          <span className="mt-0.5 max-w-[24ch] break-words text-[11px] leading-snug text-fog-muted">
            {sub}
          </span>
        )}
      </span>
    </div>
  );
}

/** A titled group of StatRows inside a panel/card. */
export function StatSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-5">
      <div className="section-label mb-2">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
