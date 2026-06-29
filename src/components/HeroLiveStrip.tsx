"use client";

import Link from "next/link";
import { useLiveStats } from "@/hooks/useLiveStats";
import { useZincRoundStats } from "@/hooks/useZincRoundStats";
import { formatNum, formatSol } from "@/lib/format";

const mono = { fontFamily: "'JetBrains Mono Variable', monospace" } as const;

type Metric = { k: string; v: string; unit?: string };

/**
 * Hero live-proof strip: a slim glass band under the hero proving both pools are
 * working the board right now. dORE metrics come from the ORE brain SSE; dZINC
 * metrics from the ZINC keeper's /api/zinc-round-state (round id / pot / players
 * — per-tile is encrypted, these aggregates are not). Each pool is its own
 * clickable block. Degrades gracefully when a feed is off.
 */
export function HeroLiveStrip() {
  const { stats: ore, connected, enabled } = useLiveStats();
  const { stats: zinc } = useZincRoundStats();
  const live = enabled && connected;

  const oreMetrics: Metric[] = [
    { k: "round", v: ore ? `#${ore.roundId}` : "···" },
    { k: "deployed", v: ore ? formatSol(ore.totalDeployedSol, 1) : "···", unit: "SOL" },
    { k: "miners", v: ore ? formatNum(ore.totalMiners) : "···" },
  ];
  const zincMetrics: Metric[] =
    zinc && zinc.initialized
      ? [
          { k: "round", v: `#${zinc.roundId}` },
          { k: "pot", v: formatSol(zinc.totalDeployedSol, 1), unit: "SOL" },
          { k: "players", v: formatNum(zinc.players) },
        ]
      : [{ k: "coverage", v: "30 / 30 tiles" }];

  return (
    <div className="glass relative overflow-hidden rounded-2xl px-5 py-4 sm:px-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,#5B6CFF55,#9A6BFF55,transparent)" }}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <span
          className={`chip shrink-0 self-start ${live ? "border-pos/40 text-white" : "border-line text-fog-muted"}`}
        >
          {live ? <span className="live-dot text-pos" /> : null}
          {live ? "live on-chain" : enabled ? "connecting" : "two pools"}
        </span>

        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <PoolRow href="/ore" label="dORE" dot="#22E0E6" border="#5B6CFF" metrics={oreMetrics} />
          <span aria-hidden className="hidden h-7 w-px bg-line sm:block" />
          <PoolRow href="/zinc" label="dZINC" dot="#9A6BFF" border="#9A6BFF" metrics={zincMetrics} />
        </div>
      </div>
    </div>
  );
}

function PoolRow({
  href,
  label,
  dot,
  border,
  metrics,
}: {
  href: string;
  label: string;
  dot: string;
  border: string;
  metrics: Metric[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <Link
        href={href}
        className="chip text-[#EAECF6] transition-colors hover:text-white"
        style={{ borderColor: `${border}66` }}
      >
        <span className="h-1.5 w-1.5 rotate-45" style={{ background: dot }} /> {label}
      </Link>
      {metrics.map((m) => (
        <div key={m.k} className="flex items-baseline gap-1.5" style={mono}>
          <span className="text-[10px] uppercase tracking-[0.16em] text-fog-muted">{m.k}</span>
          <span className="text-[14px] tabular-nums text-white">{m.v}</span>
          {m.unit && <span className="text-[11px] text-fog-muted">{m.unit}</span>}
        </div>
      ))}
    </div>
  );
}
