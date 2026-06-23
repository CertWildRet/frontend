"use client";

import { useLiveStats } from "@/hooks/useLiveStats";

/**
 * Thin live data strip under the header. Honest: live values come from the
 * keeper feed when it's connected, otherwise they read "··". The constants
 * (tiles, fee) are facts.
 */
export function StatTicker() {
  const { stats, connected, enabled } = useLiveStats();
  const online = enabled && connected;

  const items: { k: string; v: string; live?: boolean }[] = [
    { k: "keeper", v: enabled ? (connected ? "online" : "connecting") : "standby", live: online },
    { k: "round", v: stats ? `#${stats.roundId}` : "··" },
    { k: "deployed", v: stats ? `${stats.totalDeployedSol.toFixed(2)} SOL` : "··" },
    { k: "motherlode", v: stats ? `${stats.motherlodePoolOre.toFixed(1)} ORE` : "··" },
    { k: "miners", v: stats ? String(stats.totalMiners) : "··" },
    { k: "tiles", v: "25" },
    { k: "fee", v: "1%" },
  ];

  return (
    <div className="border-b border-line/60 bg-ink-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-6 py-2 font-mono text-[12px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it, i) => (
          <div key={i} className="flex shrink-0 items-center gap-1.5">
            {it.live ? <span className="live-dot text-pos" /> : null}
            <span className="uppercase tracking-wider text-fog-muted">{it.k}</span>
            <span className={it.live ? "text-white" : "text-fog"}>{it.v}</span>
            {i < items.length - 1 && <span className="pl-3 text-line-bright">·</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
