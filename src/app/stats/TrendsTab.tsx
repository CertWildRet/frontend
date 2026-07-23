"use client";

import { useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { TileSkeleton, Refreshing } from "@/components/primitives/Skeleton";
import { AreaLine, ChartCard, compactNum, type Pt } from "@/components/stats/Charts";
import { DualLine, CostEvChart, BarsLine, PopBars, SOL_COLOR, ORE_COLOR, type TPt } from "@/components/stats/TrendCharts";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchOreSeries, fetchOreTrends, fetchOreYields, fetchOreDominance, fetchOreEcosystem,
  expectedPopOre, lamportsToSol,
  type OreSeriesPoint, type OreTrendPoint, type OreEcoPoint,
} from "@/lib/oreStats";
import { formatSol, formatNum } from "@/lib/format";
import { Caveats } from "./shared";

// ── Trends: the miner-actionable dashboard (quant layout spec, ORE_PC v2) ─────
// Four charts answering "should I deploy right now": prices, production cost vs
// market with the EV gap, activity, and the motherlode pool vs its expectation.
// Protocol-operator charts (rake / vaulted / winners) live in a collapsed
// section below — kept for an eventual protocol/LP view, out of the miner path.
const RANGES: { id: string; label: string }[] = [
  { id: "24h", label: "24H" }, { id: "7d", label: "7D" }, { id: "30d", label: "30D" }, { id: "90d", label: "90D" }, { id: "all", label: "All" },
];
/** Pearson correlation of per-bucket simple returns between two aligned price
 *  series. Returns (not levels) so trending prices don't fake a high number.
 *  Consecutive buckets where BOTH prices are bit-identical are forward-fill
 *  artifacts (the 24h range joins hourly prices onto 5-min buckets); counting
 *  those (0,0) pairs drags both means to ~0 and re-injects the drift term the
 *  returns transform exists to remove, so each constant run collapses to one
 *  observation. */
function returnsCorrelation(a: (number | null)[], b: (number | null)[]): number | null {
  const ra: number[] = [];
  const rb: number[] = [];
  for (let i = 1; i < a.length; i++) {
    const a0 = a[i - 1], a1 = a[i], b0 = b[i - 1], b1 = b[i];
    if (a0 == null || a1 == null || b0 == null || b1 == null || a0 <= 0 || b0 <= 0) continue;
    if (a1 === a0 && b1 === b0) continue;
    ra.push(a1 / a0 - 1);
    rb.push(b1 / b0 - 1);
  }
  const n = ra.length;
  if (n < 8) return null;
  const ma = ra.reduce((s, v) => s + v, 0) / n;
  const mb = rb.reduce((s, v) => s + v, 0) / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    const da = ra[i] - ma, db = rb[i] - mb;
    cov += da * db; va += da * da; vb += db * db;
  }
  if (va <= 0 || vb <= 0) return null;
  return cov / Math.sqrt(va * vb);
}

const avgOf = (xs: (number | null)[]): number | null => {
  const v = xs.filter((x): x is number => x != null && Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

/** Index a time-series by bucket timestamp for joining across /ore/* endpoints. */
function indexByTs<T extends { hour_ts?: number; day_ts?: number }>(
  rows: T[],
  key: "hour_ts" | "day_ts",
): Map<number, T> {
  return new Map(rows.map((r) => [r[key] as number, r]));
}

export function TrendsTab() {
  const [range, setRange] = useState("30d");
  const trends = usePolled(() => fetchOreTrends(range), 60_000, [range]);
  const yields = usePolled(() => fetchOreYields(), 120_000, []);
  const dominance = usePolled(() => fetchOreDominance(), 300_000, []);
  const tp = trends.data?.points ?? [];
  const ml = trends.data?.motherlode;
  // Motherlode odds are round-gated on-chain (1-in-625 -> 1-in-500 at round
  // 335,000), so the API hands us the CURRENT era's expectation + each pop's own.
  const mlExpected = ml?.expected_pop_ore ?? 125;
  const mlOdds = ml?.odds_per_round ?? 625;
  const corr = returnsCorrelation(tp.map((p) => p.ore_usd), tp.map((p) => p.sol_usd));
  const yPts = yields.data?.points ?? [];
  const refinByHour = indexByTs(yPts, "hour_ts");
  const domPts = (dominance.data?.points ?? []).filter((p) => p.dominance_pct != null);
  const domDominance: TPt[] = domPts.map((p) => ({ label: hLbl(p.hour_ts), value: p.dominance_pct }));
  const domRefining: TPt[] = domPts.map((p) => ({
    label: hLbl(p.hour_ts),
    value: refinByHour.get(p.hour_ts)?.refining_apr ?? null,
  }));
  const avgRefin = avgOf(yPts.map((p) => p.refining_apr));
  const avgStake = avgOf(yPts.map((p) => p.staking_apr));
  // Carry in the pill is AVG minus AVG — the two numbers beside it are window
  // averages, and mixing a latest-point carry with them reads as broken math
  // whenever the newest point spikes (per-point carry lives in the tooltip).
  const carryAvg = avgRefin != null && avgStake != null ? avgRefin - avgStake : null;
  const hLbl = (ts: number) => {
    const dt = new Date(ts * 1000);
    return `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:00`;
  };

  const dayLbl = (ts: number) => {
    const dt = new Date(ts * 1000);
    if (range === "24h") return `${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`;
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };
  const mkT = (pick: (p: OreTrendPoint) => number | null): TPt[] =>
    tp.map((p) => ({ label: dayLbl(p.day_ts), value: pick(p) }));

  // Motherlode: last 48 pops as bars + the LIVE pool as the final (highlighted) bar.
  const POPS_SHOWN = 48;
  const popBars: Pt[] = (ml?.pops ?? []).slice(-POPS_SHOWN).map((h) => ({ label: `#${formatNum(Number(h.round_id))}`, value: h.pop_ore }));
  if (ml?.current_pool_ore != null) popBars.push({ label: "now (accruing)", value: ml.current_pool_ore });
  // each pop is judged against the expectation of the era it settled in; the live
  // pool bar uses the current era's
  const popExpected: number[] = (ml?.pops ?? []).slice(-POPS_SHOWN).map((h) =>
    h.expected_pop_ore ?? expectedPopOre(Number(h.round_id)));
  if (ml?.current_pool_ore != null) popExpected.push(mlExpected);
  const nowLive = trends.data?.now ?? null;
  const evNow = nowLive?.ev_pct ?? [...tp].reverse().find((p) => p.ev_pct != null)?.ev_pct ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-y-2">
        <div className="section-label">
          Showing {trends.loading ? range : trends.data?.range ?? range} of data
          <Refreshing active={trends.fetching && !!trends.data} />
        </div>
        <SegmentedControl aria-label="Time range" items={RANGES} value={range} onChange={setRange} />
      </div>

      {/* hero band: the three numbers a miner acts on */}
      {trends.loading && !trends.data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <TileSkeleton /><TileSkeleton /><TileSkeleton /><TileSkeleton />
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Mining EV now"
          value={
            <span className={evNow != null && evNow >= 0 ? "text-pos" : "text-red"}>
              {evNow != null ? `${evNow >= 0 ? "+" : ""}${formatNum(evNow, 1)}%` : "···"}
            </span>
          }
          hint={nowLive ? `live · last ${nowLive.rounds_window} rounds × spot` : "vs buying ORE at market (today)"} />
        <StatTile label="Production cost" value={nowLive ? formatNum(nowLive.prod_cost_sol, 3) : tp.length && tp[tp.length - 1].prod_cost_sol != null ? formatNum(tp[tp.length - 1].prod_cost_sol!, 3) : "···"} unit="SOL/ORE" hint={nowLive ? "live · trailing ~35 min" : "measured on-chain, today"} />
        <StatTile label="Motherlode pool" value={ml?.current_pool_ore != null ? formatNum(ml.current_pool_ore, 1) : "···"} unit="ORE" tone="gold"
          hint={`expected pop ${formatNum(mlExpected, 0)} (1-in-${formatNum(mlOdds)}) · past avg ${ml?.avg_pop_ore != null ? formatNum(ml.avg_pop_ore, 0) : "·"}`} />
        <StatTile label="Miners today" value={nowLive?.miners_today != null ? formatNum(nowLive.miners_today) : "···"} hint="unique wallets that deployed (UTC day)" />
      </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* (2) the money chart — full width */}
        <div className="lg:col-span-2">
          <ChartCard variant="dispersion" cutCorner="tr" title="Production cost vs market (+EV)"
            subtitle="SOL cost to mine 1 ORE (measured: admin + vaulted, ÷ expected ORE incl. motherlode) vs buying at market. Green = mining is +EV.">
            <CostEvChart market={mkT((p) => p.market_ratio_sol)} cost={mkT((p) => p.prod_cost_sol)} ev={mkT((p) => p.ev_pct)} evNow={evNow} height={250} loading={trends.loading} />
          </ChartCard>
        </div>
        {/* (1) prices */}
        <ChartCard variant="dispersion" cutCorner="bl" title="ORE & SOL price" subtitle="Market prices (USD). A cheap ORE or a ratio discount is a call to action."
          right={corr != null ? (
            <span className="rounded-md border border-line px-2 py-1 font-mono text-[13px] font-bold text-[#B7BDD2]"
              title="Pearson correlation of ORE and SOL per-bucket returns over the visible range (+1 moves together, 0 independent, -1 opposite)">
              corr {corr >= 0 ? "+" : ""}{corr.toFixed(2)}
            </span>
          ) : undefined}>
          <DualLine a={mkT((p) => p.ore_usd)} b={mkT((p) => p.sol_usd)} aName="ORE $" bName="SOL $" height={205} fill
            aColor="#22E0E6" bColor="#9A6BFF" neutralAxes
            aFmt={(v) => "$" + formatNum(v, 1)} bFmt={(v) => "$" + formatNum(v, 0)} loading={trends.loading} />
        </ChartCard>
        {/* (3) activity — deploys vs the motherlode pool */}
        <ChartCard variant="dispersion" cutCorner="tr" title="Mining activity" subtitle="Avg SOL/round (bars) vs the motherlode pool (line). Deploys chase a fat pool.">
          <BarsLine bars={mkT((p) => p.avg_deployed_sol)} line={mkT((p) => p.ml_pool_ore)} barName="SOL / round" lineName="motherlode pool (ORE)" height={205} fill
            barColor="#22E0E6" lineColor={ORE_COLOR}
            barFmt={(v) => formatNum(v, 1)} lineFmt={(v) => formatNum(v, 0)} loading={trends.loading} />
        </ChartCard>
        {/* (5) yields — refining vs staking APR. Half-width, paired in a row with miner dominance. */}
        <div>
          <ChartCard variant="dispersion" cutCorner="tr" title="Yields · hold unclaimed vs claim & stake"
            subtitle="Refining APR on unclaimed ORE vs stORE staking APR. The shaded gap is the carry you keep by not claiming.">
            {(avgRefin != null || avgStake != null || carryAvg != null) && (
              // Averages moved out of the header (they were stealing its width on the
              // half-width card) into a compact full-width row above the chart.
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12.5px] font-bold"
                title="Averages over the plotted points; hover the chart for the per-hour carry.">
                {avgRefin != null && <span style={{ color: "#22E0E6" }}>refining avg {formatNum(avgRefin, 1)}%</span>}
                {avgStake != null && <span style={{ color: "#E8881A" }}>staking avg {formatNum(avgStake, 1)}%</span>}
                {carryAvg != null && <span className={carryAvg >= 0 ? "text-pos" : "text-red"}>carry avg {carryAvg >= 0 ? "+" : ""}{formatNum(carryAvg, 1)}%</span>}
              </div>
            )}
            <DualLine shared band={{ name: "unclaimed carry (refining minus staking)" }}
              a={yPts.map((p) => ({ label: hLbl(p.hour_ts), value: p.refining_apr }))}
              b={yPts.map((p) => ({ label: hLbl(p.hour_ts), value: p.staking_apr }))}
              aName="refining APR (unclaimed)" bName="stORE staking APR"
              aColor="#22E0E6" bColor="#E8881A" height={210} fill
              aFmt={(v) => formatNum(v, 1) + "%"} bFmt={(v) => formatNum(v, 1) + "%"}
              loading={yields.loading}
              emptyText="collecting on-chain snapshots. First points appear within ~2 hours; the full 7-day view completes by Jul 20." />
          </ChartCard>
        </div>
        {/* (6) miner dominance — unrefined treasury ORE vs total supply. Half-width, paired with yields. */}
        <div>
          <ChartCard variant="dispersion" cutCorner="bl" title="Miner dominance"
            subtitle="Unclaimed ORE as a share of supply (left) vs refining APR (right). They tend to move inversely — high dominance = miners sitting on unclaimed ORE earning refining."
            right={dominance.data?.latest?.dominance_pct != null ? (
              <span className="rounded-md border border-line px-2 py-1 font-mono text-[13px] font-bold text-[#22E0E6]"
                title={dominance.data.latest.unclaimed_ore != null && dominance.data.latest.supply_ore != null
                  ? `${formatNum(dominance.data.latest.unclaimed_ore, 0)} of ${formatNum(dominance.data.latest.supply_ore, 0)} ORE`
                  : undefined}>
                now {formatNum(dominance.data.latest.dominance_pct, 2)}%
              </span>
            ) : undefined}>
            <DualLine
              a={domDominance}
              b={domRefining}
              aName="miner dominance"
              bName="refining APR"
              aColor="#22E0E6"
              bColor="#E8881A"
              height={210}
              fill
              neutralAxes
              aFmt={(v) => formatNum(v, 2) + "%"}
              bFmt={(v) => formatNum(v, 1) + "%"}
              loading={dominance.loading || yields.loading} />
          </ChartCard>
        </div>
        {/* (4) motherlode — full width */}
        <div className="lg:col-span-2">
          <ChartCard variant="dispersion" cutCorner="bl" title="Motherlode pop value"
            subtitle={`Every pop vs the long-run average it ran under (dashed, now ${formatNum(mlExpected, 0)} ORE at 1-in-${formatNum(mlOdds)}). Green slice = the part above the line, red bars fell short. Last bar is the live pool, still filling 0.2/round. The odds tightened from 1-in-625 to 1-in-500 at round 335,000, so the line steps down from 125 to 100 there.${ml?.avg_pop_ore != null ? ` Average pop across all eras: ${formatNum(ml.avg_pop_ore, 1)} ORE over ${formatNum(ml.pops.length)} pops.` : ""}`}
            right={ml?.current_pool_ore != null ? (
              <span className="rounded-md border border-line px-2 py-1 font-mono text-[13px] font-bold"
                style={{ color: ml.current_pool_ore - mlExpected >= 0 ? "#4ADE80" : "#F87171" }}
                title={`Pop premium = the live motherlode pool minus the ${formatNum(mlExpected, 0)} ORE long-run average pop (0.2/round x 1-in-${formatNum(mlOdds)}). Positive = the pool is already fatter than an average pop pays.`}>
                pop premium {ml.current_pool_ore - mlExpected >= 0 ? "+" : ""}{formatNum(ml.current_pool_ore - mlExpected, 1)} ORE
              </span>
            ) : undefined}>
            <div className="mb-1.5 flex flex-wrap gap-4 font-mono text-[12.5px] font-semibold text-[#bcc3da]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#4ADE80] opacity-80" /> pop above its era average (surplus slice)</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#F87171] opacity-70" /> pop below its era average</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#22E0E6]" /> live pool (not popped yet)</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t border-dashed border-fog-muted" /> long-run average pop (0.2/round × odds); steps 125 → 100 at round 335,000</span>
            </div>
            <PopBars bars={popBars} height={205} expected={popExpected} fmt={(v) => formatNum(v, 1) + " ORE"}
              axisFmt={(v) => formatNum(v, 0) + " ORE"}
              liveLast={ml?.current_pool_ore != null} loading={trends.loading} />
          </ChartCard>
        </div>
      </div>

      <ProtocolCharts />

      <EcosystemSection />

      <Caveats provenance={trends.provenance} error={trends.error} onRetry={trends.refresh} />
    </div>
  );
}

/** Protocol-operator charts — a self-governed section with its own time control
 *  (the top-level picker includes 24h, which /ore/series doesn't serve; mixed
 *  scopes read as broken, so each section owns its range). */
const PROTOCOL_RANGES: { id: string; label: string }[] = [
  { id: "7d", label: "7D" }, { id: "30d", label: "30D" }, { id: "90d", label: "90D" }, { id: "1y", label: "1Y" }, { id: "all", label: "All" },
];
function ProtocolCharts() {
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
    <div className="space-y-5 border-t border-line pt-6">
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
    </div>
  );
}


// ── Ecosystem: investor metrics — supply, buybacks, pools, whales, claims ─────
const ECO_RANGES: { id: string; label: string }[] = [
  { id: "30d", label: "30D" }, { id: "90d", label: "90D" }, { id: "all", label: "All" },
];
function EcosystemSection() {
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
    <div className="space-y-5 border-t border-line pt-6">
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
      <Caveats provenance={null} error={eco.error} onRetry={eco.refresh} />
    </div>
  );
}
