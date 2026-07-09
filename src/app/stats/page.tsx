"use client";

/**
 * /stats — the ORE-ecosystem Stats page.
 *
 * ORE-first: the whole ORE game (emission, rake, motherlode, competition,
 * leaderboard, production cost) with OUR dORE pool woven in as our slice of the
 * field. Financial-analyst tabs. ZINC is a placeholder for v1. Native units; USD is a
 * labelled off-chain overlay.
 */
import { useEffect, useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { TabBar, SegmentedControl } from "@/components/primitives/TabBar";
import { AreaLine, HBars, ChartCard, compactNum, type Pt } from "@/components/stats/Charts";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchOreRounds, fetchOreMotherlode, fetchOreLeaderboard,
  fetchOreMiners, fetchOreSeries, fetchOreCompetition,
  lamportsToSol, oreGramsToOre, bpsToPct,
  type OreRound, type OreSeriesPoint,
} from "@/lib/oreStats";
import { formatSol, formatNum, formatPct } from "@/lib/format";

type Tab = "trends" | "motherlode" | "leaderboard" | "players" | "miners" | "rounds";

const TABS: { id: Tab; label: string }[] = [
  { id: "trends", label: "Trends" },
  { id: "motherlode", label: "Motherlode" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "players", label: "Players" },
  { id: "miners", label: "Miners" },
  { id: "rounds", label: "Rounds" },
];

const short = (a?: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "—");

// Table styling mirrors the Position page's WalletAnalytics tables 1:1.
const tableWrap = "overflow-x-auto rounded-lg bg-white/[0.02]";
const theadRow = "bg-ink-800/60 text-left text-fog-muted";
const th = "px-2 py-2 font-normal sm:px-3";
const td = "px-2 py-2 sm:px-3";
const bodyRow = "transition-colors hover:bg-white/[0.03]";
const oursRow = "bg-[rgba(157,183,216,0.12)] transition-colors";

const solOf = (grams?: string | null) => oreGramsToOre(grams); // ORE grams -> ORE
const netTone = (v: number) => (v > 0 ? "text-pos" : v < 0 ? "text-red" : "text-gray-300");

const PAGE = 50; // shared page size for every paginated table

// One pagination control for every table (rows N–M of TOTAL + Prev/Next).
function Pager({ offset, total, onPage, unit = "rows" }: { offset: number; total: number; onPage: (o: number) => void; unit?: string }) {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.floor(offset / PAGE) + 1;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[13px] text-fog-muted">
      <span>{formatNum(from)}–{formatNum(to)} of {formatNum(total)} {unit} · page {formatNum(page)} / {formatNum(pages)}</span>
      <div className="flex gap-2">
        <button disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - PAGE))}
          className="rounded border border-line px-3 py-1.5 disabled:opacity-40 enabled:hover:border-steel enabled:hover:text-white">Prev</button>
        <button disabled={page >= pages} onClick={() => onPage(offset + PAGE)}
          className="rounded border border-line px-3 py-1.5 disabled:opacity-40 enabled:hover:border-steel enabled:hover:text-white">Next</button>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>("trends");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Ore Data</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fog-dim">
          Find alpha in the mining data
        </p>
      </header>

      <TabBar aria-label="Ore Data sections" items={TABS} value={tab} onChange={setTab} />
      {tab === "trends" && <TrendsTab />}
      {tab === "motherlode" && <MotherlodeTab />}
      {tab === "leaderboard" && <LeaderboardTab />}
      {tab === "players" && <PlayersTab />}
      {tab === "miners" && <MinersTab />}
      {tab === "rounds" && <RoundsTab />}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function completeRounds(rounds: OreRound[]): OreRound[] {
  return rounds.filter((r) => r.winning_tile != null && Number(r.total_deployed ?? 0) > 1_000_000_000);
}

// ── Trends: range-bucketed time series ───────────────────────────────────────
const RANGES: { id: string; label: string }[] = [
  { id: "7d", label: "7D" }, { id: "30d", label: "30D" }, { id: "90d", label: "90D" }, { id: "1y", label: "1Y" }, { id: "all", label: "All" },
];
function TrendsTab() {
  const [range, setRange] = useState("30d");
  const series = usePolled(() => fetchOreSeries(range), 60_000, [range]);
  const pts = series.data?.points ?? [];
  const lbl = (p: OreSeriesPoint) => {
    const dt = new Date(Number(p.bucket_ts) * 1000);
    return range === "7d" ? `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:00` : `${dt.getMonth() + 1}/${dt.getDate()}`;
  };
  const mk = (pick: (p: OreSeriesPoint) => number): Pt[] => pts.map((p) => ({ label: lbl(p), value: pick(p) }));
  const costOf = (p: OreSeriesPoint) => { const o = oreGramsToOre(p.minted); return o > 0 ? lamportsToSol(p.vaulted) / o : 0; };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="section-label">Time series · {series.data?.range ?? range}</div>
        <SegmentedControl aria-label="Time range" items={RANGES} value={range} onChange={setRange} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="SOL deployed" subtitle="Total SOL staked per bucket.">
          <AreaLine points={mk((p) => lamportsToSol(p.deployed))} height={195} fmt={(v) => formatSol(v, 0) + " SOL"} yFmt={compactNum} />
        </ChartCard>
        <ChartCard title="Cost per ORE" subtitle="SOL vaulted ÷ ORE minted — the production cost.">
          <AreaLine points={mk(costOf)} color="#E8881A" height={195} zeroBaseline={false} fmt={(v) => formatSol(v, 5) + " SOL"} yFmt={(v) => v.toFixed(3)} />
        </ChartCard>
        <ChartCard title="Effective rake" subtitle="Protocol take % per bucket (1% admin + ~9.9% buyback). Zoomed — variation is sub-0.01%.">
          <AreaLine points={mk((p) => (p.avg_rake_bps ?? 0) / 100)} color="#E8881A" height={195} zeroBaseline={false} fmt={(v) => v.toFixed(4) + "%"} />
        </ChartCard>
        <ChartCard title="Winners / round" subtitle="Avg miners rewarded per round (reset-event count). Full-history; total-miner counts aren't recoverable for closed rounds.">
          <AreaLine
            points={pts.filter((p) => p.avg_winners != null).map((p) => ({ label: lbl(p), value: Number(p.avg_winners) }))}
            height={195} zeroBaseline={false} fmt={(v) => formatNum(v, 0)} />
        </ChartCard>
        <ChartCard title="SOL vaulted (protocol take)" subtitle="Total SOL vaulted (buyback + admin) per bucket.">
          <AreaLine points={mk((p) => lamportsToSol(p.vaulted))} height={195} fmt={(v) => formatSol(v, 1) + " SOL"} yFmt={compactNum} />
        </ChartCard>
        <ChartCard title="Motherlode hits" subtitle="Jackpot drops per bucket (1-in-625/round).">
          <AreaLine points={mk((p) => p.motherlode_hits)} color="#4ADE80" height={195} fmt={(v) => formatNum(v, 0)} />
        </ChartCard>
      </div>
      <Caveats provenance={series.provenance} error={series.error} />
    </div>
  );
}

// ── Motherlode ────────────────────────────────────────────────────────────────
function MotherlodeTab() {
  const [offset, setOffset] = useState(0);
  const ml = usePolled(() => fetchOreMotherlode(PAGE, offset), 20_000, [offset]);
  const d = ml.data;
  const total = d?.total ?? 0;
  const pool = oreGramsToOre(d?.current?.pool_grams);
  const sinceHit = d?.current ? d.current.current_round - (d.current.last_hit_round ?? d.current.current_round) : 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Current pool" value={pool ? formatNum(pool, 1) : "···"} unit="ORE" tone="gold" hint={`+0.2 ORE/round · ${formatNum(sinceHit)} since last hit`} />
        <StatTile label="Odds per round" value="1 : 625" hint="by protocol design" />
        <StatTile label="Last hit" value={d?.current?.last_hit_round ? `#${formatNum(d.current.last_hit_round)}` : "···"} hint="most recent drop" />
        <StatTile label="Total hits" value={formatNum(total)} hint="all-time (≥ 0.2 ORE)" />
      </div>
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
        <Pager offset={offset} total={total} onPage={setOffset} unit="hits" />
      </ChartCard>
      <Caveats provenance={ml.provenance} error={ml.error} />
    </div>
  );
}

// ── Leaderboard: Net-SOL profit ranking + our-pool position ──────────────────
const LB_SORTS: { id: string; label: string }[] = [
  { id: "net_sol", label: "Net SOL" }, { id: "earned", label: "SOL earned" }, { id: "deployed", label: "SOL deployed" },
  { id: "ore", label: "ORE earned" }, { id: "roi", label: "Gross ROI" },
];
const MIN_DEP = [0, 1, 10, 100];
function LeaderboardTab() {
  const [sort, setSort] = useState("net_sol");
  const [minDep, setMinDep] = useState(0);
  const [offset, setOffset] = useState(0);
  const lb = usePolled(() => fetchOreLeaderboard(sort, minDep, offset), 0, [sort, minDep, offset]);
  const d = lb.data;
  const total = d?.total ?? 0;
  const b = d?.bands;
  const op = d?.our_pool;
  const bandRows = b
    ? [
        { label: "#1", value: b.top1 }, { label: "top 5%", value: b.b05 }, { label: "top 10%", value: b.b10 },
        { label: "top 20%", value: b.b20 }, { label: "top 30%", value: b.b30 }, { label: "top 50%", value: b.b50 },
        { label: "all", value: b.avg_all },
      ]
    : [];
  const opNet = lamportsToSol(op?.net_sol);

  return (
    <div className="space-y-5">
      {/* our pool's position — the thing no other tracker shows */}
      {op && (
        <div className="card border-steel/30 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="section-label">Our dORE pool in the field</div>
            <span className="font-mono text-[13px] text-fog-muted">ranked by Net SOL across {formatNum(op.total)} miners</span>
          </div>
          <div className="mt-2 num text-xl gradient-text">#{formatNum(op.rank)}<span className="text-sm text-fog-muted"> / {formatNum(op.total)}</span></div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-0 sm:mt-2 sm:flex sm:flex-wrap sm:gap-x-6">
            {[
              { k: "Net", el: <span className={`num ${netTone(opNet)}`}>{opNet >= 0 ? "+" : ""}{formatSol(opNet, 3)} SOL</span> },
              { k: "deployed", el: <span className="num text-gray-300">{formatSol(lamportsToSol(op.lifetime_deployed), 1)} SOL</span> },
              { k: "earned", el: <span className="num text-gray-300">{formatSol(lamportsToSol(op.lifetime_rewards_sol), 1)} SOL</span> },
              { k: "ORE", el: <span className="num text-gray-300">{formatNum(oreGramsToOre(op.lifetime_rewards_ore), 1)}</span> },
            ].map((m) => (
              <div key={m.k} className="flex items-baseline justify-between gap-2 border-t border-line/50 py-2 font-mono text-xs sm:justify-start sm:border-0 sm:py-0">
                <dt className="text-fog-muted">{m.k}</dt>
                <dd>{m.el}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <ChartCard title="Top miners" subtitle={d?.snapshot_ts ? `Census ${new Date(d.snapshot_ts).toLocaleDateString()} · ranked by ${LB_SORTS.find((x) => x.id === sort)?.label ?? sort}` : "loading census…"}
        right={
          <SegmentedControl
            aria-label="Leaderboard sort"
            variant="loose"
            className="sm:justify-end"
            items={LB_SORTS}
            value={sort}
            onChange={(id) => { setSort(id); setOffset(0); }}
          />
        }>
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
        <div className={tableWrap}>
          <table className="w-full font-mono text-[13px] sm:min-w-[600px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>#</th>
                <th className={th}>Miner</th>
                <th className={`${th} text-right`}>Deployed</th>
                <th className={`${th} text-right`}>Earned</th>
                <th className={`${th} text-right`}>Net SOL</th>
                <th className={`${th} hidden text-right sm:table-cell`}>ORE</th>
                <th className={`${th} hidden text-right sm:table-cell`}>ROI</th>
              </tr>
            </thead>
            <tbody>
              {(d?.top ?? []).map((m, i) => {
                const net = lamportsToSol(m.net_sol);
                return (
                  <tr key={m.authority} className={m.is_ours ? oursRow : bodyRow}>
                    <td className={`${td} text-fog-muted`}>{offset + i + 1}</td>
                    <td className={`${td} ${m.is_ours ? "text-steel" : "text-white"}`} title={m.authority}>{short(m.authority)}{m.is_ours ? " ◆ ours" : ""}</td>
                    <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(m.lifetime_deployed), 1)}</td>
                    <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(m.lifetime_rewards_sol), 1)}</td>
                    <td className={`${td} num text-right ${netTone(net)}`}>{net >= 0 ? "+" : ""}{formatSol(net, 2)}</td>
                    <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatNum(oreGramsToOre(m.lifetime_rewards_ore), 0)}</td>
                    <td className={`${td} hidden num text-right text-gold sm:table-cell`}>{m.roi ? m.roi.toFixed(2) + "×" : "·"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager offset={offset} total={total} onPage={setOffset} unit="miners" />
        <p className="mt-3 max-w-3xl font-mono text-[13px] leading-snug text-fog-muted">
          <span className="text-gray-300">Net SOL</span> = lifetime returned SOL − deployed (real profit, can be negative).
          ROI is the gross returned/deployed ratio. Both from the on-chain returned-SOL watermark (may include stake-back).
        </p>
      </ChartCard>

      <ChartCard title="Gross ROI by percentile band" subtitle={b ? `${formatNum(b.n)} miners with a deploy · a size-neutral view` : ""}>
        {b ? <div className="max-w-3xl"><HBars rows={bandRows} /></div> : <p className="font-mono text-xs text-fog-muted">No census yet.</p>}
      </ChartCard>
      <Caveats provenance={lb.provenance} error={lb.error} />
    </div>
  );
}

// ── Players: competition — top players + "what deploy gets me top-N" ──────────
const COMPETE_WINDOWS = [10, 25, 50];
const RANK_CHOICES = [1, 3, 5, 10, 20];
function PlayersTab() {
  const [rounds, setRounds] = useState(10);
  const [rank, setRank] = useState(10);
  const c = usePolled(() => fetchOreCompetition(rounds), 20_000, [rounds]);
  const d = c.data;
  const thr = d?.thresholds.find((t) => t.rank === rank);
  const n = d?.window.rounds_analyzed ?? 0;
  const cov = d?.latest?.coverage != null ? Math.round(d.latest.coverage * 100) : null;

  return (
    <div className="space-y-5">
      {/* WINDOW control — the analysis window; drives every threshold + the competition table */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] text-fog-muted">
        <span>Analysing the</span>
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
        <span>rounds{n ? ` · ${n} with deploy data` : ""}</span>
      </div>

      {/* headline: pick a RANK → the deploy that reaches it (only affects this number + the highlighted tier row) */}
      <div className="card px-4 py-4">
        <div className="section-label mb-2">To be top-N next round — how much to deploy</div>
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
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-sm text-fog-muted">Deploy</span>
              <span className="num text-3xl gradient-text">≈ {formatSol(thr.median_sol, 3)}<span className="ml-1 text-lg text-fog-muted">SOL</span></span>
              <span className="font-mono text-[13px] text-fog-muted">to crack <span className="text-white">top {rank}</span></span>
            </div>
            <div className="mt-1.5 font-mono text-[13px] leading-snug text-fog-muted">
              median deploy of the #{rank} wallet over the last {n} rounds · range {formatSol(thr.min_sol ?? 0, 3)}–{formatSol(thr.max_sol ?? 0, 3)} SOL · avg {formatSol(thr.avg_sol ?? 0, 3)}
            </div>
          </>
        ) : (
          <div className="font-mono text-sm text-fog-muted">Not enough deploy data for top {rank} over the last {n} rounds.</div>
        )}
      </div>

      {/* price of each tier */}
      <ChartCard title="Price of each tier" subtitle={`Median deploy that landed a wallet at each rank over the last ${n} rounds. Your picked rank is highlighted.`}>
        <div className={tableWrap}>
          <table className="w-full font-mono text-[13px]">
            <thead><tr className={theadRow}>
              <th className={th}>Rank</th>
              <th className={`${th} text-right`}>Median deploy</th>
              <th className={`${th} text-right`}>Range</th>
              <th className={`${th} hidden text-right sm:table-cell`}>Avg</th>
            </tr></thead>
            <tbody>
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
              {(d?.regulars ?? []).map((r, i) => (
                <tr key={r.authority} className={r.is_ours ? oursRow : bodyRow}>
                  <td className={`${td} text-fog-muted`}>{i + 1}</td>
                  <td className={`${td} ${r.is_ours ? "text-steel" : "text-white"}`} title={r.authority}>{short(r.authority)}{r.is_ours ? " ◆ ours" : ""}</td>
                  <td className={`${td} text-right text-gray-300`}>{r.rounds_active}/{n}</td>
                  <td className={`${td} num text-right text-gold`}>{formatSol(r.avg_sol, 3)}</td>
                  <td className={`${td} num hidden text-right text-gray-300 sm:table-cell`}>{formatSol(r.max_sol, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* last round's board */}
      <ChartCard title={d?.latest ? `Last round — #${formatNum(d.latest.round_id)}` : "Last round"}
        subtitle={cov != null ? `Every wallet's deploy this round, ranked. Captured ≈${cov}% of the round's on-chain SOL.` : "Every wallet's deploy in the most recent round, ranked."}>
        <div className={tableWrap}>
          <table className="w-full font-mono text-[13px] sm:min-w-[520px]">
            <thead><tr className={theadRow}>
              <th className={th}>#</th><th className={th}>Wallet</th>
              <th className={`${th} text-right`}>Deployed</th>
              <th className={`${th} hidden text-right sm:table-cell`}>Tiles</th>
              <th className={`${th} hidden text-right sm:table-cell`}>Deploys</th>
            </tr></thead>
            <tbody>
              {(d?.latest?.players ?? []).map((p) => (
                <tr key={p.authority} className={p.is_ours ? oursRow : bodyRow}>
                  <td className={`${td} text-fog-muted`}>{p.rank}</td>
                  <td className={`${td} ${p.is_ours ? "text-steel" : "text-white"}`} title={p.authority}>{short(p.authority)}{p.is_ours ? " ◆ ours" : ""}</td>
                  <td className={`${td} num text-right text-gold`}>{formatSol(lamportsToSol(p.total_sol), 3)} SOL</td>
                  <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{p.tiles}<span className="text-fog-muted">/25</span></td>
                  <td className={`${td} hidden text-right text-gray-400 sm:table-cell`}>{p.deploys}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      <Caveats provenance={c.provenance} error={c.error} />
    </div>
  );
}

// ── Miners: full census explorer ─────────────────────────────────────────────
const MINER_SORTS: { id: string; label: string }[] = [
  { id: "unclaimed", label: "Unclaimed ORE" }, { id: "refined", label: "Refined ORE" },
  { id: "lifetime_ore", label: "Lifetime ORE" }, { id: "lifetime_sol", label: "Lifetime SOL" },
  { id: "net_sol", label: "Net SOL" }, { id: "deployed", label: "Deployed" },
];
function MinersTab() {
  const [sort, setSort] = useState("unclaimed");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setOffset(0); }, 350);
    return () => clearTimeout(t);
  }, [qInput]);
  const m = usePolled(() => fetchOreMiners({ sort, offset, q, limit: PAGE }), 0, [sort, offset, q]);
  const d = m.data;
  const total = d?.total ?? 0;

  return (
    <div className="space-y-5">
      <ChartCard
        title="All miners"
        subtitle={d?.snapshot_ts ? `Census snapshot ${new Date(d.snapshot_ts).toLocaleDateString()} · ${formatNum(total)} miners` : "loading…"}
        right={
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="search address…"
            className="w-full rounded-md border border-line bg-ink-800 px-2.5 py-1.5 font-mono text-[13px] text-white placeholder:text-fog-muted focus:border-steel focus:outline-none sm:w-64" />
        }>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 font-mono text-[13px] text-fog-muted">sort:</span>
          <SegmentedControl
            aria-label="Miner sort"
            variant="loose"
            items={MINER_SORTS}
            value={sort}
            onChange={(id) => { setSort(id); setOffset(0); }}
          />
        </div>
        <div className={tableWrap}>
          <table className="w-full font-mono text-[13px] sm:min-w-[640px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>#</th>
                <th className={th}>Miner</th>
                <th className={`${th} text-right`}>Unclaimed ORE</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Refined ORE</th>
                <th className={`${th} text-right`}>Lifetime SOL</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Lifetime ORE</th>
                <th className={`${th} text-right`}>Net SOL</th>
              </tr>
            </thead>
            <tbody>
              {(d?.miners ?? []).map((mn, i) => {
                const net = lamportsToSol(mn.net_sol);
                return (
                  <tr key={mn.authority} className={mn.is_ours ? oursRow : bodyRow}>
                    <td className={`${td} text-fog-muted`}>{offset + i + 1}</td>
                    <td className={`${td} ${mn.is_ours ? "text-steel" : "text-white"}`} title={mn.authority}>{short(mn.authority)}{mn.is_ours ? " ◆ ours" : ""}</td>
                    <td className={`${td} text-right text-gray-300`}>{formatNum(oreGramsToOre(mn.unclaimed_ore), 2)}</td>
                    <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatNum(oreGramsToOre(mn.refined_ore), 2)}</td>
                    <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(mn.lifetime_sol), 1)}</td>
                    <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatNum(oreGramsToOre(mn.lifetime_ore), 1)}</td>
                    <td className={`${td} num text-right ${netTone(net)}`}>{net >= 0 ? "+" : ""}{formatSol(net, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager offset={offset} total={total} onPage={setOffset} unit="miners" />
      </ChartCard>
      <Caveats provenance={m.provenance} error={m.error} />
    </div>
  );
}

// ── Rounds: recent spine table ───────────────────────────────────────────────
function RoundsTab() {
  const [offset, setOffset] = useState(0);
  const rounds = usePolled(() => fetchOreRounds(PAGE, offset), 20_000, [offset]);
  const rs = rounds.data?.rounds ?? [];
  const total = rounds.data?.total ?? 0;
  return (
    <div className="space-y-5">
      <ChartCard title="Recent rounds" subtitle="The round spine — newest first. Split = jackpot shared across winners. ★ = motherlode hit.">
        <div className={tableWrap}>
          <table className="w-full font-mono text-[13px] sm:min-w-[560px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Round</th>
                <th className={`${th} text-right`}>Deployed</th>
                <th className={`${th} text-right`}>Miners</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Tile</th>
                <th className={`${th} text-right`}>Winner</th>
                <th className={`${th} hidden text-right sm:table-cell`}>Rake</th>
                <th className={`${th} text-right`}>ML</th>
              </tr>
            </thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.round_id} className={bodyRow}>
                  <td className={`${td} text-white`}>#{formatNum(Number(r.round_id))}</td>
                  <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(r.total_deployed), 2)}</td>
                  <td className={`${td} text-right text-gray-300`}>{r.total_miners ? formatNum(Number(r.total_miners)) : "·"}</td>
                  <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{r.winning_tile != null ? `#${r.winning_tile + 1}` : "·"}</td>
                  <td className={`${td} text-right text-gray-300`}>{r.is_split ? "split" : short(r.top_miner)}</td>
                  <td className={`${td} hidden text-right text-gray-400 sm:table-cell`}>{r.winning_tile != null && r.effective_rake_bps ? formatPct(bpsToPct(r.effective_rake_bps) / 100, 1) : "·"}</td>
                  <td className={`${td} text-right`}>{Number(r.motherlode_paid ?? 0) >= 2e10 ? <span className="text-gold">★</span> : <span className="text-fog-muted">·</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager offset={offset} total={total} onPage={setOffset} unit="rounds" />
      </ChartCard>
      <Caveats provenance={rounds.provenance} error={rounds.error} />
    </div>
  );
}

// ── caveats / provenance footer ──────────────────────────────────────────────
function Caveats({ provenance, error }: { provenance: any; error: string | null }) {
  if (error) {
    return (
      <div className="card border-amber/30 px-4 py-3 font-mono text-[13px] text-amber">
        {error}
        {" "}The ORE ingest may be disabled or the free-tier host may be waking up.
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
