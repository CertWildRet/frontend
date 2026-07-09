"use client";

import Link from "next/link";
import { useLiveStats } from "@/hooks/useLiveStats";
import { formatNum, formatSol } from "@/lib/format";

const mono = { fontFamily: "'JetBrains Mono Variable', monospace" } as const;

type Metric = { k: string; v: string; unit?: string };

/**
 * Hero live-proof strip: the dORE pool working the board right now, metrics from
 * the ORE brain SSE (round / deployed / miners). Degrades gracefully when the
 * feed is off.
 */
export function HeroLiveStrip() {
  const { stats: ore, connected, enabled } = useLiveStats();
  const live = enabled && connected;

  const oreMetrics: Metric[] = [
    { k: "round", v: ore ? `#${ore.roundId}` : "···" },
    { k: "deployed", v: ore ? formatSol(ore.totalDeployedSol, 1) : "···", unit: "SOL" },
    { k: "miners", v: ore ? formatNum(ore.totalMiners) : "···" },
  ];

  return (
    <div className="glass relative overflow-hidden rounded-2xl px-5 py-4 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,#5B6CFF55,#9A6BFF55,transparent)" }}
      />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-7">
        <span
          className={`chip shrink-0 self-start lg:self-center ${live ? "border-pos/40 text-white" : "border-line text-fog-muted"}`}
        >
          {live ? <span className="live-dot text-pos" /> : null}
          {live ? "live on-chain" : enabled ? "connecting" : "the pool"}
        </span>

        <div className="flex-1">
          <PoolBlock href="/ore" label="dORE" dot="#22E0E6" border="#5B6CFF" metrics={oreMetrics} />
        </div>
      </div>
    </div>
  );
}

function PoolBlock({
  href,
  label,
  dot,
  border,
  metrics,
  className,
}: {
  href: string;
  label: string;
  dot: string;
  border: string;
  metrics: Metric[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ""}`}>
      <Link
        href={href}
        className="chip self-start text-[#EAECF6] transition-colors hover:text-white"
        style={{ borderColor: `${border}66` }}
      >
        <span className="h-1.5 w-1.5 rotate-45" style={{ background: dot }} /> {label}
      </Link>
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5" style={mono}>
        {metrics.map((m) => (
          <span key={m.k} className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[10px] uppercase tracking-[0.16em] text-fog-muted">{m.k}</span>
            <span className="text-[14px] tabular-nums text-white">{m.v}</span>
            {m.unit && <span className="text-[11px] text-fog-muted">{m.unit}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
