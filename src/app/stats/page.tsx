"use client";

/**
 * /stats — the ORE-ecosystem Stats page.
 *
 * ORE-first: the whole ORE game (emission, rake, motherlode, RNG fairness,
 * competition, leaderboard) with OUR dORE pool woven in as our slice of the field.
 * Serves BOTH a casual "daily-joe" hero band (live via the analytics WebSocket)
 * AND financial-analyst tabs. ZINC is a placeholder tab for v1 (ZINC analytics
 * are greenfield). Native units everywhere; USD is a labelled off-chain overlay.
 */
import { useMemo, useState } from "react";
import { StatTile, StatRow } from "@/components/primitives/Stat";
import { TileHeatmap } from "@/components/TileHeatmap";
import { AreaLine, Bars, HBars, ChartCard, type Pt } from "@/components/stats/Charts";
import { useOreLive } from "@/hooks/useOreLive";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchOreSummary, fetchStatsOverview, fetchOreRounds, fetchOreRng, fetchOreMotherlode, fetchOreLeaderboard,
  lamportsToSol, oreGramsToOre, bpsToPct,
  type OreRound,
} from "@/lib/oreStats";
import { formatSol, formatNum, formatPct } from "@/lib/format";

type Token = "ORE" | "ZINC";
type Tab = "overview" | "rounds" | "fairness" | "economics" | "motherlode" | "leaderboard";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "economics", label: "Rake & Emission" },
  { id: "motherlode", label: "Motherlode" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "rounds", label: "Rounds" },
  { id: "fairness", label: "RNG Fairness" },
];

const short = (a?: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "—");

// Table styling mirrors the Position page's WalletAnalytics tables 1:1.
const tableWrap = "overflow-x-auto rounded-lg bg-white/[0.02]";
const theadRow = "bg-ink-800/60 text-left text-fog-muted";
const th = "px-2.5 py-1.5 font-normal";
const td = "px-2.5 py-1.5";
const bodyRow = "transition-colors hover:bg-white/[0.03]";

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
            The ORE ecosystem end-to-end — emission, rake, the motherlode, board competition, and the
            miner leaderboard — with our own dORE pool woven in as our slice of the field.
          </p>
        </div>
        {/* ORE / ZINC toggle */}
        <div className="flex rounded-lg border border-line bg-ink-800 p-1">
          {(["ORE", "ZINC"] as Token[]).map((t) => (
            <button
              key={t}
              onClick={() => setToken(t)}
              className={`rounded-md px-4 py-1.5 font-mono text-xs transition ${
                token === t ? "bg-ink-600 text-white shadow-glow-gold" : "text-fog-muted hover:text-white"
              }`}
            >
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

          {/* analyst tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-line pb-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs transition ${
                  tab === t.id ? "bg-ink-700 text-white" : "text-fog-muted hover:bg-ink-800 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <OverviewTab />}
          {tab === "economics" && <EconomicsTab />}
          {tab === "motherlode" && <MotherlodeTab />}
          {tab === "leaderboard" && <LeaderboardTab />}
          {tab === "rounds" && <RoundsTab />}
          {tab === "fairness" && <FairnessTab />}
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
  const rounds = Number(s?.averages?.rounds ?? 0);
  const price = s?.prices;

  // live board detail (fills the space beside the 340px board)
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
        <StatTile label="ORE minted" value={cumMinted ? formatNum(cumMinted, 0) : "···"} unit="ORE" hint="cumulative, all rounds" />
        <StatTile label="Rounds tracked" value={rounds ? formatNum(rounds) : "···"} hint="full spine" />
      </div>

      {/* live board + live-round detail (the detail fills what was empty space) */}
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

// ── helpers to turn the spine into chart series (API returns newest-first) ───
function toSeries(rounds: OreRound[], pick: (r: OreRound) => number): Pt[] {
  return [...rounds].reverse().map((r) => ({ label: `#${r.round_id}`, value: pick(r) }));
}
/** Completed, non-degenerate rounds only — drops the in-progress round (no winning
 *  tile yet, deployed≈0, which crashed the trend to 0 at the newest tick) and the
 *  odd sub-1-SOL round that inflated the rake axis. */
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

// ── Economics: rake + emission over recent rounds ────────────────────────────
function EconomicsTab() {
  const rounds = usePolled(() => fetchOreRounds(300, 0), 30_000);
  const rs = completeRounds(rounds.data?.rounds ?? []);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Effective rake" subtitle="Per-round protocol take = 1% admin + ~9.9% buyback. Completed rounds, oldest → newest.">
          <AreaLine points={toSeries(rs, (r) => bpsToPct(r.effective_rake_bps))} color="#E8881A" height={175} fmt={(v) => v.toFixed(2) + "%"} />
        </ChartCard>
        <ChartCard title="SOL deployed per round" subtitle="Total SOL staked across all 25 tiles each round.">
          <AreaLine points={toSeries(rs, (r) => lamportsToSol(r.total_deployed))} height={175} fmt={(v) => formatSol(v, 1) + " SOL"} />
        </ChartCard>
      </div>
      <Caveats provenance={rounds.provenance} error={rounds.error} />
    </div>
  );
}

// ── Motherlode: pool + recent hits ───────────────────────────────────────────
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
      <ChartCard title="Recent motherlode drops" subtitle="Each hit pays the whole pool out and resets it to 0; it then rebuilds at +0.2 ORE/round.">
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
                    <td className={`${td} num text-right text-gold`}>{formatNum(oreGramsToOre(h.motherlode_paid), 1)}</td>
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

// ── Leaderboard: census ROI bands + top miners ───────────────────────────────
function LeaderboardTab() {
  const lb = usePolled(fetchOreLeaderboard, 0);
  const d = lb.data;
  const b = d?.bands;
  const bandRows = b
    ? [
        { label: "#1", value: b.top1 },
        { label: "top 5%", value: b.b05 },
        { label: "top 10%", value: b.b10 },
        { label: "top 20%", value: b.b20 },
        { label: "top 30%", value: b.b30 },
        { label: "top 50%", value: b.b50 },
        { label: "all", value: b.avg_all },
      ]
    : [];
  return (
    <div className="space-y-5">
      <ChartCard
        title="Gross ROI by percentile band"
        subtitle={d?.snapshot_ts ? `Census ${new Date(d.snapshot_ts).toLocaleDateString()} · ${b ? formatNum(b.n) : "—"} miners · ROI = lifetime returned SOL ÷ deployed (gross)` : "loading census…"}
      >
        {b ? <div className="max-w-3xl"><HBars rows={bandRows} /></div> : <p className="font-mono text-xs text-fog-muted">No census loaded yet.</p>}
        <p className="mt-3 max-w-3xl font-mono text-[11px] leading-snug text-fog-muted">
          ROI here is a <span className="text-gray-300">gross-return</span> ratio (the on-chain &quot;returned SOL&quot;
          watermark can include stake-back), not net profit. &gt;1× means SOL returned exceeds SOL deployed.
        </p>
      </ChartCard>
      <ChartCard title="Top miners by gross ROI" subtitle="Minimum 1 lamport deployed.">
        <div className={tableWrap}>
          <table className="w-full min-w-[520px] font-mono text-[11px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Miner</th>
                <th className={`${th} text-right`}>Deployed</th>
                <th className={`${th} text-right`}>Returned SOL</th>
                <th className={`${th} text-right`}>ORE mined</th>
                <th className={`${th} text-right`}>ROI</th>
              </tr>
            </thead>
            <tbody>
              {(d?.top ?? []).slice(0, 30).map((m) => (
                <tr key={m.authority} className={bodyRow}>
                  <td className={`${td} text-white`} title={m.authority}>{short(m.authority)}</td>
                  <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(m.lifetime_deployed), 1)}</td>
                  <td className={`${td} text-right text-gray-300`}>{formatSol(lamportsToSol(m.lifetime_rewards_sol), 1)}</td>
                  <td className={`${td} text-right text-gray-300`}>{formatNum(oreGramsToOre(m.lifetime_rewards_ore), 0)}</td>
                  <td className={`${td} num text-right text-gold`}>{m.roi.toFixed(2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      <Caveats provenance={lb.provenance} error={lb.error} />
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

// ── Fairness: winning-tile distribution + chi-square ─────────────────────────
function FairnessTab() {
  const rng = usePolled(fetchOreRng, 0);
  const d = rng.data;
  const bars: Pt[] = (d?.per_tile_wins ?? []).map((w, i) => ({ label: `Tile ${i + 1}`, value: w }));
  const crit = 36.42; // chi-square 5% critical, dof=24
  const verdict = d ? (d.chi_square < crit ? "within uniform expectation" : "above the 5% threshold — present descriptively") : "";
  return (
    <div className="space-y-5">
      <ChartCard
        title="Winning-tile distribution"
        subtitle={d ? `${formatNum(d.total_rounds_with_tile)} decided rounds · dashed line = uniform expectation (${formatNum(d.expected_per_tile, 0)}/tile)` : "loading…"}
        right={d && (
          <div className="text-right">
            <div className="num text-sm text-white">χ² {d.chi_square.toFixed(2)}</div>
            <div className="font-mono text-[10px] text-fog-muted">dof {d.dof} · crit {crit}</div>
          </div>
        )}
      >
        <div className="max-w-4xl">
          <Bars bars={bars} expected={d?.expected_per_tile} height={165} fmt={(v) => formatNum(v, 0)} />
        </div>
        {d && (
          <p className="mt-3 max-w-3xl font-mono text-[11px] leading-snug text-fog-muted">
            χ² = {d.chi_square.toFixed(2)} vs 5% critical {crit} (dof {d.dof}) → <span className="text-gray-300">{verdict}</span>.
            The board RNG is a slot-hash XOR-fold; the motherlode is 1-in-625 by design. Treat borderline
            values as &quot;not proven biased, not proven fair&quot; — not evidence of either.
          </p>
        )}
      </ChartCard>
      <Caveats provenance={rng.provenance} error={rng.error} />
    </div>
  );
}

// ── caveats / provenance footer ──────────────────────────────────────────────
function Caveats({ provenance, error }: { provenance: any; error: string | null }) {
  if (error) {
    return (
      <div className="card border-amber/30 px-4 py-3 font-mono text-[11px] text-amber">
        {error}
        {" "}The ORE ingest may be disabled (set <span className="text-white">ORE_INGEST_ENABLED=true</span> on the service) or the free-tier host may be waking up.
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
          { label: "Round", accent: true },
          { label: "Miners", hint: "this round" },
          { label: "ZINC / round", unit: "ZINC" },
          { label: "Board tiles", hint: "30-tile" },
          { label: "Emission", unit: "ZINC" },
          { label: "Our dZINC pool", hint: "bucket 1" },
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
          The ORE side ships first. ZINC ecosystem analytics are greenfield — the same pipeline (round
          spine, per-tile board, emission, leaderboard) will be cloned for the 30-tile ZINC game and our
          dZINC pool. Toggle back to <span className="text-white">ORE</span> for the live picture.
        </p>
      </div>
    </>
  );
}
