"use client";

/**
 * Loading skeletons — the "buffer state" between mount and first data. Three
 * rules across the app:
 *   loading (no data yet)  -> skeleton shimmer (these components)
 *   loaded but empty       -> the explicit "no data yet" copy
 *   refetching w/ stale    -> keep the stale view + a subtle Refreshing pulse
 * Tokens match the glass theme: ink-800 base, faint white sweep.
 */

function Shimmer({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-white/[0.04] ${className}`}
      style={style}
      aria-hidden
    >
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer-thrice"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.055), transparent)",
        }}
      />
    </div>
  );
}

/** Chart-shaped skeleton: a plot block with a fake axis rail. */
export function ChartSkeleton({ height = 210 }: { height?: number }) {
  return (
    <div role="status" aria-label="loading chart" className="w-full">
      <div className="mb-1.5 flex gap-4">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-3 w-20" />
      </div>
      <Shimmer style={{ height }} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Table-shaped skeleton: header bar + n rows. */
export function RowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="loading table" className="space-y-2">
      <Shimmer className="h-8 w-full opacity-80" />
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} className="h-7 w-full" style={{ opacity: 1 - i * 0.09 }} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Stat-tile skeleton (hero bands). */
export function TileSkeleton() {
  return (
    <div role="status" aria-label="loading stat" className="card space-y-2 px-4 py-4">
      <Shimmer className="h-3 w-20" />
      <Shimmer className="h-6 w-24" />
      <Shimmer className="h-2.5 w-28" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Tiny "background refresh in progress" hint — sits beside a section label so
 *  a range/tab switch visibly does something while stale data stays up. */
export function Refreshing({ active, label = "refreshing" }: { active: boolean; label?: string }) {
  if (!active) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1.5 font-mono text-[12px] font-semibold text-[#9fe8ec]" role="status">
      <span className="h-1.5 w-1.5 animate-pulse-thrice rounded-full bg-[#22E0E6]" />
      {label}
    </span>
  );
}
