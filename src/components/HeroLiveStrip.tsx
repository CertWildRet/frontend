"use client";

import Link from "next/link";
import { useLiveStats } from "@/hooks/useLiveStats";
import { formatNum, formatSol } from "@/lib/format";

const mono = { fontFamily: "'JetBrains Mono Variable', monospace" } as const;

/**
 * Hero live-proof strip: a slim glass band under the hero that shows the keeper
 * is actually working the board right now (ORE round / deployed / miners /
 * motherlode from the brain SSE) and gives direct dORE + dZINC entry. Fills the
 * first-view negative space with motion + proof rather than decoration. Degrades
 * gracefully to a static "two pools, live on-chain" line when the feed is off.
 */
export function HeroLiveStrip() {
  const { stats, connected, enabled } = useLiveStats();
  const live = enabled && connected && !!stats;

  return (
    <div
      className={`${"glass"} relative flex flex-col gap-4 overflow-hidden rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-7`}
    >
      {/* faint spectral baseline so the strip reads as a "floor" to the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,#5B6CFF55,#9A6BFF55,transparent)" }}
      />

      {/* left: live status + the two pools */}
      <div className="flex items-center gap-2.5">
        <span
          className={`chip shrink-0 ${live ? "border-pos/40 text-white" : "border-line text-fog-muted"}`}
        >
          {live ? <span className="live-dot text-pos" /> : null}
          {live ? "live on-chain" : enabled ? "connecting" : "two pools"}
        </span>
        <Link
          href="/ore"
          className="chip border-[#5B6CFF]/40 text-[#BFE6FF] transition-colors hover:text-white"
        >
          <span className="h-1.5 w-1.5 rotate-45 bg-[#22E0E6]" /> dORE
        </Link>
        <Link
          href="/zinc"
          className="chip border-[#9A6BFF]/40 text-[#D8C5FF] transition-colors hover:text-white"
        >
          <span className="h-1.5 w-1.5 rotate-45 bg-[#9A6BFF]" /> dZINC
        </Link>
      </div>

      {/* right: live keeper metrics (ORE board feed) */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:justify-end">
        <Metric label="ORE round" value={stats ? `#${stats.roundId}` : "···"} />
        <Metric label="Deployed" value={stats ? formatSol(stats.totalDeployedSol, 1) : "···"} unit="SOL" />
        <Metric label="Miners" value={stats ? formatNum(stats.totalMiners) : "···"} />
        <Metric label="Motherlode" value={stats ? formatNum(stats.motherlodePoolOre, 1) : "···"} unit="ORE" accent />
      </div>
    </div>
  );
}

function Metric({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5" style={mono}>
      <span className="text-[10px] uppercase tracking-[0.18em] text-fog-muted">{label}</span>
      <span className={`text-[15px] tabular-nums ${accent ? "gradient-text" : "text-white"}`}>{value}</span>
      {unit && <span className="text-[11px] text-fog-muted">{unit}</span>}
    </div>
  );
}
