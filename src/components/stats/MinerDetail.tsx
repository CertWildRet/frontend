"use client";

/**
 * MinerDetail — the full per-wallet P&L panel (hawg-parity): lifetime census
 * tiles, event-window stats, best/worst rounds, streaks, ORE cost, the
 * cumulative P/L trend, and exact round history.
 *
 * Extracted from stats/page.tsx (it was the Search Miners chevron-expansion
 * body) so /profile can mount the SAME panel top-level for the connected
 * wallet. Visuals are shared via stats.module.css.
 */
import { useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { TileSkeleton } from "@/components/primitives/Skeleton";
import { ChartCard } from "@/components/stats/Charts";
import { PnlChart, type TPt } from "@/components/stats/TrendCharts";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchOreMiner,
  lamportsToSol,
  oreGramsToOre,
  type OreMinerDetail,
} from "@/lib/oreStats";
import { formatSol, formatNum, formatPct } from "@/lib/format";
import styles from "@/app/stats/stats.module.css";

const short = (a?: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "·");
const tableWrap = styles.tableWrap;
const theadRow = `${styles.tableHead} text-left`;
const th = "px-2 py-2 font-bold sm:px-3";
const td = "px-2 py-2 sm:px-3";
const bodyRow = styles.tableRow;
const solOf = (grams?: string | null) => oreGramsToOre(grams); // ORE grams -> ORE
const netTone = (v: number) => (v > 0 ? "text-pos" : v < 0 ? "text-red" : "text-gray-300");

// ── Miner detail: the wallet P&L lookup (mounts when the search box holds a full address) ──
function timeAgo(d: Date): string {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function MinerDetail({ pubkey }: { pubkey: string }) {
  const [roundsWin, setRoundsWin] = useState("1000");
  // 60s (not 30): lifetime P&L barely moves round-to-round, and the in-flight
  // guard in usePolled already prevents a slow request from stacking.
  const det = usePolled(() => fetchOreMiner(pubkey, roundsWin === "all" ? "all" : Math.max(1000, Number(roundsWin))), 60_000, [pubkey, roundsWin]);
  const d = det.data;
  if (det.loading && !d) {
    return <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><TileSkeleton /><TileSkeleton /><TileSkeleton /><TileSkeleton /></div>;
  }
  if (!d) {
    return (
      <div className="card px-4 py-3 font-mono text-[13px] text-fog-muted">
        {det.error?.includes("404") ? `No miner found for ${short(pubkey)}: this wallet has never deployed.` : det.error ?? "…"}
      </div>
    );
  }
  const c = d.census;
  const censusMissing = !c;
  const deployed = censusMissing && d.hit_stats?.dep_sol != null
    ? Number(d.hit_stats.dep_sol) / 1e9 : lamportsToSol(c?.lifetime_deployed ?? null);
  const returned = censusMissing && d.hit_stats?.won_sol != null
    ? Number(d.hit_stats.won_sol) / 1e9 : lamportsToSol(c?.lifetime_rewards_sol ?? null);
  const net = returned - deployed;
  const oreLifetime = solOf(c?.lifetime_rewards_ore ?? null);
  const unclaimed = solOf(c?.rewards_ore ?? null);
  const refinedLive = solOf(c?.refined_live ?? null);
  const hs = d.hit_stats;
  const hitRate = hs && hs.rounds > 0 ? hs.hits / hs.rounds : null;
  const firstTs = d.events?.first_ts ? new Date(Number(d.events.first_ts) * 1000) : null;
  const lastTs = d.events?.last_ts ? new Date(Number(d.events.last_ts) * 1000) : null;
  const dv = d.derived;
  const hasEvents = !!d.events && d.series.length > 0;
  const covTs = d.coverage?.min_ts ? new Date(d.coverage.min_ts * 1000) : null;

  return (
    <ChartCard
      title={`Miner ${short(pubkey)}`}
      subtitle={`Wallet P&L: lifetime on-chain census + event-exact round history${d.managed_by.length ? "" : ""}`}
      right={
        <span className="flex items-center gap-2">
          <CopyAddress address={pubkey} className="font-mono text-[13px] text-fog-muted" />
          <a href={`https://solscan.io/account/${pubkey}`} target="_blank" rel="noreferrer"
            className="rounded border border-line px-2 py-1 font-mono text-[12px] text-fog-muted transition-colors hover:border-steel hover:text-white">
            solscan ↗
          </a>
          <button type="button" onClick={det.refresh} disabled={det.fetching}
            className="rounded border border-line px-2 py-1 font-mono text-[12px] text-fog-muted transition-colors hover:border-steel hover:text-white disabled:cursor-default disabled:opacity-50">
            {det.fetching ? "refreshing…" : "refresh"}
          </button>
        </span>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12.5px] text-[#B7BDD2]">
        {firstTs && <span>first seen {firstTs.toLocaleDateString()}</span>}
        {lastTs && (
          <span className="flex items-center gap-1.5" title={`${lastTs.toLocaleDateString()} ${lastTs.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${Date.now() - lastTs.getTime() < 24 * 3600e3 ? "bg-[#22E0E6]" : "bg-white/25"}`} aria-hidden />
            last active {timeAgo(lastTs)}
          </span>
        )}
        {d.managed_by.length > 0 && (
          <span className="flex flex-wrap items-center gap-2">
            managed by
            {d.managed_by.map((m) => (
              <span key={m.pubkey} className="rounded border border-line px-1.5 py-0.5" title={m.pubkey}>
                pool {short(m.pubkey)}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile variant="inset" label={censusMissing ? "Deployed (window)" : "Deployed (lifetime)"} value={formatSol(deployed, 2)} unit="SOL" />
        <StatTile variant="inset" label={censusMissing ? "Won (window)" : "Returned (lifetime)"} value={formatSol(returned, 2)} unit="SOL" />
        <StatTile variant="inset" label="Net SOL"
          value={<span className={netTone(net)}>{formatSol(net, 2)}</span>} unit="SOL" hint="returned − deployed" />
        <StatTile variant="inset" label="ORE earned" value={formatNum(oreLifetime, 2)} unit="ORE" tone="gold"
          hint={unclaimed > 0 || refinedLive > 0 ? `unclaimed ${formatNum(unclaimed, 2)} · refined (live) ${formatNum(refinedLive, 2)}` : "all claimed"} />
        {hasEvents && (
          <StatTile variant="inset" label="Hit rate"
            value={hitRate != null ? formatPct(hitRate) : "···"}
            hint={hs ? `${formatNum(hs.hits)} of ${formatNum(hs.rounds)} rounds` : "event window"} />
        )}
        {hasEvents && (
          <StatTile variant="inset" label="Active since"
            value={firstTs ? `${firstTs.getMonth() + 1}/${firstTs.getDate()}` : "···"}
            hint={d.events ? `${formatNum(d.events.rounds)} rounds · ${formatNum(d.events.deploys)} deploys` : undefined} />
        )}
      </div>

      {!hasEvents && (
        <div className="mt-3 rounded-lg border border-line bg-white/[0.02] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#B7BDD2]">
          No deploys in the covered event window
          {covTs ? ` (round history currently reaches back to ${covTs.toLocaleDateString()} and deepens daily as the backfill digs toward genesis)` : ""}.
          This wallet last mined before that; the figures above are its lifetime on-chain census totals.
        </div>
      )}

      {hasEvents && hs && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile variant="inset" label="Rounds"
            value={<span>{formatNum(hs.rounds)} <span className="text-[13px] text-fog-muted">{hitRate != null ? formatPct(hitRate) : ""}</span></span>}
            hint="event window · win rate" />
          <StatTile variant="inset" label="Net SOL"
            value={<span className={netTone((Number(hs.won_sol ?? 0) - Number(hs.dep_sol ?? 0)) / 1e9)}>{formatSol((Number(hs.won_sol ?? 0) - Number(hs.dep_sol ?? 0)) / 1e9, 3)}</span>}
            unit="SOL" hint="won − deployed (window)" />
          <StatTile variant="inset" label="Deployed" value={formatSol(Number(hs.dep_sol ?? 0) / 1e9, 2)} unit="SOL" hint="event window" />
          <StatTile variant="inset" label="Won" value={formatSol(Number(hs.won_sol ?? 0) / 1e9, 2)} unit="SOL" hint="event window" />
        </div>
      )}

      {dv && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatTile variant="inset" label="Avg bet" value={formatSol(dv.avg_bet_sol, 3)} unit="SOL" hint="per round" />
          <StatTile variant="inset" label="Best $ win"
            value={dv.best_round?.net_usd != null ? (
              <span className={netTone(dv.best_round.net_usd)}>
                {dv.best_round.net_usd >= 0 ? "+" : "-"}${formatNum(Math.abs(dv.best_round.net_usd), 2)}
              </span>
            ) : dv.best_round ? (
              <span className={netTone(dv.best_round.net_sol)}>{dv.best_round.net_sol >= 0 ? "+" : ""}{formatSol(dv.best_round.net_sol, 3)} SOL</span>
            ) : <span className="text-pos">{dv.best_win_sol != null ? `+${formatSol(dv.best_win_sol, 3)} SOL` : "···"}</span>}
            hint={dv.best_round
              ? `#${formatNum(dv.best_round.round_id)} · ${dv.best_round.net_sol >= 0 ? "+" : ""}${formatSol(dv.best_round.net_sol, 3)} SOL${dv.best_round.ore_won > 0.005 ? ` + ${formatNum(dv.best_round.ore_won, 2)} ORE` : ""}`
              : undefined} />
          <StatTile variant="inset" label="Most $ loss"
            value={dv.worst_round?.net_usd != null ? (
              <span className={netTone(dv.worst_round.net_usd)}>
                {dv.worst_round.net_usd >= 0 ? "+" : "-"}${formatNum(Math.abs(dv.worst_round.net_usd), 2)}
              </span>
            ) : dv.worst_round ? (
              <span className={netTone(dv.worst_round.net_sol)}>{formatSol(dv.worst_round.net_sol, 3)} SOL</span>
            ) : <span className="text-red">{dv.worst_loss_sol != null ? `${formatSol(dv.worst_loss_sol, 3)} SOL` : "···"}</span>}
            hint={dv.worst_round
              ? `#${formatNum(dv.worst_round.round_id)} · ${dv.worst_round.net_sol >= 0 ? "+" : ""}${formatSol(dv.worst_round.net_sol, 3)} SOL${dv.worst_round.ore_won > 0.005 ? ` + ${formatNum(dv.worst_round.ore_won, 2)} ORE` : ""}`
              : undefined} />
          <StatTile variant="inset" label="Streaks"
            value={<span><span className="text-pos">{dv.longest_hit_streak}</span> / <span className="text-red">{dv.longest_miss_streak}</span></span>}
            hint={`longest hit / miss · now ${dv.current_streak > 0 ? "+" : ""}${dv.current_streak}`} />
          <StatTile variant="inset" label="ORE won (window)"
            value={formatNum(dv.ore_won_realized ?? dv.ore_won_expected, 3)} unit="ORE"
            hint={`realized, solo wins in full · last ${formatNum(dv.rounds)} rounds`} />
          <StatTile variant="inset" label="ORE cost"
            value={dv.ore_cost_sol != null && dv.ore_cost_sol > 0
              ? formatNum(dv.ore_cost_sol, 3)
              : (dv.ore_won_realized ?? dv.ore_won_expected) > 0 ? <span className="text-pos">free</span> : "·"}
            unit={dv.ore_cost_sol != null && dv.ore_cost_sol > 0 ? "SOL/ORE" : undefined}
            hint={dv.ore_cost_sol != null && dv.ore_cost_sol > 0 ? "net SOL spent per ORE won" : (dv.ore_won_realized ?? dv.ore_won_expected) > 0 ? "mined at a net SOL profit" : "no ORE won in window"} />
        </div>
      )}

      {/* favorite-tiles section removed from the miner panel per request
      {d.tiles && d.tiles.some((t) => t > 0) && <FavoriteSquares tiles={d.tiles} />}
      */}

      {d.series.length > 1 && <MinerTrend series={d.series} pricesNow={d.prices_now} roundsWin={roundsWin} setRoundsWin={setRoundsWin} />}

      {d.history.length > 0 && (<>
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
      </>)}
    </ChartCard>
  );
}

function MinerTrend({ series, pricesNow, roundsWin, setRoundsWin }: {
  series: OreMinerDetail["series"]; pricesNow: OreMinerDetail["prices_now"];
  roundsWin: string; setRoundsWin: (v: string) => void;
}) {
  const win = roundsWin;
  const setWin = setRoundsWin;
  const [cur, setCur] = useState<"sol" | "usd">("usd");
  // "all" -> the whole (possibly bucketed) series; each point may sum n rounds
  const slice = win === "all" ? series : series.slice(-Math.min(Number(win), series.length));
  const hasUsd = slice.some((p) => p.net_usd != null);
  const solNow = pricesNow ? Number(pricesNow.sol_usd) : null;
  const oreNow = pricesNow ? Number(pricesNow.ore_usd) : null;
  const markNow = solNow != null && oreNow != null && solNow > 0;
  // cumulative recomputed over the visible window so it starts at 0.
  // Prices are round-time (realized); today's-prices equivalent is the tile hint.
  let cum = 0;
  const pts: TPt[] = slice.map((p) => {
    cum += cur === "usd" && p.net_usd != null ? p.net_usd : p.net_sol;
    return { label: `#${formatNum(p.round_id)}`, value: cum };
  });
  const nRounds = slice.reduce((a, p) => a + (p.n ?? 1), 0);
  const wins = slice.reduce((a, p) => a + (p.hits ?? (p.hit ? 1 : 0)), 0);
  const oreWonWin = slice.reduce((a, p) => a + p.ore_won, 0);
  const netSolWin = slice.reduce((a, p) => a + p.net_sol, 0);
  const oreCostWin = oreWonWin > 0 && netSolWin < 0 ? -netSolWin / oreWonWin : null;
  const nowUsd = markNow ? netSolWin * (solNow as number) + oreWonWin * (oreNow as number) : null;
  return (
    <div className="mt-5 space-y-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-y-2">
        <div className="section-label" style={{ fontSize: 13 }}>Performance trend</div>
        <div className="flex flex-wrap items-center gap-2">
          {hasUsd && (
            <SegmentedControl aria-label="Currency" variant="loose"
              items={[{ id: "sol", label: "SOL only" }, { id: "usd", label: "USD (SOL+ORE)" }]}
              value={cur} onChange={(id) => setCur(id as "sol" | "usd")} />
          )}
          <SegmentedControl aria-label="Rounds window" variant="loose"
            items={[{ id: "100", label: "100" }, { id: "500", label: "500" }, { id: "1000", label: "1000" }, { id: "2500", label: "2500" }, { id: "5000", label: "5000" }, { id: "all", label: "All" }]}
            value={win} onChange={setWin} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile variant="inset" label="Rounds" value={formatNum(nRounds)} hint={win === "all" ? "entire covered history" : undefined} />
        <StatTile variant="inset" label="Win rate" value={nRounds ? formatPct(wins / nRounds) : "···"} />
        <StatTile variant="inset" label="Avg / round"
          value={<span className={netTone(cum / Math.max(1, nRounds))}>{cur === "usd" ? "$" : ""}{formatNum(cum / Math.max(1, nRounds), cur === "usd" ? 2 : 4)}</span>} />
        <StatTile variant="inset" label="Total net"
          value={<span className={netTone(cum)}>{cum >= 0 ? "+" : ""}{cur === "usd" ? "$" : ""}{formatNum(cum, cur === "usd" ? 2 : 3)}</span>}
          unit={cur === "sol" ? "SOL" : undefined}
          hint={nowUsd != null ? `at today's prices ${nowUsd >= 0 ? "+" : "-"}$${formatNum(Math.abs(nowUsd), 2)}` : undefined} />
        <StatTile variant="inset" label="ORE cost"
          value={oreCostWin != null ? formatNum(oreCostWin, 3)
            : oreWonWin > 0 ? <span className="text-pos">free</span> : "·"}
          unit={oreCostWin != null ? "SOL/ORE" : undefined}
          hint={oreCostWin != null ? "this window" : oreWonWin > 0 ? "net SOL profit in window" : "no ORE won in window"} />
      </div>
      <PnlChart points={pts} height={220}
        fmt={(v) => (cur === "usd" ? `$${formatNum(v, 2)}` : `${formatNum(v, 3)}`)}
        emptyText="not enough round history yet" />
    </div>
  );
}
