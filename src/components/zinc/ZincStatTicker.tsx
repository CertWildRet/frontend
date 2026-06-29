"use client";

import { useZincLiveStats } from "@/hooks/useZincLiveStats";
import { useZincRoundStats } from "@/hooks/useZincRoundStats";
import { useZincData } from "@/hooks/useZincData";

/**
 * Thin live data strip under the header on /zinc — the dZINC twin of StatTicker.
 * "crank online" comes from the ZINC keeper SSE connection; round / pot / players
 * from /api/zinc-round-state; the fee is read live from the bucket; tiles (30)
 * is a fixed protocol constant. Honest "··" when a feed is off.
 */
export function ZincStatTicker() {
  const { connected, enabled } = useZincLiveStats();
  const { stats: round } = useZincRoundStats();
  const { data } = useZincData();
  const online = enabled && connected;

  const fee = data?.initialized
    ? data.pullFeeEnabled
      ? `${(data.pullFeeBps / 100).toFixed(1)}%`
      : "0%"
    : "··";

  const items: { k: string; v: string; live?: boolean }[] = [
    { k: "crank", v: enabled ? (connected ? "online" : "connecting") : "standby", live: online },
    { k: "round", v: round?.initialized ? `#${round.roundId}` : "··" },
    { k: "pot", v: round?.initialized ? `${round.totalDeployedSol.toFixed(2)} SOL` : "··" },
    { k: "players", v: round?.initialized ? String(round.players) : "··" },
    { k: "tiles", v: "30" },
    { k: "fee", v: fee },
  ];

  return (
    <div className="relative bg-ink-950/70 backdrop-blur">
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
      {/* spectral (rainbow) divider under the stats strip */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 block h-[1.5px]"
        style={{
          background: "linear-gradient(90deg,#22E0E6,#5B6CFF,#9A6BFF,#FF5AC8,#FFC061)",
          opacity: 0.85,
        }}
      />
    </div>
  );
}
