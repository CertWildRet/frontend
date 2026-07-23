"use client";

/**
 * Ecosystem — investor metrics: supply, buybacks, pools, whales, claims.
 * Joins /ore/trends market_ratio_sol onto daily ecosystem points for the
 * Buyback pressure dual-axis chart.
 */
import { useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { TileSkeleton, Refreshing } from "@/components/primitives/Skeleton";
import { AreaLine, ChartCard, compactNum, type Pt } from "@/components/stats/Charts";
import { DualLine, BarsLine, SOL_COLOR, ORE_COLOR, type TPt } from "@/components/stats/TrendCharts";
import { usePolled } from "@/hooks/useOreStats";
import { fetchOreEcosystem, fetchOreTrends, type OreEcoPoint } from "@/lib/oreStats";
import { formatSol, formatNum } from "@/lib/format";
import { Caveats } from "./shared";

const ECO_RANGES: { id: string; label: string }[] = [
  { id: "30d", label: "30D" }, { id: "90d", label: "90D" }, { id: "all", label: "All" },
];

function indexByTs<T extends { day_ts?: number }>(rows: T[], key: "day_ts"): Map<number, T> {
  return new Map(rows.map((r) => [r[key] as number, r]));
}

export function EcosystemTab() {
  const [range, setRange] = useState("90d");
  const eco = usePolled(() => fetchOreEcosystem(range), 60_000, [range]);
  const trends = usePolled(() => fetchOreTrends(range), 60_000, [range]);
  const pts = eco.data?.points ?? [];
  const sum = eco.data?.summary;
  const marketByDay = indexByTs(trends.data?.points ?? [], "day_ts");
  const dayLbl = (ts: number) => { const dt = new Date(ts * 1000); return `${dt.getMonth() + 1}/${dt.getDate()}`; };
  const mkP = (pick: (p: OreEcoPoint) => number | null): Pt[] =>
    pts.filter((p) => pick(p) != null).map((p) => ({ label: dayLbl(p.day_ts), value: pick(p)! }));
  const mkN = (pick: (p: OreEcoPoint) => number | null): TPt[] =>
    pts.map((p) => ({ label: dayLbl(p.day_ts), value: pick(p) }));
  const buybackBars: TPt[] = pts.map((p) => ({ label: dayLbl(p.day_ts), value: p.buyback_sol }));
  const oreSolLine: TPt[] = pts.map((p) => ({
    label: dayLbl(p.day_ts),
    value: marketByDay.get(p.day_ts)?.market_ratio_sol ?? null,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-y-2">
        <div className="section-label">
          Ecosystem · supply, buybacks &amp; market structure
          <Refreshing active={eco.fetching && !!eco.data} />
        </div>
        <SegmentedControl aria-label="Time range" items={ECO_RANGES} value={range} onChange={setRange} />
      </div>

      {eco.loading && !eco.data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><TileSkeleton /><TileSkeleton /><TileSkeleton /><TileSkeleton /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Circulating ORE" value={sum?.circulating_ore != null ? formatNum(sum.circulating_ore, 0) : "···"} unit="ORE" tone="gold" hint="from the last buyback event" />
          <StatTile label="Burned (window)" value={sum?.lifetime_burned_ore != null ? formatNum(sum.lifetime_burned_ore, 0) : "···"} unit="ORE" hint={`+ ${sum?.lifetime_shared_ore != null ? formatNum(sum.lifetime_shared_ore, 0) : "·"} shared to stakers`} />
          <StatTile label="Buyback SOL (window)" value={sum?.lifetime_buyback_sol != null ? formatNum(sum.lifetime_buyback_sol, 0) : "···"} unit="SOL" hint="swapped into ORE and burned" />
          <StatTile label="Unclaimed ORE now" value={sum?.unclaimed_ore_now != null ? formatNum(sum.unclaimed_ore_now, 0) : "···"} unit="ORE" hint="supply overhang, earning refining" />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <ChartCard variant="dispersion" cutCorner="tr" title="Emission vs burn"
            subtitle="ORE minted per day vs ORE destroyed by buyback burns: the net issuance picture.">
            <DualLine a={mkN((p) => p.minted_ore)} b={mkN((p) => p.burned_ore)} aName="minted / day" bName="burned / day"
              aColor="#22E0E6" bColor="#F87171" height={220}
              aFmt={(v) => formatNum(v, 0)} bFmt={(v) => formatNum(v, 0)} loading={eco.loading} />
          </ChartCard>
        </div>
        <ChartCard variant="dispersion" cutCorner="bl" title="Cumulative net issuance"
          subtitle="Running minted − burned over the window. Falling = deflationary stretch.">
          <AreaLine spectral fill points={mkP((p) => p.cum_net_ore)} height={200} zeroBaseline={false}
            fmt={(v) => formatNum(v, 0) + " ORE"} yFmt={compactNum} loading={eco.loading} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="tr" title="Buyback pressure"
          subtitle="SOL swapped into ORE per day (bars, 10% of losing tiles). ORE/SOL market price on the right — buybacks sell SOL for ORE.">
          <BarsLine
            bars={buybackBars}
            line={oreSolLine}
            barName="buyback SOL / day"
            lineName="market ORE/SOL"
            barColor="#5B6CFF"
            lineColor="#9DB7D8"
            height={200}
            barFmt={(v) => formatSol(v, 1) + " SOL"}
            lineFmt={(v) => formatNum(v, 3)}
            /* Compact axis ticks — "3192.5 SOL" was clipping the left gutter. */
            barAxisFmt={compactNum}
            lineAxisFmt={(v) => formatNum(v, 2)}
            loading={eco.loading || trends.loading} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="bl" title="Pooled-mining share"
          subtitle="% of deployed SOL flowing through managed cranks (a signer driving ≥3 miners that day).">
          <AreaLine fill points={mkP((p) => p.pool_share_pct)} height={200} zeroBaseline={false} color="#9A6BFF"
            fmt={(v) => formatNum(v, 1) + "%"} yFmt={(v) => formatNum(v, 0) + "%"} loading={eco.loading} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="tr" title="Whale concentration"
          subtitle="Top-10 miner authorities' share of deployed SOL per day.">
          <AreaLine fill points={mkP((p) => p.top10_share_pct)} height={200} zeroBaseline={false} color="#E8881A"
            fmt={(v) => formatNum(v, 1) + "%"} yFmt={(v) => formatNum(v, 0) + "%"} loading={eco.loading} />
        </ChartCard>
        <div className="lg:col-span-2">
          <ChartCard variant="dispersion" cutCorner="bl" title="Claims flow"
            subtitle="What miners cash out per day: SOL winnings vs ORE claims. Falling ORE claims = holders letting the pile refine.">
            <DualLine a={mkN((p) => p.claims_sol)} b={mkN((p) => p.claims_ore)} aName="SOL claimed" bName="ORE claimed"
              aColor={SOL_COLOR} bColor={ORE_COLOR} height={210}
              aFmt={(v) => formatNum(v, 0)} bFmt={(v) => formatNum(v, 0)} loading={eco.loading} />
          </ChartCard>
        </div>
      </div>
      <Caveats provenance={eco.provenance} error={eco.error} onRetry={eco.refresh} />
    </div>
  );
}
