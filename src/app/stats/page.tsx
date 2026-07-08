"use client";

/**
 * /stats — the ORE-ecosystem Stats page.
 *
 * ORE-first: the whole ORE game (emission, rake, motherlode, competition,
 * leaderboard, production cost) with OUR dORE pool woven in as our slice of the
 * field. Serves a live "daily-joe" hero band (via the analytics WebSocket) AND
 * financial-analyst tabs. ZINC is a placeholder for v1. Native units; USD is a
 * labelled off-chain overlay.
 */
import { useEffect, useMemo, useState } from "react";
import { StatTile, StatRow } from "@/components/primitives/Stat";
import { TileHeatmap } from "@/components/TileHeatmap";
import { AreaLine, HBars, ChartCard, type Pt } from "@/components/stats/Charts";
import { useOreLive } from "@/hooks/useOreLive";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchOreSummary, fetchStatsOverview, fetchOreRounds, fetchOreMotherlode, fetchOreLeaderboard,
  fetchOreMiners, fetchOreSeries,
  lamportsToSol, oreGramsToOre, bpsToPct,
  type OreRound, type OreSeriesPoint,
} from "@/lib/oreStats";
import { formatSol, formatNum, formatPct } from "@/lib/format";

type Token = "ORE" | "ZINC";
type Tab = "overview" | "trends" | "motherlode" | "leaderboard" | "miners" | "rounds";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "trends", label: "Trends" },
  { id: "motherlode", label: "Motherlode" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "miners", label: "Miners" },
  { id: "rounds", label: "Rounds" },
];

const short = (a?: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "—");

// Table styling mirrors the Position page's WalletAnalytics tables 1:1.
const tableWrap = "overflow-x-auto rounded-lg bg-white/[0.02]";
const theadRow = "bg-ink-800/60 text-left text-fog-muted";
const th = "px-2.5 py-1.5 font-normal";
const td = "px-2.5 py-1.5";
const bodyRow = "transition-colors hover:bg-white/[0.03]";
const oursRow = "bg-[rgba(157,183,216,0.12)] transition-colors";

const solOf = (grams?: string | null) => oreGramsToOre(grams); // ORE grams -> ORE
const netTone = (v: number) => (v > 0 ? "text-pos" : v < 0 ? "text-red" : "text-gray-300");

export default function StatsPage() {
  const [token, setToken] = useState<Token>("ORE");
  const [tab, setTab] = useState<Tab>("overview");
  const live = useOreLive();

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Stats</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-fog-dim">
            The ORE ecosystem end-to-end — emission, rake, the motherlode, board competition, production
            cost, and the miner leaderboard — with our own dORE pool woven in as our slice of the field.
          </p>
        </div>
        <div className="flex rounded-lg border border-line bg-ink-800 p-1">
          {(["ORE", "ZINC"] as Token[]).map((t) => (
            <button key={t} onClick={() => setToken(t)}
              className={`rounded-md px-4 py-1.5 font-mono text-xs transition ${
                token === t ? "bg-ink-600 text-white shadow-glow-gold" : "text-fog-muted hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
      </header>

      {token === "ZINC" ? (
        <ZincPlaceholder />
      ) : (
        <>
          <HeroBand live={live} />
          <div className="flex flex-wrap gap-1.5 border-b border-line pb-2">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs transition ${
                  tab === t.id ? "bg-ink-700 text-white" : "text-fog-muted hover:bg-ink-800 hover:text-white"}`}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === "overview" && <OverviewTab />}
          {tab === "trends" && <TrendsTab />}
          {tab === "motherlode" && <MotherlodeTab />}
          {tab === "leaderboard" && <LeaderboardTab />}
          {tab === "miners" && <MinersTab />}
          {tab === "rounds" && <RoundsTab />}
        </>
      )}
    </div>
  );
}

// ── Live daily-joe hero band ─────────────────────────────────────────────────
function HeroBand({ live }: { live: ReturnType<typeof useOreLive> }) {
  const summary = usePolled(fetchOreSummary, 15_000);
  const s = summary.data;
  const r = live.round;

  const board = useMemo(() => {
    const dep = (r?.deployed ?? []).map((x) => lamportsToSol(x));
    const cnt = (r?.count ?? []).map((x) => Number(x));
    return { dep, cnt };
  }, [r]);

  const roundId = r?.round_id ?? (s?.latest_round?.round_id ?? null);
  const miners = r ? Number(r.total_miners ?? 0) : Number(s?.latest_round?.total_miners ?? 0);
  const deployed = r ? lamportsToSol(r.total_deployed) : lamportsToSol(s?.latest_round?.total_deployed);
  const solPerMiner = miners > 0 ? deployed / miners : 0;
  const mlPool = oreGramsToOre(s?.motherlode?.pool_grams);
  const cumMinted = oreGramsToOre(s?.cumulative?.cumulative_minted);
  const avgRake = bpsToPct(s?.averages?.avg_rake_bps);
  const price = s?.prices;

  // cost per ORE = SOL vaulted / ORE minted (recent window). Compared to the ORE
  // price to reveal the real margin — the "is mining profitable?" read.
  const costPerOre = s?.cost && Number(s.cost.minted) > 0 ? lamportsToSol(s.cost.vaulted) / oreGramsToOre(s.cost.minted) : 0;
  const oreSol = price && price.sol_usd > 0 ? price.ore_usd / price.sol_usd : 0;
  const overPct = oreSol > 0 && costPerOre > 0 ? (costPerOre / oreSol - 1) * 100 : 0;

  const spread = board.dep.length ? Math.max(...board.dep) - Math.min(...board.dep) : 0;
  const hottest = board.dep.length ? board.dep.indexOf(Math.max(...board.dep)) : -1;
  const hottestSol = hottest >= 0 ? board.dep[hottest] : 0;
  const pot = r ? lamportsToSol(r.total_winnings) : 0;
  const vault = r ? lamportsToSol(r.total_vaulted) : 0;
  const topMiner = r?.top_miner ?? null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${live.connected ? "animate-pulse-dot bg-pos" : "bg-fog-muted"}`} />
        <span className="font-mono text-[11px] text-fog-muted">
          {live.connected ? "LIVE — streaming from analytics" : "connecting to live stream…"}
          {price && (
            <span className="ml-2 text-fog-dim">
              · ORE ${price.ore_usd.toFixed(2)} · SOL ${price.sol_usd.toFixed(2)} <span className="text-fog-muted">(off-chain)</span>
            </span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Current round" value={roundId != null ? `#${formatNum(Number(roundId))}` : "···"} tone="gold" hint={live.connected ? "live" : "last seen"} />
        <StatTile label="Miners this round" value={miners ? formatNum(miners) : "···"} hint="deploying now" />
        <StatTile label="SOL deployed" value={deployed ? formatSol(deployed, 2) : "···"} unit="SOL" hint="this round" />
        <StatTile label="SOL / miner" value={solPerMiner ? formatSol(solPerMiner, 3) : "···"} unit="SOL" hint="avg stake" />
        <StatTile label="Motherlode pool" value={mlPool ? formatNum(mlPool, 1) : "···"} unit="ORE" tone="silver" hint="waiting to drop (1-in-625)" />
        <StatTile label="Avg effective rake" value={avgRake ? formatPct(avgRake / 100, 2) : "···"} hint="1% admin + ~9.9% buyback" />
        <StatTile
          label="Cost / ORE"
          value={costPerOre ? formatSol(costPerOre, 3) : "···"}
          unit="SOL"
          hint={oreSol > 0 && costPerOre > 0 ? (
            <>vs {formatSol(oreSol, 3)} SOL price · <span className={overPct > 0 ? "text-red" : "text-pos"}>{overPct > 0 ? "+" : ""}{overPct.toFixed(0)}% {overPct > 0 ? "over" : "under"}</span></>
          ) : "SOL vaulted / ORE minted"}
        />
        <StatTile label="ORE minted" value={cumMinted ? formatNum(cumMinted, 0) : "···"} unit="ORE" hint="cumulative, all rounds" />
      </div>

      {/* live board + live-round detail */}
      <ChartCard
        title="Live board — SOL per tile"
        subtitle="Exact per-tile deploys for the current round (live Round PDA). Intensity = SOL; number = miners."
        right={<span className="font-mono text-[11px] text-fog-muted">{r ? `round #${formatNum(Number(r.round_id))}` : ""}</span>}
      >
        <div className="grid gap-x-8 gap-y-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="w-full max-w-[340px]">
            <TileHeatmap perTileSol={board.dep} perTileCount={board.cnt} />
          </div>
          <div className="flex flex-col justify-center gap-1.5">
            <div className="section-label mb-1">This round</div>
            <StatRow k="Hottest tile" v={hottest >= 0 ? `#${hottest + 1}` : "·"} unit={hottest >= 0 ? `${formatSol(hottestSol, 3)} SOL` : ""} />
            <StatRow k="Spread (top ↔ least)" v={formatSol(spread, 3)} unit="SOL" />
            <StatRow k="Pot (winnings)" v={formatSol(pot, 2)} unit="SOL" />
            <StatRow k="Vaulted this round" v={formatSol(vault, 4)} unit="SOL" sub="the round's protocol take (buyback + admin)" />
            <StatRow k="Solo winner (so far)" v={short(topMiner)} />
          </div>
        </div>
      </ChartCard>
    </section>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function toSeries(rounds: OreRound[], pick: (r: OreRound) => number): Pt[] {
  return [...rounds].reverse().map((r) => ({ label: `#${r.round_id}`, value: pick(r) }));
}
function completeRounds(rounds: OreRound[]): OreRound[] {
  return rounds.filter((r) => r.winning_tile != null && Number(r.total_deployed ?? 0) > 1_000_000_000);
}

// ── Overview: our-pool weave + headline emission ─────────────────────────────
function OverviewTab() {
  const ov = usePolled(fetchStatsOverview, 15_000);
  const rounds = usePolled(() => fetchOreRounds(200, 0), 30_000);
  const d = ov.data;
  const our = d?.our_dore_pool;
  const ourDeployed = lamportsToSol(our?.sol_deployed_gross);
  const ourRecovered = lamportsToSol(our?.sol_recovered);
  const ourPnl = ourRecovered - ourDeployed;
  const rs = rounds.data?.rounds ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card px-4 py-4 lg:col-span-2">
          <div className="section-label mb-1">Our dORE pool — our slice of the ORE field</div>
          <p className="mb-3 font-mono text-[11px] leading-snug text-fog-muted">
            Reconstructed from the cwr_vault program (bucket 0). This is the vault&apos;s own participation
            in the ORE game above — cycles mined, SOL worked, SOL recovered — not the protocol-wide numbers.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile variant="inset" label="Cycles mined" value={formatNum(our?.cycles ?? 0)} />
            <StatTile variant="inset" label="SOL deployed" value={formatSol(ourDeployed, 2)} unit="SOL" />
            <StatTile variant="inset" label="SOL recovered" value={formatSol(ourRecovered, 2)} unit="SOL" />
            <StatTile variant="inset" label="Net mining PnL" value={formatSol(ourPnl, 3)} unit="SOL" tone={ourPnl >= 0 ? "silver" : undefined} />
          </div>
          <div className="mt-3">
            <StatTile variant="inset" label="Active LPs" value={formatNum(our?.active_wallets ?? 0)} hint="wallets with shares" className="max-w-[180px]" />
          </div>
        </div>
        <ChartCard title="Total ORE minted" subtitle="Cumulative emission (~1.2 ORE / round). Zoomed to the window so the slope shows.">
          <AreaLine points={toSeries(rs, (r) => oreGramsToOre(r.cumulative_minted))} zeroBaseline={false} fmt={(v) => formatNum(v, 0) + " ORE"} />
        </ChartCard>
      </div>
      <Caveats provenance={ov.provenance} error={ov.error} />
    </div>
  );
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
        <div className="flex rounded-lg border border-line bg-ink-800 p-0.5">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)}
              className={`rounded-md px-2.5 py-1 font-mono text-[11px] transition ${
                range === r.id ? "bg-ink-600 text-white" : "text-fog-muted hover:text-white"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="SOL deployed" subtitle="Total SOL staked per bucket.">
          <AreaLine points={mk((p) => lamportsToSol(p.deployed))} height={170} fmt={(v) => formatSol(v, 0) + " SOL"} />
        </ChartCard>
        <ChartCard title="Cost per ORE" subtitle="SOL vaulted ÷ ORE minted — the production cost.">
          <AreaLine points={mk(costOf)} color="#E8881A" height={170} zeroBaseline={false} fmt={(v) => formatSol(v, 3) + " SOL"} />
        </ChartCard>
        <ChartCard title="Effective rake" subtitle="Protocol take % per bucket (1% admin + ~9.9% buyback).">
          <AreaLine points={mk((p) => (p.avg_rake_bps ?? 0) / 100)} color="#E8881A" height={170} zeroBaseline={false} fmt={(v) => v.toFixed(2) + "%"} />
        </ChartCard>
        <ChartCard title="Unique miners" subtitle="Average miners per round in the bucket.">
          <AreaLine points={mk((p) => Number(p.avg_miners ?? 0))} height={170} zeroBaseline={false} fmt={(v) => formatNum(v, 0)} />
        </ChartCard>
        <ChartCard title="SOL vaulted (protocol take)" subtitle="Total SOL vaulted (buyback + admin) per bucket.">
          <AreaLine points={mk((p) => lamportsToSol(p.vaulted))} height={170} fmt={(v) => formatSol(v, 1) + " SOL"} />
        </ChartCard>
        <ChartCard title="Motherlode hits" subtitle="Jackpot drops per bucket (1-in-625/round).">
          <AreaLine points={mk((p) => p.motherlode_hits)} color="#4ADE80" height={170} fmt={(v) => formatNum(v, 0)} />
        </ChartCard>
      </div>
      <Caveats provenance={series.provenance} error={series.error} />
    </div>
  );
}

// ── Motherlode ────────────────────────────────────────────────────────────────
function MotherlodeTab() {
  const ml = usePolled(fetchOreMotherlode, 20_000);
  const d = ml.data;
  const pool = oreGramsToOre(d?.current?.pool_grams);
  const sinceHit = d?.current ? d.current.current_round - (d.current.last_hit_round ?? d.current.current_round) : 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Current pool" value={pool ? formatNum(pool, 1) : "···"} unit="ORE" tone="gold" hint={`+0.2 ORE/round · ${formatNum(sinceHit)} since last hit`} />
        <StatTile label="Odds per round" value="1 : 625" hint="by protocol design" />
        <StatTile label="Last hit" value={d?.current?.last_hit_round ? `#${formatNum(d.current.last_hit_round)}` : "···"} hint="most recent drop" />
        <StatTile label="Recent hits" value={formatNum(d?.recent_hits?.length ?? 0)} hint="last 100 tracked" />
      </div>
      <ChartCard title="Recent motherlode drops" subtitle="Each hit pays the whole pool out and resets it to 0; it rebuilds at +0.2 ORE/round.">
        <div className={tableWrap}>
          <table className="w-full min-w-[360px] font-mono text-[11px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Round</th>
                <th className={`${th} text-right`}>ORE paid</th>
                <th className={`${th} text-right`}>Rounds since prev</th>
              </tr>
            </thead>
            <tbody>
              {(d?.recent_hits ?? []).slice(0, 25).map((h, i, arr) => {
                const prev = arr[i + 1];
                const gap = prev ? h.round_id - prev.round_id : null;
                return (
                  <tr key={h.round_id} className={bodyRow}>
                    <td className={`${td} text-white`}>#{formatNum(Number(h.round_id))}</td>
                    <td className={`${td} num text-right text-gold`}>{formatNum(solOf(h.motherlode_paid), 1)}</td>
                    <td className={`${td} text-right text-gray-400`}>{gap != null ? formatNum(gap) : "·"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
  const lb = usePolled(() => fetchOreLeaderboard(sort, minDep), 0, [sort, minDep]);
  const d = lb.data;
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
            <span className="font-mono text-[11px] text-fog-muted">ranked by Net SOL across {formatNum(op.total)} miners</span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="num text-xl gradient-text">#{formatNum(op.rank)}<span className="text-sm text-fog-muted"> / {formatNum(op.total)}</span></span>
            <span className="font-mono text-xs text-fog-muted">Net <span className={`num ${netTone(opNet)}`}>{opNet >= 0 ? "+" : ""}{formatSol(opNet, 3)} SOL</span></span>
            <span className="font-mono text-xs text-fog-muted">deployed <span className="num text-gray-300">{formatSol(lamportsToSol(op.lifetime_deployed), 1)}</span></span>
            <span className="font-mono text-xs text-fog-muted">earned <span className="num text-gray-300">{formatSol(lamportsToSol(op.lifetime_rewards_sol), 1)}</span></span>
            <span className="font-mono text-xs text-fog-muted">ORE <span className="num text-gray-300">{formatNum(oreGramsToOre(op.lifetime_rewards_ore), 1)}</span></span>
          </div>
        </div>
      )}

      <ChartCard title="Top miners" subtitle={d?.snapshot_ts ? `Census ${new Date(d.snapshot_ts).toLocaleDateString()} · ranked by ${LB_SORTS.find((x) => x.id === sort)?.label ?? sort}` : "loading census…"}
        right={
          <div className="flex flex-wrap items-center justify-end gap-1">
            {LB_SORTS.map((o) => (
              <button key={o.id} onClick={() => setSort(o.id)}
                className={`rounded-md px-2 py-1 font-mono text-[10.5px] transition ${sort === o.id ? "bg-ink-600 text-white" : "text-fog-muted hover:text-white"}`}>{o.label}</button>
            ))}
          </div>
        }>
        <div className="mb-3 flex items-center gap-2 font-mono text-[11px] text-fog-muted">
          <span>min deployed:</span>
          {MIN_DEP.map((v) => (
            <button key={v} onClick={() => setMinDep(v)}
              className={`rounded px-2 py-0.5 transition ${minDep === v ? "bg-ink-600 text-white" : "hover:text-white"}`}>{v === 0 ? "any" : `${v} SOL`}</button>
          ))}
        </div>
        <div className={tableWrap}>
          <table className="w-full min-w-[600px] font-mono text-[11px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>#</th>
                <th className={th}>Miner</th>
                <th className={`${th} text-right`}>Deployed</th>
                <th className={`${th} text-right`}>Earned</th>
                <th className={`${th} text-right`}>Net SOL</th>
                <th className={`${th} text-right`}>ORE</th>
                <th className={`${th} text-right`}>ROI</th>
              </tr>
            </thead>
            <tbody>
              {(d?.top ?? []).map((m, i) => {
                const net = lamportsToSol(m.net_sol);
                return (
                  <tr key={m.authority} className={m.is_ours ? oursRow : bodyRow}>
                    <td className={`${td} text-fog-muted`}>{i + 1}</td>
                    <td className={`${td} ${m.is_ours ? "text-steel" : "text-white"}`} title={m.authority}>{short(m.authority)}{m.is_ours ? " ◆ ours" : ""}</td>
                    <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(m.lifetime_deployed), 1)}</td>
                    <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(m.lifetime_rewards_sol), 1)}</td>
                    <td className={`${td} num text-right ${netTone(net)}`}>{net >= 0 ? "+" : ""}{formatSol(net, 2)}</td>
                    <td className={`${td} text-right text-gray-300`}>{formatNum(oreGramsToOre(m.lifetime_rewards_ore), 0)}</td>
                    <td className={`${td} num text-right text-gold`}>{m.roi ? m.roi.toFixed(2) + "×" : "·"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl font-mono text-[11px] leading-snug text-fog-muted">
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
  const m = usePolled(() => fetchOreMiners({ sort, offset, q, limit: 50 }), 0, [sort, offset, q]);
  const d = m.data;
  const total = d?.total ?? 0;
  const page = Math.floor(offset / 50) + 1;
  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-5">
      <ChartCard
        title="All miners"
        subtitle={d?.snapshot_ts ? `Census snapshot ${new Date(d.snapshot_ts).toLocaleDateString()} · ${formatNum(total)} miners` : "loading…"}
        right={
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="search address…"
            className="w-40 rounded-md border border-line bg-ink-800 px-2.5 py-1 font-mono text-[11px] text-white placeholder:text-fog-muted focus:border-steel focus:outline-none" />
        }>
        <div className="mb-3 flex flex-wrap items-center gap-1">
          <span className="mr-1 font-mono text-[11px] text-fog-muted">sort:</span>
          {MINER_SORTS.map((o) => (
            <button key={o.id} onClick={() => { setSort(o.id); setOffset(0); }}
              className={`rounded-md px-2 py-1 font-mono text-[10.5px] transition ${sort === o.id ? "bg-ink-600 text-white" : "text-fog-muted hover:text-white"}`}>{o.label}</button>
          ))}
        </div>
        <div className={tableWrap}>
          <table className="w-full min-w-[640px] font-mono text-[11px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>#</th>
                <th className={th}>Miner</th>
                <th className={`${th} text-right`}>Unclaimed ORE</th>
                <th className={`${th} text-right`}>Refined ORE</th>
                <th className={`${th} text-right`}>Lifetime SOL</th>
                <th className={`${th} text-right`}>Lifetime ORE</th>
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
                    <td className={`${td} text-right text-gray-300`}>{formatNum(oreGramsToOre(mn.refined_ore), 2)}</td>
                    <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(mn.lifetime_sol), 1)}</td>
                    <td className={`${td} text-right text-gray-300`}>{formatNum(oreGramsToOre(mn.lifetime_ore), 1)}</td>
                    <td className={`${td} num text-right ${netTone(net)}`}>{net >= 0 ? "+" : ""}{formatSol(net, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-fog-muted">
          <span>page {formatNum(page)} / {formatNum(pages)}</span>
          <div className="flex gap-2">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}
              className="rounded border border-line px-2.5 py-1 disabled:opacity-40 enabled:hover:text-white">Prev</button>
            <button disabled={page >= pages} onClick={() => setOffset(offset + 50)}
              className="rounded border border-line px-2.5 py-1 disabled:opacity-40 enabled:hover:text-white">Next</button>
          </div>
        </div>
      </ChartCard>
      <Caveats provenance={m.provenance} error={m.error} />
    </div>
  );
}

// ── Rounds: recent spine table ───────────────────────────────────────────────
function RoundsTab() {
  const rounds = usePolled(() => fetchOreRounds(100, 0), 20_000);
  const rs = rounds.data?.rounds ?? [];
  return (
    <div className="space-y-5">
      <ChartCard title="Recent rounds" subtitle="The round spine — newest first. Split = jackpot shared across winners. ★ = motherlode hit.">
        <div className={tableWrap}>
          <table className="w-full min-w-[620px] font-mono text-[11px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Round</th>
                <th className={`${th} text-right`}>Deployed</th>
                <th className={`${th} text-right`}>Miners</th>
                <th className={`${th} text-right`}>Tile</th>
                <th className={`${th} text-right`}>Winner</th>
                <th className={`${th} text-right`}>Rake</th>
                <th className={`${th} text-right`}>ML</th>
              </tr>
            </thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.round_id} className={bodyRow}>
                  <td className={`${td} text-white`}>#{formatNum(Number(r.round_id))}</td>
                  <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(r.total_deployed), 2)}</td>
                  <td className={`${td} text-right text-gray-300`}>{r.total_miners ? formatNum(Number(r.total_miners)) : "·"}</td>
                  <td className={`${td} text-right text-gray-300`}>{r.winning_tile != null ? `#${r.winning_tile + 1}` : "·"}</td>
                  <td className={`${td} text-right text-gray-300`}>{r.is_split ? "split" : short(r.top_miner)}</td>
                  <td className={`${td} text-right text-gray-400`}>{r.winning_tile != null && r.effective_rake_bps ? formatPct(bpsToPct(r.effective_rake_bps) / 100, 1) : "·"}</td>
                  <td className={`${td} text-right`}>{r.motherlode_hit ? <span className="text-gold">★</span> : <span className="text-fog-muted">·</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      <Caveats provenance={rounds.provenance} error={rounds.error} />
    </div>
  );
}

// ── caveats / provenance footer ──────────────────────────────────────────────
function Caveats({ provenance, error }: { provenance: any; error: string | null }) {
  if (error) {
    return (
      <div className="card border-amber/30 px-4 py-3 font-mono text-[11px] text-amber">
        {error}
        {" "}The ORE ingest may be disabled or the free-tier host may be waking up.
      </div>
    );
  }
  if (!provenance) return null;
  return (
    <details className="card px-4 py-3">
      <summary className="cursor-pointer select-none font-mono text-[11px] text-fog-muted">
        data &amp; caveats · spine → #{formatNum(Number(provenance.ore_max_round || 0))}
        {provenance.census_snapshot_ts ? ` · census ${new Date(provenance.census_snapshot_ts).toLocaleDateString()}` : ""}
        {provenance.ingest_enabled ? "" : " · ingest OFF"}
      </summary>
      <ul className="mt-2 space-y-1.5">
        {(provenance.caveats ?? []).map((c: string, i: number) => (
          <li key={i} className="font-mono text-[11px] leading-snug text-fog-muted">• {c}</li>
        ))}
      </ul>
    </details>
  );
}

// ── ZINC placeholder (v1 stub) ───────────────────────────────────────────────
function ZincPlaceholder() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Round", accent: true }, { label: "Miners", hint: "this round" }, { label: "ZINC / round", unit: "ZINC" },
          { label: "Board tiles", hint: "30-tile" }, { label: "Emission", unit: "ZINC" }, { label: "Our dZINC pool", hint: "bucket 1" },
        ].map((t) => (
          <div key={t.label} className="card px-4 py-3.5">
            <div className="label">{t.label}</div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className={`num text-xl ${t.accent ? "gradient-text" : "text-white"}`}>···</span>
              {t.unit && <span className="font-mono text-xs text-fog-muted">{t.unit}</span>}
            </div>
            {t.hint && <div className="mt-0.5 font-mono text-[12px] text-fog-muted">{t.hint}</div>}
          </div>
        ))}
      </div>
      <div className="card border-amber/30">
        <h3 className="font-display text-base font-semibold text-white">ZINC stats are coming</h3>
        <p className="mt-2 max-w-2xl font-mono text-[12px] leading-relaxed text-fog-muted">
          The ORE side ships first. ZINC ecosystem analytics are greenfield — the same pipeline will be
          cloned for the 30-tile ZINC game and our dZINC pool. Toggle back to <span className="text-white">ORE</span> for the live picture.
        </p>
      </div>
    </>
  );
}
