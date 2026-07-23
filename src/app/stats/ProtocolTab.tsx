"use client";

/**
 * Protocol internals — rake, vaulted SOL, winners. Owns its own time range
 * because /ore/series doesn't serve 24h (the Trends picker does).
 */
import { useState } from "react";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { Refreshing } from "@/components/primitives/Skeleton";
import { AreaLine, ChartCard, compactNum, type Pt } from "@/components/stats/Charts";
import { usePolled } from "@/hooks/useOreStats";
import { fetchOreSeries, lamportsToSol, type OreSeriesPoint } from "@/lib/oreStats";
import { formatSol, formatNum } from "@/lib/format";
import { Caveats } from "./shared";

const PROTOCOL_RANGES: { id: string; label: string }[] = [
  { id: "7d", label: "7D" }, { id: "30d", label: "30D" }, { id: "90d", label: "90D" }, { id: "1y", label: "1Y" }, { id: "all", label: "All" },
];

export function ProtocolTab() {
  const [range, setRange] = useState("30d");
  const series = usePolled(() => fetchOreSeries(range), 60_000, [range]);
  const pts = series.data?.points ?? [];
  const lbl = (p: OreSeriesPoint) => {
    const dt = new Date(Number(p.bucket_ts) * 1000);
    return range === "7d" ? `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:00` : `${dt.getMonth() + 1}/${dt.getDate()}`;
  };
  const mk = (pick: (p: OreSeriesPoint) => number): Pt[] => pts.map((p) => ({ label: lbl(p), value: pick(p) }));
  // matches /ore/series bucketing: 7d hourly, 30d/90d daily, 1y/all weekly
  const seriesPer = range === "7d" ? "hour" : range === "1y" || range === "all" ? "week" : "day";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-y-2">
        <div className="section-label">
          Protocol internals · rake, vaulted, winners
          <Refreshing active={series.fetching && !!series.data} />
        </div>
        <SegmentedControl aria-label="Protocol time range" items={PROTOCOL_RANGES} value={range} onChange={setRange} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard variant="dispersion" cutCorner="tr" title="SOL deployed" subtitle={`Total SOL deployed to play the rounds, per ${seriesPer}.`}>
          <AreaLine spectral fill points={mk((p) => lamportsToSol(p.deployed))} height={195} fmt={(v) => formatSol(v, 0) + " SOL"} yFmt={compactNum} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="bl" title="Effective rake" subtitle={`What the protocol keeps of the SOL played, per ${seriesPer} (1% admin + ~9.9% buyback). Zoomed way in; it barely moves.`}>
          <AreaLine spectral fill points={mk((p) => (p.avg_rake_bps ?? 0) / 100)} height={195} zeroBaseline={false} fmt={(v) => v.toFixed(4) + "%"} yFmt={(v) => v.toFixed(2) + "%"} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="tr" title="SOL vaulted (protocol take)" subtitle={`Total SOL the protocol kept (buyback + admin fee), per ${seriesPer}.`}>
          <AreaLine spectral fill points={mk((p) => lamportsToSol(p.vaulted))} height={195} fmt={(v) => formatSol(v, 1) + " SOL"} yFmt={compactNum} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="bl" title="Winners / round" subtitle="Avg miners rewarded per round (reset-event count).">
          <AreaLine
            spectral
            fill
            points={pts.filter((p) => p.avg_winners != null).map((p) => ({ label: lbl(p), value: Number(p.avg_winners) }))}
            height={195} zeroBaseline={false} fmt={(v) => formatNum(v, 0)} />
        </ChartCard>
      </div>
      <Caveats provenance={series.provenance} error={series.error} onRetry={series.refresh} />
    </div>
  );
}
