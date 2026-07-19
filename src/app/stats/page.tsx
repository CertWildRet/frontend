"use client";

/**
 * /stats — the ORE-ecosystem Stats page.
 *
 * ORE-first: the whole ORE game (emission, rake, motherlode, competition,
 * miner ranking, production cost). Financial-analyst tabs. ZINC is a placeholder
 * for v1. Native units; USD is a labelled off-chain overlay.
 */
import { Fragment, createContext, useContext, useEffect, useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { TabBar, SegmentedControl } from "@/components/primitives/TabBar";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { TileSkeleton, RowsSkeleton, Refreshing } from "@/components/primitives/Skeleton";
import { AreaLine, HBars, ChartCard, ChartWatermarkContext, compactNum, type Pt } from "@/components/stats/Charts";
import { DualLine, CostEvChart, BarsLine, PopBars, MotherlodeReachChart, type TPt } from "@/components/stats/TrendCharts";
import { MinerDetail } from "@/components/stats/MinerDetail";
import { usePolled, PolledActiveContext } from "@/hooks/useOreStats";
import {
  fetchOreRounds, fetchOreRound, fetchOreMotherlode, fetchOreMotherlodePop, fetchOreLeaderboard,
  fetchOreMiners, fetchOreSeries, fetchOreCompetition, fetchOreTrends,
  fetchOreEcosystem, fetchOreMiner, fetchOreYields, fetchOreDominance,
  motherlodeOdds, expectedPopOre,
  type OreMotherlodeHit,
  lamportsToSol, oreGramsToOre, roundTileDeployRange, roundMaxSpreadFrac,
  type TileDeployRange,
  type OreSeriesPoint,
  type OreTrendPoint,
  type OreEcoPoint,
  type OreMinerDetail,
  type OreEnvelope,
  type OreBands,
} from "@/lib/oreStats";
import { formatSol, formatNum, formatPct } from "@/lib/format";
import styles from "./stats.module.css";

type Tab = "trends" | "round_analysis" | "miners" | "motherlode" | "rounds";

// Cross-tab jump: any row (e.g. a motherlode sharer) can send a pubkey to the
// Search Miners tab and pre-fill its search bar. `n` bumps each call so re-clicking
// the same wallet still re-triggers the seed effect.
type MinerSeed = { pubkey: string; n: number };
const MinerNavContext = createContext<(pubkey: string) => void>(() => {});

const TABS: { id: Tab; label: string }[] = [
  { id: "trends", label: "Trends" },
  { id: "round_analysis", label: "Round Analysis" },
  { id: "miners", label: "Search Miners" },
  { id: "motherlode", label: "Motherlode" },
  { id: "rounds", label: "Rounds" },
];

const short = (a?: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "·");

// Table styling mirrors the Position page's WalletAnalytics tables 1:1.
const tableWrap = styles.tableWrap;
const theadRow = `${styles.tableHead} text-left`;
const th = "px-2 py-2 font-bold sm:px-3";
const td = "px-2 py-2 sm:px-3";
const bodyRow = styles.tableRow;
const oursRow = `${styles.tableRow} ${styles.oursRow}`;

const solOf = (grams?: string | null) => oreGramsToOre(grams); // ORE grams -> ORE
const netTone = (v: number) => (v > 0 ? "text-pos" : v < 0 ? "text-red" : "text-gray-300");

const PAGE = 50; // shared page size for every paginated table

// One pagination control for every table (rows N–M of TOTAL + Prev/Next).
function Pager({ offset, total, onPage, unit = "rows", loading = false }: { offset: number; total: number; onPage: (o: number) => void; unit?: string; loading?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.floor(offset / PAGE) + 1;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[13px] text-fog-muted">
      <span>{loading ? "loading…" : `${formatNum(from)}–${formatNum(to)} of ${formatNum(total)} ${unit} · page ${formatNum(page)} / ${formatNum(pages)}`}</span>
      <div className="flex gap-2">
        <button disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - PAGE))}
          className="rounded border border-line px-3 py-1.5 disabled:opacity-40 enabled:hover:border-steel enabled:hover:text-white">Prev</button>
        <button disabled={page >= pages} onClick={() => onPage(offset + PAGE)}
          className="rounded border border-line px-3 py-1.5 disabled:opacity-40 enabled:hover:border-steel enabled:hover:text-white">Next</button>
      </div>
    </div>
  );
}

/** Shimmer placeholder rows for a table's first load (never on background polls). */
function SkeletonRows({ cols, rows = 8 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`sk-${i}`}>
          <td colSpan={cols} className="px-2 py-2 sm:px-3">
            <div className="h-4 animate-pulse rounded bg-white/[0.05]" style={{ opacity: 1 - i * 0.09 }} />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>("trends");
  // Visited tabs stay MOUNTED (hidden) so their fetched data + pagination
  // survive tab switches — switching back is instant instead of a blank refetch.
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set(["trends" as Tab]));
  const openTab = (t: Tab) => { setVisited((v) => (v.has(t) ? v : new Set(v).add(t))); setTab(t); };
  // Jump-to-miner: open the Search Miners tab with the wallet pre-filled.
  const [minerSeed, setMinerSeed] = useState<MinerSeed | null>(null);
  const goToMiner = (pubkey: string) => { setMinerSeed((s) => ({ pubkey, n: (s?.n ?? 0) + 1 })); openTab("miners"); };

  return (
    <ChartWatermarkContext.Provider value={true}>
    <MinerNavContext.Provider value={goToMiner}>
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={styles.liveDot} aria-hidden />
          ORE intelligence layer
        </div>
        <h1 className={styles.title}>
          Dig into the Data,
          <br />
          <span className={styles.titleAccent}>Find the Alpha</span>
        </h1>
        <p className={styles.subtitle}>
          Follow deployment, production cost, miner behavior, and every
          motherlode hit across the ORE mining economy.
        </p>
        <div className={styles.signals} aria-label="Data coverage">
          <span className={styles.signal}>On-chain data</span>
          <span className={styles.signal}>Live polling</span>
          <span className={styles.signal}>Full v3 coverage</span>
        </div>
        <div className={styles.lens} aria-hidden>
          <span className={styles.lensRing} />
          <div className={styles.board}>
            {Array.from({ length: 25 }).map((_, i) => (
              <span
                key={i}
                className={styles.tile}
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      </header>

      <div className={styles.tabDock}>
        <TabBar aria-label="Ore Data sections" items={TABS} value={tab} onChange={openTab} />
      </div>
      <div className={styles.content}>
        {/* visited tabs stay mounted (instant switching, state kept) but their
            pollers PAUSE while hidden — see PolledActiveContext */}
        {TABS.map((t) =>
          visited.has(t.id) ? (
            <PolledActiveContext.Provider key={t.id} value={tab === t.id}>
              <div hidden={tab !== t.id}>
                {t.id === "trends" ? <TrendsTab /> :
                 t.id === "round_analysis" ? <RoundAnalysisTab /> :
                 t.id === "miners" ? <MinersTab seed={minerSeed} /> :
                 t.id === "motherlode" ? <MotherlodeTab /> : <RoundsTab />}
              </div>
            </PolledActiveContext.Provider>
          ) : null,
        )}
      </div>
    </div>
    </MinerNavContext.Provider>
    </ChartWatermarkContext.Provider>
  );
}

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

function TrendsTab() {
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
          <DualLine a={mkT((p) => p.ore_usd)} b={mkT((p) => p.sol_usd)} aName="ORE $" bName="SOL $" height={205}
            aFmt={(v) => "$" + formatNum(v, 1)} bFmt={(v) => "$" + formatNum(v, 0)} loading={trends.loading} />
        </ChartCard>
        {/* (3) activity — deploys vs the motherlode pool */}
        <ChartCard variant="dispersion" cutCorner="tr" title="Mining activity" subtitle="Avg SOL deployed per round (bars) vs the motherlode pool (line). The pool fills 0.2 ORE per round and pays out when it pops. Watch deploys chase a fat pool.">
          <BarsLine bars={mkT((p) => p.avg_deployed_sol)} line={mkT((p) => p.ml_pool_ore)} barName="SOL / round" lineName="motherlode pool (ORE)" height={205}
            barFmt={(v) => formatNum(v, 1)} lineFmt={(v) => formatNum(v, 0)} loading={trends.loading} />
        </ChartCard>
        {/* (5) yields — refining vs staking APR (quant spec: APR %, 7d rolling) */}
        <div className="lg:col-span-2">
          <ChartCard variant="dispersion" cutCorner="tr" title="Yields · hold unclaimed vs claim & stake"
            subtitle={`Refining APR (what your unclaimed ORE earns from others' claim fees) vs stORE staking APR. The shaded gap between them is the unclaimed carry: the extra APR you keep by NOT claiming. Annualized, rolling window up to 7d${yields.data?.latest?.window_days != null && yields.data.latest.window_days < 6.5 ? ` (currently ${formatNum(yields.data.latest.window_days, 1)}d, precise history began Jul 13)` : ""}.`}
            right={(avgRefin != null || avgStake != null || carryAvg != null) ? (
              <span className="flex max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md border border-line px-2 py-1 font-mono text-[13px] font-bold"
                title="All three are averages over the plotted points; hover the chart for the per-hour carry">
                {avgRefin != null && <span style={{ color: "#22E0E6" }}>refining avg {formatNum(avgRefin, 1)}%</span>}
                {avgStake != null && <span style={{ color: "#E8881A" }}>staking avg {formatNum(avgStake, 1)}%</span>}
                {carryAvg != null && <span className={carryAvg >= 0 ? "text-pos" : "text-red"}>carry avg {carryAvg >= 0 ? "+" : ""}{formatNum(carryAvg, 1)}%</span>}
              </span>
            ) : undefined}>
            <DualLine shared band={{ name: "unclaimed carry (refining minus staking)" }}
              a={yPts.map((p) => ({ label: hLbl(p.hour_ts), value: p.refining_apr }))}
              b={yPts.map((p) => ({ label: hLbl(p.hour_ts), value: p.staking_apr }))}
              aName="refining APR (unclaimed)" bName="stORE staking APR"
              aColor="#22E0E6" bColor="#E8881A" height={210}
              aFmt={(v) => formatNum(v, 1) + "%"} bFmt={(v) => formatNum(v, 1) + "%"}
              loading={yields.loading}
              emptyText="collecting on-chain snapshots. First points appear within ~2 hours; the full 7-day view completes by Jul 20." />
          </ChartCard>
        </div>
        {/* (6) miner dominance — unrefined treasury ORE vs total supply */}
        <div className="lg:col-span-2">
          <ChartCard variant="dispersion" cutCorner="bl" title="Miner dominance"
            subtitle="Unrefined (unclaimed) ORE held by the mine treasury as a share of total supply. Rising = miners sitting on winnings; falling = claims outpacing emission. Snapshot history began Jul 13 and deepens daily."
            right={dominance.data?.latest?.dominance_pct != null ? (
              <span className="rounded-md border border-line px-2 py-1 font-mono text-[13px] font-bold text-[#22E0E6]"
                title={dominance.data.latest.unclaimed_ore != null && dominance.data.latest.supply_ore != null
                  ? `${formatNum(dominance.data.latest.unclaimed_ore, 0)} of ${formatNum(dominance.data.latest.supply_ore, 0)} ORE`
                  : undefined}>
                now {formatNum(dominance.data.latest.dominance_pct, 2)}%
              </span>
            ) : undefined}>
            <AreaLine
              points={(dominance.data?.points ?? []).filter((p) => p.dominance_pct != null).map((p) => ({ label: hLbl(p.hour_ts), value: p.dominance_pct as number }))}
              height={200} zeroBaseline={false} color="#22E0E6"
              fmt={(v) => formatNum(v, 2) + "%"} yFmt={(v) => formatNum(v, 2) + "%"}
              loading={dominance.loading} />
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
        <AreaLine spectral points={mk((p) => lamportsToSol(p.deployed))} height={195} fmt={(v) => formatSol(v, 0) + " SOL"} yFmt={compactNum} />
      </ChartCard>
      <ChartCard variant="dispersion" cutCorner="bl" title="Effective rake" subtitle={`What the protocol keeps of the SOL played, per ${seriesPer} (1% admin + ~9.9% buyback). Zoomed way in; it barely moves.`}>
        <AreaLine spectral points={mk((p) => (p.avg_rake_bps ?? 0) / 100)} height={195} zeroBaseline={false} fmt={(v) => v.toFixed(4) + "%"} yFmt={(v) => v.toFixed(2) + "%"} />
      </ChartCard>
      <ChartCard variant="dispersion" cutCorner="tr" title="SOL vaulted (protocol take)" subtitle={`Total SOL the protocol kept (buyback + admin fee), per ${seriesPer}.`}>
        <AreaLine spectral points={mk((p) => lamportsToSol(p.vaulted))} height={195} fmt={(v) => formatSol(v, 1) + " SOL"} yFmt={compactNum} />
      </ChartCard>
      <ChartCard variant="dispersion" cutCorner="bl" title="Winners / round" subtitle="Avg miners rewarded per round (reset-event count).">
        <AreaLine
          spectral
          points={pts.filter((p) => p.avg_winners != null).map((p) => ({ label: lbl(p), value: Number(p.avg_winners) }))}
          height={195} zeroBaseline={false} fmt={(v) => formatNum(v, 0)} />
      </ChartCard>
      </div>
    </div>
  );
}

// ── Motherlode ────────────────────────────────────────────────────────────────
// $ compact, e.g. $82k / $1,240 / $0. USD legs are null before price history.
// $ compact. Sub-$1 non-zero shows "<$1" so dust reads as tiny-but-real, not "$0".
const fmtUsd = (n?: number | null) =>
  n == null ? "·" : n === 0 ? "$0" : n < 1 ? "<$1" : n >= 1000 ? `$${compactNum(n)}` : `$${formatNum(n, 0)}`;
// A non-zero value below the display precision shows "<0.01" (etc.) instead of a
// misleading "0.00" — so a dust sharer's row reads honestly (tiny stake, tiny
// take, big ROI ratio) rather than looking broken (all zeros, yet 97x).
const fmtDust = (v: number, decimals: number): string => {
  if (v === 0) return "0";
  const floor = Math.pow(10, -decimals);
  return v > 0 && v < floor ? `<${floor.toFixed(decimals)}` : formatNum(v, decimals);
};
const fmtPctDust = (frac: number): string => {
  if (frac === 0) return "0%";
  const pct = frac * 100;
  return pct > 0 && pct < 0.01 ? "<0.01%" : formatPct(frac);
};
const fmtWhen = (ts?: number | null) =>
  ts == null ? "·" : new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
// derive the USD + profitability view of one pop hit
function popEcon(h: OreMotherlodeHit) {
  const mlOre = solOf(h.motherlode_paid);
  const depSol = h.total_deployed ? lamportsToSol(h.total_deployed) : null;
  const mlUsd = h.ore_usd != null ? mlOre * h.ore_usd : null;
  const depUsd = depSol != null && h.sol_usd != null ? depSol * h.sol_usd : null;
  const underwater = mlUsd != null && depUsd != null ? mlUsd < depUsd : false;
  return { mlOre, mlUsd, depSol, depUsd, underwater };
}

// Per-pop drill-down: who ACTUALLY shared the pool (pro-rata to winning-tile
// stakes) + each sharer's ROI. Lazy: only fetches when a row is expanded. This is
// the detail hawg.win can't show — winning the solo ORE says nothing about how
// much of the motherlode you took.
const POP_PAGE = 20; // sharers revealed per "Load More" (and the initial view)
function PopDrilldown({ roundId }: { roundId: number }) {
  const [sort, setSort] = useState<"stake" | "roi">("stake");
  const [shown, setShown] = useState(POP_PAGE);
  const goToMiner = useContext(MinerNavContext);
  // Fetch the FULL sharer list (bounded ~few hundred/pop) and reveal it client-
  // side, so Load More is instant and nobody is capped at a top-N.
  const dd = usePolled(() => fetchOreMotherlodePop(roundId, sort, 2000), 300_000, [roundId, sort]);
  useEffect(() => { setShown(POP_PAGE); }, [roundId, sort]); // reset the reveal when re-sorted
  const d = dd.data;
  if (dd.loading && !d) return <div className="px-3 py-4 text-[12px] text-gray-400">Loading the split…</div>;
  if (d && !d.has_distribution)
    return (
      <div className="px-3 py-4 text-[12px] text-gray-400">
        Per-miner split isn&apos;t recoverable for this pop — {d.reason ?? "no deploy history"}.
      </div>
    );
  const oreUsd = d?.round.ore_usd ?? null;
  return (
    <div className="space-y-3 px-1 py-3 sm:px-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12px] text-gray-300">
          <span className="text-white">{formatNum(d?.sharers_total ?? 0)}</span> miners shared this pop
          {d?.avg_roi != null && <> · avg <span className="text-pos">{formatNum(d.avg_roi, 1)}×</span> ROI</>}
          {d?.solo_winner_share != null && (
            <> · solo-ORE winner took <span className="text-white">{formatPct(d.solo_winner_share)}</span>
              {d?.solo_winner_roi != null && <> (<span className={netTone(d.solo_winner_roi - 1)}>{formatNum(d.solo_winner_roi, 1)}×</span>)</>}
            </>
          )}
        </div>
        <SegmentedControl
          aria-label="sort sharers"
          items={[{ id: "stake", label: "By ML share" }, { id: "roi", label: "By ROI" }]}
          value={sort}
          onChange={setSort}
        />
      </div>
      <div className={tableWrap}>
        <table className="w-full font-mono text-[12px]">
          <thead>
            <tr className={theadRow}>
              <th className={th}>Miner</th>
              <th className={`${th} hidden text-right sm:table-cell`}>Tiles</th>
              <th className={`${th} hidden text-right sm:table-cell`}>Cost (SOL)</th>
              <th className={`${th} text-right`}>ML share</th>
              <th className={`${th} text-right`}>ML got</th>
              <th className={`${th} text-right`}>ROI</th>
            </tr>
          </thead>
          <tbody>
            {(d?.sharers ?? []).slice(0, shown).map((s) => (
              <tr key={s.pubkey} className={s.is_solo_winner ? oursRow : bodyRow}>
                <td className={`${td} text-white`}>
                  <span className="inline-flex items-center gap-1.5">
                    <CopyAddress address={s.pubkey} />
                    <button
                      type="button"
                      onClick={() => goToMiner(s.pubkey)}
                      title="Search this miner"
                      aria-label={`Search miner ${s.pubkey}`}
                      className="text-gray-500 transition-colors hover:text-[#22E0E6]"
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path d="M4.25 7.75 L7.75 4.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        <path d="M5.25 4.25 H7.75 V6.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {s.is_solo_winner && <span title="also won the round's separate ~1-ORE base prize (one winner per round)" className="rounded bg-gold/15 px-1 text-[10px] text-gold">solo ORE</span>}
                  </span>
                </td>
                <td className={`${td} num hidden text-right text-gray-300 sm:table-cell`}>{s.tiles_covered}</td>
                <td className={`${td} num hidden text-right text-gray-300 sm:table-cell`}>{fmtDust(s.cost_sol, 2)}</td>
                <td className={`${td} num text-right text-gray-300`}>{fmtPctDust(s.share)}</td>
                <td className={`${td} num text-right text-gold`}>
                  {fmtDust(s.ml_ore, 1)}
                  {oreUsd != null && <span className="text-gray-500"> · {fmtUsd(s.ml_ore * oreUsd)}</span>}
                </td>
                <td className={`${td} num text-right ${s.roi == null ? "text-gray-500" : netTone(s.roi - 1)}`}>
                  {s.roi == null ? "·" : `${formatNum(s.roi, 1)}×`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(d?.sharers?.length ?? 0) > shown && (
        <div className="flex justify-center">
          <button
            onClick={() => setShown((n) => n + POP_PAGE)}
            className="rounded-lg border border-line px-4 py-1.5 font-mono text-[12px] text-gray-300 transition-colors hover:border-steel hover:text-white"
          >
            Load {Math.min(POP_PAGE, (d?.sharers?.length ?? 0) - shown)} more · {formatNum(shown)} of {formatNum(d?.sharers?.length ?? 0)}
          </button>
        </div>
      )}
      <p className="px-1 text-[11px] leading-relaxed text-gray-500">
        <span className="text-gray-400">ML got</span> is each miner&apos;s share of the motherlode pool, which pops
        pro-rata to <em>everyone</em> staked on the winning tile — so every miner here got a slice. The
        <span className="mx-1 rounded bg-gold/15 px-1 text-gold">solo ORE</span> badge is a <em>separate</em> reward:
        the round&apos;s ~1-ORE base prize, won by a single miner (here, they also happened to top the pool). ROI is the
        round&apos;s gross return (winning SOL pot + ML) over total SOL deployed that round, at round-time prices. Sorted by {sort === "roi" ? "ROI" : "ML share"}.
      </p>
    </div>
  );
}

function MotherlodeTab() {
  const [offset, setOffset] = useState(0);
  const [openRound, setOpenRound] = useState<number | null>(null);
  const ml = usePolled(() => fetchOreMotherlode(PAGE, offset), 20_000, [offset]);
  const mlChart = usePolled(() => fetchOreMotherlode(50, 0), 20_000, []);
  const d = ml.data;
  const total = d?.total ?? 0;
  const pool = oreGramsToOre(d?.current?.pool_grams);
  const sinceHit = d?.current ? d.current.current_round - (d.current.last_hit_round ?? d.current.current_round) : 0;
  // odds are round-gated on-chain: 1-in-625 below round 335,000, 1-in-500 from there
  const mtlOdds = motherlodeOdds(d?.current?.current_round ?? 0);
  const biggestOre = solOf(d?.biggest_paid);
  const avgOre = solOf(d?.avg_paid);
  const mlChartPts: Pt[] = [...(mlChart.data?.recent_hits ?? [])]
    .reverse()
    .map((h) => ({ label: `#${formatNum(Number(h.round_id))}`, value: solOf(h.motherlode_paid) }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Current pool" value={pool ? formatNum(pool, 1) : "···"} unit="ORE" tone="gold" hint={`+0.2 ORE/round · ${formatNum(sinceHit)} since last hit · 1:${formatNum(mtlOdds)} odds`} />
        <StatTile label="Biggest pop" value={biggestOre ? formatNum(biggestOre, 0) : "···"} unit="ORE" tone="gold" hint="all-time record payout" />
        <StatTile label="Average pop" value={avgOre ? formatNum(avgOre, 0) : "···"} unit="ORE" hint={`over ${formatNum(total)} hits`} />
        <StatTile label="Underwater pops" value={d ? `${formatNum(d.underwater)} / ${formatNum(d.priced)}` : "···"} hint="pool paid less than the SOL burned to win that round" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard variant="dispersion" cutCorner="tr" title="Motherlode payouts" subtitle="Last 50 hits: ORE paid per round.">
          <AreaLine
            spectral
            points={mlChartPts}
            height={240}
            zeroBaseline={false}
            fmt={(v) => formatNum(v, 1) + " ORE"}
            yFmt={(v) => formatNum(v, 0)}
            yLabel="ORE paid by round"
          />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="bl" title="Odds of reaching a size"
          subtitle="Chance the pool ever REACHES a given size.">
          <MotherlodeReachChart currentPoolOre={pool ?? undefined} height={240} />
        </ChartCard>
      </div>
      <ChartCard title="Every motherlode drop" subtitle="Tap a row to see who actually shared the pool and their ROI. Each hit pays the whole pool out; it rebuilds at +0.2 ORE/round.">
        <div className={tableWrap}>
          <table className="w-full font-mono text-[13px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Round</th>
                <th className={`${th} hidden sm:table-cell`}>When</th>
                <th className={`${th} text-right`}>ORE paid</th>
                <th className={`${th} text-right`}>Value</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Deployed</th>
                <th className={`${th}`}>Result</th>
              </tr>
            </thead>
            <tbody>
              {ml.loading && !ml.data && <SkeletonRows cols={6} />}
              {(d?.recent_hits ?? []).map((h) => {
                const e = popEcon(h);
                const rid = Number(h.round_id);
                const open = openRound === rid;
                const isSplit = h.is_split === 1 || (h.top_miner ?? "").startsWith("SpLiT");
                return (
                  <Fragment key={rid}>
                    <tr className={`${bodyRow} cursor-pointer`} onClick={() => setOpenRound(open ? null : rid)}>
                      <td className={`${td} text-white`}>
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-500">{open ? "▾" : "▸"}</span>#{formatNum(rid)}
                        </span>
                      </td>
                      <td className={`${td} hidden text-gray-400 sm:table-cell`}>{fmtWhen(h.ts)}</td>
                      <td className={`${td} num text-right text-gold`}>{formatNum(e.mlOre, 1)}</td>
                      <td className={`${td} num text-right text-gray-300`}>{fmtUsd(e.mlUsd)}</td>
                      <td className={`${td} num hidden text-right sm:table-cell ${e.underwater ? "text-red" : "text-gray-300"}`}>
                        {e.depSol != null ? `${formatNum(e.depSol, 1)}` : "·"}
                        <span className="text-gray-500"> SOL</span>
                      </td>
                      <td className={td}>
                        {isSplit
                          ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-gray-300">Split</span>
                          : <span className="text-[11px] text-gray-400">Solo<span className="hidden sm:inline"> · {short(h.top_miner)}</span></span>}
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-black/20">
                        <td colSpan={6} className="p-0">
                          <PopDrilldown roundId={rid} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager offset={offset} total={total} onPage={setOffset} unit="hits" loading={ml.loading && !ml.data} />
      </ChartCard>
      <Caveats provenance={ml.provenance} error={ml.error} onRetry={ml.refresh} />
    </div>
  );
}

// ── Round Analysis: competition — top players + "what deploy gets me top-N" ──
const COMPETE_WINDOWS = [10, 25, 50];
const RANK_CHOICES = [1, 3, 5, 10, 20];
function RoundAnalysisTab() {
  const [rounds, setRounds] = useState(10);
  const [rank, setRank] = useState(10);
  const c = usePolled(() => fetchOreCompetition(rounds), 20_000, [rounds]);
  const d = c.data;
  const thr = d?.thresholds.find((t) => t.rank === rank);
  const n = d?.window.rounds_analyzed ?? rounds; // fall back to the REQUESTED window while loading (never "last 0 rounds")

  return (
    <div className="space-y-5">
      {/* WINDOW control — the analysis window; drives every threshold + the competition table */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 font-mono text-[13px] text-fog-muted">
        <span>Using the last {rounds} rounds of data.</span>
        <SegmentedControl
          aria-label="Competition window"
          items={COMPETE_WINDOWS.map((w) => ({
            id: String(w),
            label: `last ${w}`,
            title: `Recompute the thresholds & the competition table over the last ${w} rounds`,
          }))}
          value={String(rounds)}
          onChange={(id) => setRounds(Number(id))}
        />
      </div>

      {/* headline + tier pricing — side by side on large screens */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ChartCard
            title="To be top-N next round"
            subtitle="How much to deploy to crack your target rank."
          >
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[13px] text-fog-muted">reach</span>
              <SegmentedControl
                aria-label="Target rank"
                variant="loose"
                items={RANK_CHOICES.map((r) => ({
                  id: String(r),
                  label: `Top ${r}`,
                  title: `Show the deploy that lands you at rank ${r}`,
                }))}
                value={String(rank)}
                onChange={(id) => setRank(Number(id))}
              />
            </div>
            {thr && thr.median_sol != null ? (
              <>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-sm text-fog-muted">Deploy</span>
                  <span className="num text-3xl gradient-text">≈ {formatSol(thr.median_sol, 3)}<span className="ml-1 text-lg text-fog-muted">SOL</span></span>
                  <span className="font-mono text-[13px] text-fog-muted">to crack <span className="text-white">top {rank}</span></span>
                </div>
                <div className="mt-3 font-mono text-[13px] leading-snug text-fog-muted">
                  median deploy of the #{rank} wallet over the last {n} rounds · range {formatSol(thr.min_sol ?? 0, 3)}–{formatSol(thr.max_sol ?? 0, 3)} SOL · avg {formatSol(thr.avg_sol ?? 0, 3)}
                </div>
              </>
            ) : (
              c.loading && !d ? (
                <RowsSkeleton rows={3} />
              ) : (
                <div className="font-mono text-sm text-fog-muted">Not enough deploy data for top {rank} over the last {n} rounds.</div>
              )
            )}
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard
            title="Price of each tier"
            subtitle={`Median deploy that landed a wallet at each rank over the last ${n} rounds. Your picked rank is highlighted.`}
          >
            <div className={tableWrap}>
              <table className="w-full font-mono text-[13px]">
                <thead><tr className={theadRow}>
                  <th className={th}>Rank</th>
                  <th className={`${th} text-right`}>Median deploy</th>
                  <th className={`${th} text-right`}>Range</th>
                  <th className={`${th} hidden text-right sm:table-cell`}>Avg</th>
                </tr></thead>
                <tbody>
                  {c.loading && !c.data && <SkeletonRows cols={4} rows={6} />}
                  {(d?.thresholds ?? []).filter((t) => t.median_sol != null).map((t) => (
                    <tr key={t.rank} className={t.rank === rank ? oursRow : bodyRow}>
                      <td className={`${td} text-white`}>Top {t.rank}</td>
                      <td className={`${td} num text-right text-gold`}>{formatSol(t.median_sol ?? 0, 3)} SOL</td>
                      <td className={`${td} text-right text-gray-400`}>{formatSol(t.min_sol ?? 0, 3)}–{formatSol(t.max_sol ?? 0, 3)}</td>
                      <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatSol(t.avg_sol ?? 0, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* your competition — persistent top players */}
      <ChartCard title="Your competition" subtitle={`The persistent top wallets across the last ${n} rounds: who you're up against every round.`}>
        <div className={tableWrap}>
          <table className="w-full font-mono text-[13px] sm:min-w-[520px]">
            <thead><tr className={theadRow}>
              <th className={th}>#</th><th className={th}>Wallet</th>
              <th className={`${th} text-right`}>Rounds active</th>
              <th className={`${th} text-right`}>Avg / round</th>
              <th className={`${th} hidden text-right sm:table-cell`}>Biggest</th>
            </tr></thead>
            <tbody>
              {c.loading && !c.data && <SkeletonRows cols={5} />}
              {(d?.regulars ?? []).map((r, i) => (
                <tr key={r.authority} className={r.is_ours ? oursRow : bodyRow}>
                  <td className={`${td} text-fog-muted`}>{i + 1}</td>
                  <td className={`${td} ${r.is_ours ? "text-steel" : "text-white"}`}>
                    <CopyAddress address={r.authority} />{r.is_ours ? " ◆ ours" : ""}
                    {r.via_pool && (
                      <span
                        className="ml-1.5 rounded border border-line px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#B7BDD2]"
                        title={`Managed by pool crank ${r.via_pool}`}
                      >
                        pool
                      </span>
                    )}
                  </td>
                  <td className={`${td} text-right text-gray-300`}>{r.rounds_active}/{n}</td>
                  <td className={`${td} num text-right text-gold`}>{formatSol(r.avg_sol, 3)}</td>
                  <td className={`${td} num hidden text-right text-gray-300 sm:table-cell`}>{formatSol(r.max_sol, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      <Caveats provenance={c.provenance} error={c.error} onRetry={c.refresh} />
    </div>
  );
}

// ── Search Miners: ranked census explorer (leaderboard + address search) ─────
const MINER_SORTS: { id: string; label: string }[] = [
  { id: "net_sol", label: "Net SOL" },
  { id: "earned", label: "SOL earned" },
  { id: "deployed", label: "SOL deployed" },
  { id: "ore", label: "ORE earned" },
  { id: "roi", label: "Gross ROI" },
  { id: "unclaimed", label: "Unclaimed ORE" },
  { id: "refined", label: "Refined ORE" },
  { id: "lifetime_ore", label: "Lifetime ORE" },
  { id: "lifetime_sol", label: "Lifetime SOL" },
];
/** Sorts served by /ore/leaderboard (supports min-deployed filter + ROI bands). */
const LB_SORT_IDS = new Set(["net_sol", "earned", "deployed", "ore", "roi"]);
/** Map leaderboard-only sort ids onto /ore/miners when searching by address. */
const MINERS_SORT_FALLBACK: Record<string, string> = {
  earned: "lifetime_sol",
  ore: "lifetime_ore",
  roi: "net_sol",
};
const MIN_DEP = [0, 1, 10, 100];

type MinerRow = {
  authority: string;
  is_ours: boolean;
  deployed: string;
  earned: string;
  ore: string;
  net_sol: string;
  roi: number | null;
  unclaimed: string | null;
  refined: string | null;
};

// Unified shape for both fetch branches (leaderboard census vs live miners
// search) so usePolled binds a single envelope type.
type MinersTabData = {
  mode: "leaderboard" | "miners";
  snapshot_ts: string | null;
  total: number;
  bands: OreBands | null;
  net_positive_pct: number | null;
  rows: MinerRow[];
};

function MinersTab({ seed }: { seed?: MinerSeed | null }) {
  const [sort, setSort] = useState("net_sol");
  const [minDep, setMinDep] = useState(0);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setOffset(0); }, 350);
    return () => clearTimeout(t);
  }, [qInput]);
  // Seeded from another tab (e.g. a motherlode sharer's jump arrow): fill the
  // search bar AND set the query immediately (skip the debounce) so the jump lands
  // on results at once. Keyed on seed.n so re-clicking the same wallet re-fires.
  useEffect(() => {
    if (seed) { setQInput(seed.pubkey); setQ(seed.pubkey); setOffset(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.n]);

  const useLeaderboard = LB_SORT_IDS.has(sort) && !q;
  const polled = usePolled(async (): Promise<OreEnvelope<MinersTabData>> => {
    if (useLeaderboard) {
      const env = await fetchOreLeaderboard(sort, minDep, offset);
      const rows: MinerRow[] = (env.data.top ?? []).map((m) => ({
        authority: m.authority,
        is_ours: m.is_ours,
        deployed: m.lifetime_deployed,
        earned: m.lifetime_rewards_sol,
        ore: m.lifetime_rewards_ore,
        net_sol: m.net_sol,
        roi: m.roi,
        unclaimed: null,
        refined: null,
      }));
      return {
        ...env,
        data: {
          mode: "leaderboard" as const,
          snapshot_ts: env.data.snapshot_ts,
          total: env.data.total,
          bands: env.data.bands,
          net_positive_pct: env.data.net_positive_pct,
          rows,
        },
      };
    }
    const minersSort = MINERS_SORT_FALLBACK[sort] ?? sort;
    const env = await fetchOreMiners({ sort: minersSort, offset, q, limit: PAGE });
    const rows: MinerRow[] = (env.data.miners ?? []).map((mn) => ({
      authority: mn.authority,
      is_ours: mn.is_ours,
      deployed: mn.deployed,
      earned: mn.lifetime_sol,
      ore: mn.lifetime_ore,
      net_sol: mn.net_sol,
      roi: null,
      unclaimed: mn.unclaimed_ore,
      refined: mn.refined_ore,
    }));
    return {
      ...env,
      data: {
        mode: "miners" as const,
        snapshot_ts: env.data.snapshot_ts,
        total: env.data.total,
        bands: null,
        net_positive_pct: null,
        rows,
      },
    };
  }, 0, [useLeaderboard, sort, minDep, offset, q]);

  const d = polled.data;
  const total = d?.total ?? 0;
  const b = d?.bands ?? null;
  const bandRows = b
    ? [
        { label: "#1", value: b.top1 }, { label: "top 5%", value: b.b05 }, { label: "top 10%", value: b.b10 },
        { label: "top 20%", value: b.b20 }, { label: "top 30%", value: b.b30 }, { label: "top 50%", value: b.b50 },
        { label: "all", value: b.avg_all },
      ]
    : [];
  const sortLabel = MINER_SORTS.find((x) => x.id === sort)?.label ?? sort;
  const rows = d?.rows ?? [];
  const exactAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q) ? q : null;

  // A searched wallet filters the table to its own row — auto-expand it there
  // instead of rendering a second copy of the panel above the table.
  useEffect(() => {
    if (exactAddress) setExpanded(exactAddress);
  }, [exactAddress]);

  return (
    <div className="space-y-5">
      {exactAddress && (
        <button type="button" onClick={() => setQInput("")}
          className="flex items-center gap-1.5 rounded-md border border-line bg-ink-800 px-3 py-1.5 font-mono text-[13px] font-semibold text-fog-muted transition-colors hover:border-steel hover:text-white">
          <span aria-hidden>←</span> Back to all miners
        </button>
      )}
      {/* census-missing wallets have no table row to expand (event history only) */}
      {exactAddress && !polled.loading && rows.length === 0 && <MinerDetail pubkey={exactAddress} />}
      <ChartCard
        title="Miners"
        subtitle={d?.snapshot_ts
          ? `On-chain lifetime census ${new Date(d.snapshot_ts).toLocaleDateString()} · ${formatNum(total)} miners · ranked by ${sortLabel}`
          : "loading census…"}
        right={
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="search address…"
            className="w-full rounded-md border border-line bg-ink-800 px-2.5 py-1.5 font-mono text-[13px] text-white placeholder:text-fog-muted focus:border-steel focus:outline-none sm:w-64" />
        }>
        {d?.net_positive_pct != null && (
          <div className="mb-3 font-mono text-[12.5px] text-fog-muted">
            <span className="text-pos">{formatPct(d.net_positive_pct)}</span> of miners are net-positive lifetime
            (SOL returned − deployed, plus ORE earned at today's market ratio)
          </div>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted">
          <span className="shrink-0">sort:</span>
          <SegmentedControl
            aria-label="Miner sort"
            variant="loose"
            items={MINER_SORTS}
            value={sort}
            onChange={(id) => { setSort(id); setOffset(0); }}
          />
          <span className="section-label ml-auto"><Refreshing active={polled.fetching && !!polled.data} /></span>
        </div>
        {useLeaderboard && (
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted">
            <span className="shrink-0">min deployed:</span>
            <SegmentedControl
              aria-label="Minimum deployed"
              variant="loose"
              items={MIN_DEP.map((v) => ({ id: String(v), label: v === 0 ? "any" : `${v} SOL` }))}
              value={String(minDep)}
              onChange={(id) => { setMinDep(Number(id)); setOffset(0); }}
            />
          </div>
        )}
        <div className={tableWrap}>
          <table className="w-full font-mono text-[13px] sm:min-w-[640px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>#</th>
                <th className={th}>Miner</th>
                <th className={`${th} text-right`}>Deployed</th>
                <th className={`${th} text-right`}>Earned</th>
                <th className={`${th} text-right`}>Net SOL</th>
                <th className={`${th} hidden text-right sm:table-cell`}>ORE</th>
                {useLeaderboard ? (
                  <th className={`${th} hidden text-right sm:table-cell`}>ROI</th>
                ) : (
                  <>
                    <th className={`${th} hidden text-right sm:table-cell`}>Unclaimed</th>
                    <th className={`${th} hidden text-right sm:table-cell`}>Refined</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {polled.loading && !polled.data && <SkeletonRows cols={8} />}
              {rows.map((m, i) => {
                const net = lamportsToSol(m.net_sol);
                const isOpen = expanded === m.authority;
                return (
                  <Fragment key={m.authority}>
                  <tr className={`${m.is_ours ? oursRow : bodyRow} cursor-pointer`}
                    title="Click to expand this wallet"
                    onClick={() => setExpanded(isOpen ? null : m.authority)}>
                    <td className={`${td} text-fog-muted`}>
                      <span className={`mr-1 inline-block transition-transform ${isOpen ? "rotate-90" : ""}`}>▸</span>
                      {offset + i + 1}
                    </td>
                    <td className={`${td} ${m.is_ours ? "text-steel" : "text-white"}`}>
                      <CopyAddress address={m.authority} />{m.is_ours ? " ◆ ours" : ""}
                    </td>
                    <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(m.deployed), 1)}</td>
                    <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(m.earned), 1)}</td>
                    <td className={`${td} num text-right ${netTone(net)}`}>{net >= 0 ? "+" : ""}{formatSol(net, 2)}</td>
                    <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatNum(oreGramsToOre(m.ore), useLeaderboard ? 0 : 1)}</td>
                    {useLeaderboard ? (
                      <td className={`${td} hidden num text-right text-gold sm:table-cell`}>{m.roi ? m.roi.toFixed(2) + "×" : "·"}</td>
                    ) : (
                      <>
                        <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatNum(oreGramsToOre(m.unclaimed), 2)}</td>
                        <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatNum(oreGramsToOre(m.refined), 2)}</td>
                      </>
                    )}
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} className="bg-white/[0.015] px-2 py-3 sm:px-4">
                        <MinerDetail pubkey={m.authority} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager offset={offset} total={total} onPage={setOffset} unit="miners" loading={polled.loading && !polled.data} />
        {useLeaderboard && (
          <p className="mt-3 max-w-3xl font-mono text-[13px] leading-snug text-fog-muted">
            <span className="text-gray-300">Net SOL</span> = lifetime returned SOL − deployed (real profit, can be negative).
            ROI is the gross returned/deployed ratio. Both from the on-chain returned-SOL watermark (may include stake-back).
          </p>
        )}
      </ChartCard>

      {useLeaderboard && (
        <ChartCard title="Gross ROI by percentile band" subtitle={b ? `${formatNum(b.n)} miners with a deploy · a size-neutral view` : ""}>
          {b ? <div className="max-w-3xl"><HBars rows={bandRows} /></div> : <p className="font-mono text-xs text-fog-muted">No census yet.</p>}
        </ChartCard>
      )}
      <Caveats provenance={polled.provenance} error={polled.error} onRetry={polled.refresh} />
    </div>
  );
}

// ── Rounds: recent spine table ───────────────────────────────────────────────
function RoundsTab() {
  const [offset, setOffset] = useState(0);
  const [ranges, setRanges] = useState<Record<number, TileDeployRange | null>>({});
  const rounds = usePolled(() => fetchOreRounds(PAGE, offset), 20_000, [offset]);
  const rs = rounds.data?.rounds ?? [];
  const total = rounds.data?.total ?? 0;
  const roundIds = rs.map((r) => r.round_id).join(",");

  useEffect(() => {
    const pending = rs.filter((r) => r.source === "EVENT" && roundTileDeployRange(r) === null);
    if (!pending.length) return;
    let cancelled = false;
    setRanges({});
    (async () => {
      const next: Record<number, TileDeployRange | null> = {};
      const BATCH = 6;
      for (let i = 0; i < pending.length; i += BATCH) {
        if (cancelled) return;
        const batch = pending.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (r) => {
            try {
              const { data } = await fetchOreRound(r.round_id);
              next[r.round_id] = roundTileDeployRange(data.round);
            } catch {
              next[r.round_id] = null;
            }
          }),
        );
      }
      if (!cancelled) setRanges(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [roundIds]);

  return (
    <div className="space-y-5">
      <ChartCard subtitle="Split = jackpot shared across winners. Max spread = hottest minus coldest tile; % = spread ÷ coldest.">
        <div className={tableWrap}>
          <table className="w-full font-mono text-[13px] sm:min-w-[560px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Round</th>
                <th className={`${th} text-right`}>ORE won</th>
                <th className={`${th} text-right`}>Deployed</th>
                <th className={`${th} text-right`}>Miners</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Tile</th>
                <th className={`${th} text-right`}>Winner</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Max spread</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Max spread %</th>
              </tr>
            </thead>
            <tbody>
              {rounds.loading && !rounds.data && <SkeletonRows cols={8} />}
              {rs.map((r) => (
                <tr key={r.round_id} className={bodyRow}>
                  <td className={`${td} text-white`}>#{formatNum(Number(r.round_id))}</td>
                  <td className={`${td} num text-right`}>
                    {/* base emission (~1 ORE to the winner) + the accumulated pool on a pop round */}
                    <span className="text-gray-300">{formatNum(solOf(r.total_minted), 1)}</span>
                    {solOf(r.motherlode_paid) > 0 && (
                      <span className="text-gold"> +{formatNum(solOf(r.motherlode_paid), 1)}</span>
                    )}
                  </td>
                  <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(r.total_deployed), 2)}</td>
                  <td className={`${td} text-right text-gray-300`}>{r.total_miners ? formatNum(Number(r.total_miners)) : "·"}</td>
                  <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{r.winning_tile != null ? `#${r.winning_tile + 1}` : "·"}</td>
                  <td className={`${td} text-right text-gray-300`}>
                    {r.is_split ? "split" : <CopyAddress address={r.top_miner} />}
                  </td>
                  <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>
                    {(() => {
                      const range = roundTileDeployRange(r) ?? ranges[r.round_id];
                      return range != null ? `${formatSol(lamportsToSol(range.spread.toString()), 3)} SOL` : "·";
                    })()}
                  </td>
                  <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>
                    {(() => {
                      const range = roundTileDeployRange(r) ?? ranges[r.round_id];
                      const frac = range ? roundMaxSpreadFrac(range) : null;
                      return frac != null ? formatPct(frac, 2) : "·";
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager offset={offset} total={total} onPage={setOffset} unit="rounds" loading={rounds.loading && !rounds.data} />
      </ChartCard>
      <Caveats provenance={rounds.provenance} error={rounds.error} onRetry={rounds.refresh} />
    </div>
  );
}

// ── caveats / provenance footer ──────────────────────────────────────────────
function Caveats({ provenance, error, onRetry }: { provenance: any; error: string | null; onRetry?: () => void }) {
  if (error) {
    return (
      <div className="card flex flex-wrap items-center gap-x-3 gap-y-2 border-amber/30 px-4 py-3 font-mono text-[13px] text-amber">
        <span>{error} The ORE ingest may be disabled or the free-tier host may be waking up.</span>
        {onRetry && (
          <button onClick={onRetry}
            className="rounded border border-amber/40 px-2.5 py-1 text-[12px] text-amber transition-colors hover:border-amber hover:text-white">
            retry
          </button>
        )}
      </div>
    );
  }
  if (!provenance) return null;
  return (
    <details className="card px-4 py-3">
      <summary className="cursor-pointer select-none font-mono text-[13px] text-fog-muted">
        data &amp; caveats · spine → #{formatNum(Number(provenance.ore_max_round || 0))}
        {provenance.census_snapshot_ts ? ` · census ${new Date(provenance.census_snapshot_ts).toLocaleDateString()}` : ""}
        {provenance.ingest_enabled ? "" : " · ingest OFF"}
      </summary>
      <ul className="mt-2 space-y-1.5">
        {(provenance.caveats ?? []).map((c: string, i: number) => (
          <li key={i} className="font-mono text-[13px] leading-snug text-fog-muted">• {c}</li>
        ))}
      </ul>
    </details>
  );
}

// ── Ecosystem: investor metrics — supply, buybacks, pools, whales, claims ─────
const ECO_RANGES: { id: string; label: string }[] = [
  { id: "30d", label: "30D" }, { id: "90d", label: "90D" }, { id: "all", label: "All" },
];
function EcosystemSection() {
  const [range, setRange] = useState("90d");
  const eco = usePolled(() => fetchOreEcosystem(range), 60_000, [range]);
  const pts = eco.data?.points ?? [];
  const sum = eco.data?.summary;
  const dayLbl = (ts: number) => { const dt = new Date(ts * 1000); return `${dt.getMonth() + 1}/${dt.getDate()}`; };
  const mkP = (pick: (p: OreEcoPoint) => number | null): Pt[] =>
    pts.filter((p) => pick(p) != null).map((p) => ({ label: dayLbl(p.day_ts), value: pick(p)! }));
  const mkN = (pick: (p: OreEcoPoint) => number | null): TPt[] =>
    pts.map((p) => ({ label: dayLbl(p.day_ts), value: pick(p) }));

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
          <AreaLine spectral points={mkP((p) => p.cum_net_ore)} height={200} zeroBaseline={false}
            fmt={(v) => formatNum(v, 0) + " ORE"} yFmt={compactNum} loading={eco.loading} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="tr" title="Buyback pressure"
          subtitle="SOL spent buying ORE per day (10% of losing tiles flows here).">
          <AreaLine spectral points={mkP((p) => p.buyback_sol)} height={200}
            fmt={(v) => formatSol(v, 1) + " SOL"} yFmt={compactNum} loading={eco.loading} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="bl" title="Pooled-mining share"
          subtitle="% of deployed SOL flowing through managed cranks (a signer driving ≥3 miners that day).">
          <AreaLine points={mkP((p) => p.pool_share_pct)} height={200} zeroBaseline={false} color="#9A6BFF"
            fmt={(v) => formatNum(v, 1) + "%"} yFmt={(v) => formatNum(v, 0) + "%"} loading={eco.loading} />
        </ChartCard>
        <ChartCard variant="dispersion" cutCorner="tr" title="Whale concentration"
          subtitle="Top-10 miner authorities' share of deployed SOL per day.">
          <AreaLine points={mkP((p) => p.top10_share_pct)} height={200} zeroBaseline={false} color="#E8881A"
            fmt={(v) => formatNum(v, 1) + "%"} yFmt={(v) => formatNum(v, 0) + "%"} loading={eco.loading} />
        </ChartCard>
        <div className="lg:col-span-2">
          <ChartCard variant="dispersion" cutCorner="bl" title="Claims flow"
            subtitle="What miners cash out per day: SOL winnings vs ORE claims. Falling ORE claims = holders letting the pile refine.">
            <DualLine a={mkN((p) => p.claims_sol)} b={mkN((p) => p.claims_ore)} aName="SOL claimed" bName="ORE claimed"
              aColor="#9DB7D8" bColor="#22E0E6" height={210}
              aFmt={(v) => formatNum(v, 0)} bFmt={(v) => formatNum(v, 0)} loading={eco.loading} />
          </ChartCard>
        </div>
      </div>
      <Caveats provenance={null} error={eco.error} onRetry={eco.refresh} />
    </div>
  );
}

/** 5x5 heatmap of the wallet's tile preferences + its top-3 hottest tiles. */
function FavoriteSquares({ tiles }: { tiles: number[] }) {
  const max = Math.max(...tiles, 1);
  const total = tiles.reduce((a, b) => a + b, 0);
  const played = tiles.filter((n) => n > 0).length;
  const hot = tiles
    .map((n, i) => ({ n, i }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .filter((t) => t.n > 0);
  const top = hot[0] ?? null;
  return (
    <div className="mt-3 rounded-xl border border-line bg-white/[0.02] px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <span className="label">Favorite tiles</span>
          {/* hot-tile pills removed per request; the in-grid flames carry it
          {hot.length > 0 && (
            <span className="flex items-center gap-1.5">
              {hot.map((h) => (
                <span key={h.i} title={`tile ${h.i + 1}: ${formatNum(h.n)} deploys`}
                  className="rounded-md border border-[#E8881A]/40 bg-[#E8881A]/10 px-1.5 py-0.5 font-mono text-[12px] font-bold text-[#E8881A]">
                  🔥 #{h.i + 1}
                </span>
              ))}
            </span>
          )}
          */}
        </div>
        <div className="grid grid-cols-5 gap-1" aria-label="tile preference heatmap">
          {tiles.map((n, i) => {
            const isHot = hot.some((h) => h.i === i);
            return (
              <span key={i} title={`tile ${i + 1}: ${formatNum(n)} deploys`}
                className="flex h-5 w-5 items-center justify-center rounded-[4px] text-[11px] leading-none"
                style={{
                  background: n > 0 ? `rgba(91, 108, 255, ${0.15 + 0.85 * (n / max)})` : "rgba(255,255,255,0.05)",
                  boxShadow: isHot ? "0 0 6px rgba(34,224,230,0.8), inset 0 0 0 1px rgba(34,224,230,0.9)" : "inset 0 0 0 1px rgba(255,255,255,0.07)",
                }}>
                {isHot ? "🔥" : ""}
              </span>
            );
          })}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-8 gap-y-2 text-right">
          {top && (
            <span className="flex flex-col gap-0.5">
              <span className="label">Top tile</span>
              <span className="font-mono text-[15px] font-bold text-white">
                #{top.i + 1} <span className="text-[12.5px] font-semibold text-fog-muted">{total > 0 ? formatPct(top.n / total) : ""}</span>
              </span>
            </span>
          )}
          <span className="flex flex-col gap-0.5">
            <span className="label">Tiles played</span>
            <span className="font-mono text-[15px] font-bold text-white">{played} <span className="text-[12.5px] font-semibold text-fog-muted">of 25</span></span>
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="label">Deploys</span>
            <span className="font-mono text-[15px] font-bold text-white">{formatNum(total)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Cumulative P/L trend with window + currency controls (event-exact rounds). */