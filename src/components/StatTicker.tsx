"use client";

import { useLiveStats } from "@/hooks/useLiveStats";
import { useVaultData } from "@/hooks/useVaultData";

/**
 * Thin live data strip under the header. Honest: live values come from the
 * keeper feed when it's connected, otherwise they read "···". The fee is read
 * live from the bucket; tiles (25) is a fixed protocol constant.
 */
export function StatTicker() {
  const { stats, connected, enabled } = useLiveStats();
  const { data } = useVaultData();
  const online = enabled && connected;

  const fee = data?.initialized
    ? data.pullFeeEnabled
      ? `${(data.pullFeeBps / 100).toFixed(1)}%`
      : "0%"
    : "···";

  const items: { k: string; v: string; live?: boolean }[] = [
    { k: "crank", v: enabled ? (connected ? "online" : "connecting") : "standby", live: online },
    { k: "round", v: stats ? `#${stats.roundId}` : "···" },
    { k: "deployed", v: stats ? `${stats.totalDeployedSol.toFixed(2)} SOL` : "···" },
    { k: "motherlode", v: stats ? `${stats.motherlodePoolOre.toFixed(1)} ORE` : "···" },
    { k: "miners", v: stats ? String(stats.totalMiners) : "···" },
    { k: "tiles", v: "25" },
    { k: "fee", v: fee },
  ];

  return (
    <div className="relative bg-ink-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-4 py-2 font-mono text-[12px] [mask-image:linear-gradient(to_right,transparent,#000_14px,#000_calc(100%-22px),transparent)] [scrollbar-width:none] md:gap-5 md:px-6 md:[mask-image:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it, i) => (
          <div key={i} className="flex shrink-0 items-center gap-1.5">
            {it.live ? <span className="live-dot text-pos" /> : null}
            <span className="uppercase tracking-wider text-fog-muted">{it.k}</span>
            <span className={it.live ? "text-white" : "text-fog"}>{it.v}</span>
            {i < items.length - 1 && <span className="pl-3 text-line-bright">·</span>}
          </div>
        ))}
      </div>
      {/* spectral (rainbow) divider under the stats strip */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 block h-[1.5px]"
        style={{
          background:
            "linear-gradient(90deg,#22E0E6,#5B6CFF,#9A6BFF,#FF5AC8,#FFC061)",
          opacity: 0.85,
        }}
      />
    </div>
  );
}
