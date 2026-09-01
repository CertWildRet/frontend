"use client";

/**
 * Ecosystem — investor metrics: supply, buybacks, pools, whales, claims.
 * Joins /ore/trends market_ratio_sol onto daily ecosystem points for the
 * Buyback pressure dual-axis chart. Provider SOL share reuses the competition
 * payload (same as Round Analysis) — no extra analytics endpoint.
 */
import { useMemo, useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { TileSkeleton, RowsSkeleton, Refreshing } from "@/components/primitives/Skeleton";
import { AreaLine, ChartCard, HBars, compactNum, type Pt } from "@/components/stats/Charts";
import { DualLine, BarsLine, type TPt } from "@/components/stats/TrendCharts";
import { usePolled } from "@/hooks/useOreStats";
import { sumSolByProvider } from "@/lib/oreProviders";
import {
  fetchOreCompetition,
  fetchOreEcosystem,
  fetchOreTrends,
  lamportsToSol,
  type OreEcoPoint,
} from "@/lib/oreStats";
import { completeUtcDays, type CompleteUtcDayRange } from "@/lib/completeUtcDays";
import { CHART } from "@/lib/chartColors";
import { formatSol, formatNum } from "@/lib/format";
import { FetchError } from "./shared";

const ECO_RANGES: { id: CompleteUtcDayRange; label: string }[] = [
  { id: "30d", label: "30D" }, { id: "90d", label: "90D" }, { id: "all", label: "All" },
];

/** Competition window for provider SOL share (matches Round Analysis default). */
const PROVIDER_SOL_ROUNDS = 10;

function indexByTs<T extends { day_ts?: number }>(rows: T[], key: "day_ts"): Map<number, T> {
  return new Map(rows.map((r) => [r[key] as number, r]));
}

export function EcosystemTab() {
  const [range, setRange] = useState<CompleteUtcDayRange>("90d");
  const eco = usePolled(() => fetchOreEcosystem(range), 60_000, [range]);
  const trends = usePolled(() => fetchOreTrends(range), 60_000, [range]);
  const competition = usePolled(() => fetchOreCompetition(PROVIDER_SOL_ROUNDS), 60_000, []);
  const pts = useMemo(
    () => completeUtcDays(eco.data?.points ?? [], range),
    [eco.data?.points, range],
  );
  const kept = useMemo(() => new Set(pts.map((p) => p.day_ts)), [pts]);
  const sum = eco.data?.summary;
  const marketByDay = useMemo(
    () => indexByTs((trends.data?.points ?? []).filter((p) => kept.has(p.day_ts)), "day_ts"),
    [trends.data?.points, kept],
  );
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

  /** Prefer latest-round deployed SOL (lamports); fall back to regulars' avg_sol. */
  const providerSolShare = useMemo(() => {
    const d = competition.data;
    if (!d) return { bars: [] as { label: string; value: number; color?: string }[], source: null as null | "latest" | "regulars", roundId: null as number | null };

    const latestPlayers = d.latest?.players ?? [];
    if (latestPlayers.length > 0) {
      const bars = sumSolByProvider(
        latestPlayers.map((p) => ({
          authority: p.authority,
          sol: lamportsToSol(p.total_sol),
          service: p.service,
          viaPool: p.via_pool,
        })),
      ).map((b) => ({ label: b.label, value: b.sol, color: b.color }));
      return { bars, source: "latest" as const, roundId: d.latest?.round_id ?? null };
    }

    if (d.regulars.length > 0) {
      const bars = sumSolByProvider(
        d.regulars.map((r) => ({
          authority: r.authority,
          sol: r.avg_sol,
          service: r.service,
          viaPool: r.via_pool,
        })),
      ).map((b) => ({ label: b.label, value: b.sol, color: b.color }));
      return { bars, source: "regulars" as const, roundId: null };
    }

    return { bars: [], source: null, roundId: null };
  }, [competition.data]);

  const taggedProviderSol = providerSolShare.bars.filter((b) => b.label !== "Independent").length;

  const providerSolTitleInfo =
    providerSolShare.source === "regulars"
      ? `Fallback: average deploy (SOL) among competition regulars over the last ${PROVIDER_SOL_ROUNDS} rounds — latest-round player totals were unavailable. Unique wallets; overlaps count only in Many.`
      : providerSolShare.roundId != null
        ? `Latest competition round #${providerSolShare.roundId} deployed SOL (unique wallets). A miner matched to two or more autominer platforms contributes only to Many — never double-counted. Independent is the unlabeled remainder.`
        : "Latest competition round's deployed SOL (unique wallets). A miner matched to two or more autominer platforms contributes only to Many — never double-counted. Independent is the unlabeled remainder.";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-y-2">
        <div className="section-label">
          Ecosystem · supply, buybacks &amp; market structure · through yesterday (UTC)
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
            titleInfo="ORE minted per day vs ORE destroyed by buyback burns: the net issuance picture.">
            <DualLine a={mkN((p) => p.minted_ore)} b={mkN((p) => p.burned_ore)} aName="Minted / Day" bName="Burned / Day"
              aColor="#22E0E6" bColor="#F87171" height={220}
              aFmt={(v) => formatNum(v, 0)} bFmt={(v) => formatNum(v, 0)} loading={eco.loading} />
          </ChartCard>
        </div>
        <ChartCard variant="dispersion" cutCorner="bl" title="Cumulative net issuance"
          titleInfo="Running minted − burned over the window. Falling = deflationary stretch.">
          <AreaLine fill color={CHART.teal} points={mkP((p) => p.cum_net_ore)} height={200} zeroBaseline={false}
            fmt={(v) => formatNum(v, 0) + " ORE"} yFmt={compactNum} loading={eco.loading} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="tr" title="Buyback pressure"
          titleInfo="SOL swapped into ORE per day (bars; protocol vault is 10% of remainder after 1% admin on losing tiles). ORE/SOL market price on the right — buybacks sell SOL for ORE.">
          <BarsLine
            bars={buybackBars}
            line={oreSolLine}
            barName="Buyback SOL / Day"
            lineName="Market ORE/SOL"
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
          titleInfo="% of deployed SOL flowing through managed cranks (a signer driving ≥3 miners that day).">
          <AreaLine fill points={mkP((p) => p.pool_share_pct)} height={200} zeroBaseline={false} color="#9A6BFF"
            fmt={(v) => formatNum(v, 1) + "%"} yFmt={(v) => formatNum(v, 0) + "%"} loading={eco.loading} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="tr" title="Whale concentration"
          titleInfo="Top-10 miner authorities' share of deployed SOL per day.">
          <AreaLine fill points={mkP((p) => p.top10_share_pct)} height={200} zeroBaseline={false} color="#E8881A"
            fmt={(v) => formatNum(v, 1) + "%"} yFmt={(v) => formatNum(v, 0) + "%"} loading={eco.loading} />
        </ChartCard>
        <div className="lg:col-span-2">
          <ChartCard
            variant="dispersion"
            cutCorner="bl"
            title="Deployed SOL by Provider"
            titleInfo={providerSolTitleInfo}
          >
            {providerSolShare.bars.length > 0 && taggedProviderSol > 0 ? (
              <div className="max-w-3xl">
                <HBars rows={providerSolShare.bars} fmt={(v) => formatSol(v, 2)} />
              </div>
            ) : competition.loading && !competition.data ? (
              <RowsSkeleton rows={5} />
            ) : (
              <p className="font-mono text-xs text-fog-muted">No tagged provider SOL in the latest competition round yet.</p>
            )}
          </ChartCard>
        </div>
      </div>
      <FetchError error={eco.error} onRetry={eco.refresh} />
      <FetchError error={competition.error} onRetry={competition.refresh} />
    </div>
  );
}
