"use client";

/**
 * /stats — the ORE-ecosystem Stats page.
 *
 * ORE-first: the whole ORE game (emission, rake, motherlode, competition,
 * miner ranking, production cost). Financial-analyst tabs. ZINC is a placeholder
 * for v1. Native units; USD is a labelled off-chain overlay.
 */
import { useEffect, useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { TabBar, SegmentedControl } from "@/components/primitives/TabBar";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { TileSkeleton, RowsSkeleton, Refreshing } from "@/components/primitives/Skeleton";
import { AreaLine, Bars, HBars, ChartCard, compactNum, type Pt } from "@/components/stats/Charts";
import { DualLine, CostEvChart, BarsLine, type TPt } from "@/components/stats/TrendCharts";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchOreRounds, fetchOreRound, fetchOreMotherlode, fetchOreLeaderboard,
  fetchOreMiners, fetchOreSeries, fetchOreCompetition, fetchOreTrends,
  fetchOreEcosystem, fetchOreMiner, fetchOreYields,
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

const TABS: { id: Tab; label: string }[] = [
  { id: "trends", label: "Trends" },
  { id: "round_analysis", label: "Round Analysis" },
  { id: "miners", label: "Search Miners" },
  { id: "motherlode", label: "Motherlode" },
  { id: "rounds", label: "Rounds" },
];

const short = (a?: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "—");

// Table styling mirrors the Position page's WalletAnalytics tables 1:1.
const tableWrap = styles.tableWrap;
const theadRow = `${styles.tableHead} text-left`;
const th = "px-2 py-2 font-normal sm:px-3";
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

  return (
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
        {visited.has("trends") && <div hidden={tab !== "trends"}><TrendsTab /></div>}
        {visited.has("round_analysis") && <div hidden={tab !== "round_analysis"}><RoundAnalysisTab /></div>}
        {visited.has("miners") && <div hidden={tab !== "miners"}><MinersTab /></div>}
        {visited.has("motherlode") && <div hidden={tab !== "motherlode"}><MotherlodeTab /></div>}
        {visited.has("rounds") && <div hidden={tab !== "rounds"}><RoundsTab /></div>}
      </div>
    </div>
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
function TrendsTab() {
  const [range, setRange] = useState("30d");
  const trends = usePolled(() => fetchOreTrends(range), 60_000, [range]);
  const yields = usePolled(() => fetchOreYields(), 120_000, []);
  const tp = trends.data?.points ?? [];
  const ml = trends.data?.motherlode;

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
          hint={`expected pop 125 · past avg ${ml?.avg_pop_ore != null ? formatNum(ml.avg_pop_ore, 0) : "·"}`} />
        <StatTile label="Miners today" value={tp.length && tp[tp.length - 1].unique_miners != null ? formatNum(tp[tp.length - 1].unique_miners!) : "···"} hint="unique wallets that deployed" />
      </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* (2) the money chart — full width */}
        <div className="lg:col-span-2">
          <ChartCard variant="dispersion" cutCorner="tr" title="Production cost vs market (+EV)"
            subtitle="SOL cost to mine 1 ORE (measured: admin + vaulted, ÷ expected ORE incl. motherlode) vs buying at market. Green = mining is +EV.">
            <CostEvChart market={mkT((p) => p.market_ratio_sol)} cost={mkT((p) => p.prod_cost_sol)} ev={mkT((p) => p.ev_pct)} height={250} loading={trends.loading} />
          </ChartCard>
        </div>
        {/* (1) prices */}
        <ChartCard variant="dispersion" cutCorner="bl" title="ORE & SOL price" subtitle="Market prices (USD). A cheap ORE or a ratio discount is a call to action.">
          <DualLine a={mkT((p) => p.ore_usd)} b={mkT((p) => p.sol_usd)} aName="ORE $" bName="SOL $" height={205}
            aFmt={(v) => "$" + formatNum(v, 1)} bFmt={(v) => "$" + formatNum(v, 0)} loading={trends.loading} />
        </ChartCard>
        {/* (3) activity */}
        <ChartCard variant="dispersion" cutCorner="tr" title="Mining activity" subtitle="Avg SOL deployed per round (bars) and unique miners per day (line, exact on-chain count).">
          <BarsLine bars={mkT((p) => p.avg_deployed_sol)} line={mkT((p) => p.unique_miners)} barName="SOL / round" lineName="unique miners" height={205}
            barFmt={(v) => formatNum(v, 1)} lineFmt={(v) => formatNum(v, 0)} loading={trends.loading} />
        </ChartCard>
        {/* (5) yields — refining vs staking APR (quant spec: APR %, 7d rolling) */}
        <div className="lg:col-span-2">
          <ChartCard variant="dispersion" cutCorner="tr" title="Yields — hold unclaimed vs claim & stake"
            subtitle={`Refining APR (what your unclaimed ORE earns from others' claim fees) vs stORE staking APR. Annualized, rolling window up to 7d${yields.data?.latest?.window_days != null && yields.data.latest.window_days < 6.5 ? ` (currently ${formatNum(yields.data.latest.window_days, 1)}d — precise history began Jul 13)` : ""}.`}>
            <DualLine shared
              a={(yields.data?.points ?? []).map((p) => ({ label: new Date(p.hour_ts * 1000).getMonth() + 1 + "/" + new Date(p.hour_ts * 1000).getDate() + " " + new Date(p.hour_ts * 1000).getHours() + ":00", value: p.refining_apr }))}
              b={(yields.data?.points ?? []).map((p) => ({ label: new Date(p.hour_ts * 1000).getMonth() + 1 + "/" + new Date(p.hour_ts * 1000).getDate() + " " + new Date(p.hour_ts * 1000).getHours() + ":00", value: p.staking_apr }))}
              aName="refining APR (unclaimed)" bName="stORE staking APR"
              aColor="#22E0E6" bColor="#E8881A" height={210}
              aFmt={(v) => formatNum(v, 1) + "%"} bFmt={(v) => formatNum(v, 1) + "%"}
              loading={yields.loading}
              emptyText="collecting on-chain snapshots — first points appear within ~2 hours; the full 7-day view completes by Jul 20" />
          </ChartCard>
        </div>
        {/* (4) motherlode — full width */}
        <div className="lg:col-span-2">
          <ChartCard variant="dispersion" cutCorner="bl" title="Motherlode pop value"
            subtitle={`Past pop sizes vs the 125 ORE long-run expectation (dashed) — last bar is the live pool, still accruing 0.2/round.${ml?.avg_pop_ore != null ? ` Historical average pop: ${formatNum(ml.avg_pop_ore, 1)} ORE over ${formatNum(ml.pops.length)} pops.` : ""}`}>
            <div className="mb-1.5 flex flex-wrap gap-4 font-mono text-[11px] text-fog-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#5B6CFF] opacity-70" /> past pop payout</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#5B6CFF]" /> live pool (not popped yet)</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t border-dashed border-fog-muted" /> 125 ORE = what a pop pays on average if it hits on schedule (0.2/round × 1-in-625)</span>
            </div>
            <Bars bars={popBars} height={205} expected={125} expectedLabel="expected: 125 ORE" fmt={(v) => formatNum(v, 1) + " ORE"}
              highlight={(i) => i === popBars.length - 1} color="#5B6CFF" loading={trends.loading} />
          </ChartCard>
        </div>
      </div>

      <div className="space-y-5 border-t border-line pt-6">
        <div className="section-label">Protocol internals — rake · vaulted · winners</div>
        <ProtocolCharts range={range} />
      </div>

      <EcosystemSection />

      <Caveats provenance={trends.provenance} error={trends.error} onRetry={trends.refresh} />
    </div>
  );
}

/** The old protocol-operator charts, demoted out of the miner path (rendered only
 *  when the details section is opened — the hook only mounts then). */
function ProtocolCharts({ range }: { range: string }) {
  const seriesRange = range === "all" ? "all" : range; // /ore/series shares range ids
  const series = usePolled(() => fetchOreSeries(seriesRange), 60_000, [seriesRange]);
  const pts = series.data?.points ?? [];
  const lbl = (p: OreSeriesPoint) => {
    const dt = new Date(Number(p.bucket_ts) * 1000);
    return range === "7d" ? `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:00` : `${dt.getMonth() + 1}/${dt.getDate()}`;
  };
  const mk = (pick: (p: OreSeriesPoint) => number): Pt[] => pts.map((p) => ({ label: lbl(p), value: pick(p) }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard variant="dispersion" cutCorner="tr" title="SOL deployed" subtitle="Total SOL staked per bucket.">
        <AreaLine spectral points={mk((p) => lamportsToSol(p.deployed))} height={195} fmt={(v) => formatSol(v, 0) + " SOL"} yFmt={compactNum} />
      </ChartCard>
      <ChartCard variant="dispersion" cutCorner="bl" title="Effective rake" subtitle="Protocol take % per bucket (1% admin + ~9.9% buyback). Zoomed — variation is sub-0.01%.">
        <AreaLine spectral points={mk((p) => (p.avg_rake_bps ?? 0) / 100)} height={195} zeroBaseline={false} fmt={(v) => v.toFixed(4) + "%"} yFmt={(v) => v.toFixed(2) + "%"} />
      </ChartCard>
      <ChartCard variant="dispersion" cutCorner="tr" title="SOL vaulted (protocol take)" subtitle="Total SOL vaulted (buyback + admin) per bucket.">
        <AreaLine spectral points={mk((p) => lamportsToSol(p.vaulted))} height={195} fmt={(v) => formatSol(v, 1) + " SOL"} yFmt={compactNum} />
      </ChartCard>
      <ChartCard variant="dispersion" cutCorner="bl" title="Winners / round" subtitle="Avg miners rewarded per round (reset-event count).">
        <AreaLine
          spectral
          points={pts.filter((p) => p.avg_winners != null).map((p) => ({ label: lbl(p), value: Number(p.avg_winners) }))}
          height={195} zeroBaseline={false} fmt={(v) => formatNum(v, 0)} />
      </ChartCard>
    </div>
  );
}

// ── Motherlode ────────────────────────────────────────────────────────────────
function MotherlodeTab() {
  const [offset, setOffset] = useState(0);
  const ml = usePolled(() => fetchOreMotherlode(PAGE, offset), 20_000, [offset]);
  const mlChart = usePolled(() => fetchOreMotherlode(50, 0), 20_000, []);
  const d = ml.data;
  const total = d?.total ?? 0;
  const pool = oreGramsToOre(d?.current?.pool_grams);
  const sinceHit = d?.current ? d.current.current_round - (d.current.last_hit_round ?? d.current.current_round) : 0;
  const mlChartPts: Pt[] = [...(mlChart.data?.recent_hits ?? [])]
    .reverse()
    .map((h) => ({ label: `#${formatNum(Number(h.round_id))}`, value: solOf(h.motherlode_paid) }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Current pool" value={pool ? formatNum(pool, 1) : "···"} unit="ORE" tone="gold" hint={`+0.2 ORE/round · ${formatNum(sinceHit)} since last hit`} />
        <StatTile label="Odds per round" value="1 : 625" hint="by protocol design" />
        <StatTile label="Last hit" value={d?.current?.last_hit_round ? `#${formatNum(d.current.last_hit_round)}` : "···"} hint="most recent drop" />
        <StatTile label="Total hits" value={formatNum(total)} hint="all-time (≥ 0.2 ORE)" />
      </div>
      <ChartCard variant="dispersion" cutCorner="tr" title="Motherlode payouts" subtitle="Last 50 hits — ORE paid per round.">
        <AreaLine
          spectral
          points={mlChartPts}
          height={210}
          zeroBaseline={false}
          fmt={(v) => formatNum(v, 1) + " ORE"}
          yFmt={(v) => formatNum(v, 0)}
          yLabel="ORE paid by round"
        />
      </ChartCard>
      <ChartCard title="Recent motherlode drops" subtitle="Each hit pays the whole pool out and resets it to 0; it rebuilds at +0.2 ORE/round.">
        <div className={tableWrap}>
          <table className="w-full font-mono text-[13px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Round</th>
                <th className={`${th} text-right`}>ORE paid</th>
                <th className={`${th} text-right`}>Since prev</th>
              </tr>
            </thead>
            <tbody>
              {ml.loading && !ml.data && <SkeletonRows cols={4} />}
              {(d?.recent_hits ?? []).map((h) => (
                <tr key={h.round_id} className={bodyRow}>
                  <td className={`${td} text-white`}>#{formatNum(Number(h.round_id))}</td>
                  <td className={`${td} num text-right text-gold`}>{formatNum(solOf(h.motherlode_paid), 1)}</td>
                  <td className={`${td} text-right text-gray-400`}>{h.gap != null ? formatNum(h.gap) : "·"}</td>
                </tr>
              ))}
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
      <ChartCard title="Your competition" subtitle={`The persistent top wallets across the last ${n} rounds — who you're up against every round.`}>
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
                        className="ml-1.5 rounded border border-line px-1 py-px text-[10px] uppercase tracking-[0.1em] text-fog-muted"
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

function MinersTab() {
  const [sort, setSort] = useState("net_sol");
  const [minDep, setMinDep] = useState(0);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setOffset(0); }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

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

  return (
    <div className="space-y-5">
      {exactAddress && <MinerDetail pubkey={exactAddress} />}
      <ChartCard
        title="Miners"
        subtitle={d?.snapshot_ts
          ? `Census ${new Date(d.snapshot_ts).toLocaleDateString()} · ${formatNum(total)} miners · ranked by ${sortLabel}`
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
                return (
                  <tr key={m.authority} className={`${m.is_ours ? oursRow : bodyRow} cursor-pointer`}
                    title="Click to inspect this wallet"
                    onClick={() => { setQInput(m.authority); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                    <td className={`${td} text-fog-muted`}>{offset + i + 1}</td>
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
                <th className={`${th} text-right`}>Deployed</th>
                <th className={`${th} text-right`}>Miners</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Tile</th>
                <th className={`${th} text-right`}>Winner</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Max spread</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Max spread %</th>
              </tr>
            </thead>
            <tbody>
              {rounds.loading && !rounds.data && <SkeletonRows cols={7} />}
              {rs.map((r) => (
                <tr key={r.round_id} className={bodyRow}>
                  <td className={`${td} text-white`}>#{formatNum(Number(r.round_id))}</td>
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

// ── Miner detail: the wallet P&L lookup (mounts when the search box holds a full address) ──
function MinerDetail({ pubkey }: { pubkey: string }) {
  const det = usePolled(() => fetchOreMiner(pubkey), 30_000, [pubkey]);
  const d = det.data;
  if (det.loading && !d) {
    return <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><TileSkeleton /><TileSkeleton /><TileSkeleton /><TileSkeleton /></div>;
  }
  if (!d) {
    return (
      <div className="card px-4 py-3 font-mono text-[13px] text-fog-muted">
        {det.error?.includes("404") ? `No miner found for ${short(pubkey)} — this wallet has never deployed.` : det.error ?? "…"}
      </div>
    );
  }
  const c = d.census;
  const deployed = lamportsToSol(c?.lifetime_deployed ?? null);
  const returned = lamportsToSol(c?.lifetime_rewards_sol ?? null);
  const net = returned - deployed;
  const oreLifetime = solOf(c?.lifetime_rewards_ore ?? null);
  const unclaimed = solOf(c?.rewards_ore ?? null);
  const refinedLive = solOf(c?.refined_live ?? null);
  const hs = d.hit_stats;
  const hitRate = hs && hs.rounds > 0 ? hs.hits / hs.rounds : null;
  const firstTs = d.events?.first_ts ? new Date(Number(d.events.first_ts) * 1000) : null;

  return (
    <ChartCard
      title={`Miner ${short(pubkey)}`}
      subtitle={`Wallet P&L — lifetime on-chain census + event-exact round history${d.managed_by.length ? "" : ""}`}
      right={<CopyAddress address={pubkey} className="font-mono text-[13px] text-fog-muted" />}
    >
      {d.managed_by.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[12px] text-fog-muted">
          managed by
          {d.managed_by.map((m) => (
            <span key={m.pubkey} className="rounded border border-line px-1.5 py-0.5" title={m.pubkey}>
              pool {short(m.pubkey)}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile variant="inset" label="Deployed (lifetime)" value={formatSol(deployed, 2)} unit="SOL" />
        <StatTile variant="inset" label="Returned (lifetime)" value={formatSol(returned, 2)} unit="SOL" />
        <StatTile variant="inset" label="Net SOL"
          value={<span className={netTone(net)}>{formatSol(net, 2)}</span>} unit="SOL" hint="returned − deployed" />
        <StatTile variant="inset" label="ORE earned" value={formatNum(oreLifetime, 2)} unit="ORE" tone="gold"
          hint={`unclaimed ${formatNum(unclaimed, 2)} · refined (live) ${formatNum(refinedLive, 2)}`} />
        <StatTile variant="inset" label="Hit rate"
          value={hitRate != null ? formatPct(hitRate) : "···"}
          hint={hs ? `${formatNum(hs.hits)} of ${formatNum(hs.rounds)} rounds` : "event window"} />
        <StatTile variant="inset" label="Active since"
          value={firstTs ? `${firstTs.getMonth() + 1}/${firstTs.getDate()}` : "···"}
          hint={d.events ? `${formatNum(d.events.rounds)} rounds · ${formatNum(d.events.deploys)} deploys` : undefined} />
      </div>

      <div className={`${tableWrap} mt-4`}>
        <table className="w-full font-mono text-[13px] sm:min-w-[560px]">
          <thead><tr className={theadRow}>
            <th className={th}>Round</th>
            <th className={`${th} text-right`}>Deployed</th>
            <th className={`${th} hidden text-right sm:table-cell`}>Tiles</th>
            <th className={`${th} text-right`}>Result</th>
            <th className={`${th} text-right`}>SOL back</th>
            <th className={`${th} text-right`}>Net</th>
          </tr></thead>
          <tbody>
            {d.history.map((h) => {
              const dep = lamportsToSol(h.deployed);
              const stakeW = Number(h.stake_w ?? "0");
              const hit = stakeW > 0;
              const dws = Number(h.deployed_winning_square ?? "0");
              const won = hit && dws > 0
                ? (stakeW * 0.99 + Number(h.total_winnings ?? "0") * (stakeW / dws)) / 1e9
                : 0;
              const rowNet = won - dep;
              const tiles = (() => { let m = BigInt(h.mask_union ?? "0"), n = 0; while (m > 0n) { n += Number(m & 1n); m >>= 1n; } return n; })();
              return (
                <tr key={h.round_id} className={bodyRow}>
                  <td className={`${td} text-white`}>#{formatNum(Number(h.round_id))}</td>
                  <td className={`${td} text-right text-gray-300`}>{formatSol(dep, 3)}</td>
                  <td className={`${td} hidden text-right text-fog-muted sm:table-cell`}>{tiles}</td>
                  <td className={`${td} text-right`}>
                    {h.winning_tile == null
                      ? <span className="text-fog-dim">refund</span>
                      : hit ? <span className="text-pos">HIT</span> : <span className="text-fog-muted">miss</span>}
                  </td>
                  <td className={`${td} num text-right text-gray-300`}>{won > 0 ? formatSol(won, 3) : "·"}</td>
                  <td className={`${td} num text-right ${netTone(rowNet)}`}>{formatSol(rowNet, 3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-[12px] leading-relaxed text-fog-muted">
        Last {d.history.length} rounds (event window). SOL outcomes are exact (per-tile stakes reconstructed
        from deploy events); ORE from a HIT follows the winner lottery, so it isn't shown per round.
      </p>
    </ChartCard>
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
          Ecosystem — supply, buybacks &amp; market structure
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
            subtitle="ORE minted per day vs ORE destroyed by buyback burns — the net issuance picture.">
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
            subtitle="What miners cash out per day — SOL winnings vs ORE claims. Falling ORE claims = holders letting the pile refine.">
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
