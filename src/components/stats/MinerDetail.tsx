"use client";

/**
 * MinerDetail — the full per-wallet P&L panel (hawg-parity): lifetime census
 * tiles, event-window stats, best/worst rounds, streaks, ORE cost, the
 * cumulative P/L trend, and exact round history.
 *
 * Shared by /search, /profile, and Miner Rankings row expand.
 * Visuals are shared via stats.module.css.
 */
import Image from "next/image";
import { useState } from "react";
import { IconExternalLink } from "@tabler/icons-react";
import { StatTile } from "@/components/primitives/Stat";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { RefreshIconButton } from "@/components/primitives/RefreshIconButton";
import { TileSkeleton, Refreshing } from "@/components/primitives/Skeleton";
import { ChartCard } from "@/components/stats/Charts";
import { HitRate } from "@/components/stats/HitRate";
import { PnlChart, type TPt } from "@/components/stats/TrendCharts";
import { usePolled } from "@/hooks/useOreStats";
import { useTicker } from "@/hooks/useTicker";
import {
  fetchOreMiner,
  lamportsToSol,
  oreGramsToOre,
  ORE_TILE_COUNT,
  type OreMinerDetail,
} from "@/lib/oreStats";
import { formatSol, formatNum, formatPct } from "@/lib/format";
import styles from "@/app/stats/stats.module.css";

/** Distinct tiles covered in a round from the deploy mask bitfield. */
function tilesFromMask(mask: string | null | undefined): number {
  let m = BigInt(mask ?? "0");
  let n = 0;
  while (m > 0n) {
    n += Number(m & 1n);
    m >>= 1n;
  }
  return n;
}

/** Avg tiles + fair expected hit rate (avgTiles / 25) over the newest N history rows. */
function avgTilesExpected(
  history: OreMinerDetail["history"],
  n = 50,
): { avgTiles: number; expectedRate: number; sampleRounds: number } | null {
  const recent = history.slice(0, n);
  if (recent.length === 0) return null;
  const avgTiles = recent.reduce((a, h) => a + tilesFromMask(h.mask_union), 0) / recent.length;
  return {
    avgTiles,
    expectedRate: avgTiles / ORE_TILE_COUNT,
    sampleRounds: recent.length,
  };
}

const fmtSeen = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const iconBtn =
  "inline-flex items-center justify-center rounded border border-line px-2 py-1 text-fog-muted transition-colors hover:border-steel hover:text-white";

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
  const ticker = useTicker();
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
  const hs = d.hit_stats;
  const hitRate = hs && hs.rounds > 0 ? hs.hits / hs.rounds : null;
  const tilesExpect = avgTilesExpected(d.history, 50);
  const firstTs = d.events?.first_ts ? new Date(Number(d.events.first_ts) * 1000) : null;
  const lastTs = d.events?.last_ts ? new Date(Number(d.events.last_ts) * 1000) : null;
  const dv = d.derived;
  const hasEvents = !!d.events && d.series.length > 0;
  const covTs = d.coverage?.min_ts ? new Date(d.coverage.min_ts * 1000) : null;
  // Lifetime (on-chain census) vs the event-reconstructed round history: the census
  // is the AUTHORITATIVE on-chain total; the round history is only as complete as the
  // event backfill, which walks newest→oldest and hasn't reached genesis. A wallet
  // whose deploys mostly predate our event floor shows census ≫ Σ(captured rounds)
  // (e.g. 1,127 SOL lifetime vs 1.8 SOL captured). This is TEMPORAL coverage, not a
  // pool thing — old self-cranked miners diverge too, and fully-covered pool miners
  // don't. Detect it generically from the coverage ratio, not from managed_by.
  const eventDepSol = hs?.dep_sol != null ? Number(hs.dep_sol) / 1e9 : null;
  const coverageRatio = !censusMissing && deployed > 0 && eventDepSol != null ? eventDepSol / deployed : null;
  const partialHistory = coverageRatio != null && deployed > 1
    && coverageRatio < 0.9 && (deployed - (eventDepSol ?? 0)) > 0.5;
  const capturedPct = coverageRatio != null ? formatPct(Math.max(0, Math.min(1, coverageRatio))) : null;
  // Same figure as Performance → Total net (USD): sum of round-time USD P/L over the series.
  const hasUsd = d.series.some((p) => p.net_usd != null);
  const totalNetUsd = hasUsd
    ? d.series.reduce((a, p) => a + (p.net_usd ?? 0), 0)
    : null;
  const playedRounds = hs?.rounds ?? d.events?.rounds ?? null;

  return (
    <ChartCard>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2
            className="text-[19px] font-semibold tracking-tight text-[#EAECF6]"
            style={{ fontFamily: "'Chakra Petch', sans-serif" }}
          >
            Miner <span className="text-[#B7BDD2]">{short(pubkey)}</span>
          </h2>
          <CopyAddress address={pubkey} iconOnly className="text-fog-muted" />
          <a
            href={`https://solscan.io/account/${pubkey}`}
            target="_blank"
            rel="noreferrer"
            title="View on Solscan"
            aria-label="View on Solscan"
            className={iconBtn}
          >
            <IconExternalLink size={15} stroke={1.75} aria-hidden />
          </a>
        </div>
        <div className="subtext flex flex-wrap items-center gap-x-3 gap-y-1">
          {firstTs && (
            <span>
              First seen <span className="font-semibold text-[#EAECF6]">{fmtSeen(firstTs)}</span>
            </span>
          )}
          {lastTs && (
            <span
              className="flex items-center gap-1.5"
              title={`${lastTs.toLocaleDateString()} ${lastTs.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${Date.now() - lastTs.getTime() < 24 * 3600e3 ? "bg-[#22E0E6]" : "bg-white/25"}`}
                aria-hidden
              />
              Last active <span className="font-semibold text-[#EAECF6]">{timeAgo(lastTs)}</span>
            </span>
          )}
          <RefreshIconButton onClick={det.refresh} disabled={det.fetching} />
        </div>
      </div>
      {d.managed_by.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[12.5px] text-[#B7BDD2]">
          managed by
          {d.managed_by.map((m) => (
            <span key={m.pubkey} className="rounded border border-line px-1.5 py-0.5" title={m.pubkey}>
              pool {short(m.pubkey)}
            </span>
          ))}
        </div>
      )}
      {partialHistory && (
        <div className="mb-3 rounded-lg border border-amber/30 bg-amber/[0.06] px-3 py-2 font-mono text-[12px] leading-relaxed text-amber">
          <span className="text-white">Lifetime tiles are the authoritative on-chain totals.</span> The
          per-round history below only covers captured rounds{covTs ? ` (event data reaches back to ${covTs.toLocaleDateString()} so far)` : ""} —
          this wallet deployed most of its {formatSol(deployed, 0)} SOL earlier, so captured rounds sum to just {formatSol(eventDepSol ?? 0, 2)} SOL
          {capturedPct ? ` (${capturedPct} of lifetime)` : ""}. Coverage deepens daily as the backfill digs toward genesis.
        </div>
      )}

      {/* 1. Lifetime profitability glance */}
      <div className="grid grid-cols-1 items-stretch gap-2.5 md:grid-cols-3">
        <div className="@container flex h-full flex-col rounded-lg border border-line bg-ink-800 px-3.5 py-3 [container-type:size] md:col-span-2">
          <div className="label flex shrink-0 items-center gap-1.5">
            Lifetime Net P&amp;L
            <span
              className="inline-flex text-fog-muted"
              title={censusMissing ? "Won − deployed over captured rounds" : "Returned − deployed from on-chain lifetime census"}
              aria-label={censusMissing ? "Won − deployed over captured rounds" : "Returned − deployed from on-chain lifetime census"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 5.2V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="6" cy="3.6" r="0.7" fill="currentColor" />
              </svg>
            </span>
          </div>
          <div className="flex min-h-0 flex-1 items-center py-0.5">
            {totalNetUsd != null ? (
              <span className={`num block text-[clamp(2.75rem,28cqh,4.25rem)] leading-[0.9] tracking-tight ${netTone(totalNetUsd)}`}>
                {totalNetUsd >= 0 ? "+" : "-"}${formatNum(Math.abs(totalNetUsd), 2)}
              </span>
            ) : (
              <div className="flex items-baseline gap-2 whitespace-nowrap">
                <span className={`num text-[clamp(2.75rem,28cqh,4.25rem)] leading-[0.9] tracking-tight ${netTone(net)}`}>
                  {net > 0 ? "+" : ""}{formatSol(net, 2)}
                </span>
                <span className="font-mono text-[15px] text-[#C6CCEC]">SOL</span>
              </div>
            )}
          </div>
          <div
            className="shrink-0 border-t border-line pt-2 text-[14px] text-[#A8B0CC]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            {playedRounds != null ? (
              <>Played <span className="font-semibold text-[#EAECF6]">{formatNum(playedRounds)} rounds</span></>
            ) : (
              <>Played <span className="font-semibold text-[#EAECF6]">·</span></>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="rounded-lg border border-line bg-ink-800 px-3.5 py-2.5">
            <div className="label">Unrefined Ore Mined</div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-ink-900/60">
                <Image src="/ore-token.png" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="num text-[22px] leading-none tracking-tight gradient-text">{formatNum(oreLifetime, 2)}</span>
                  <span className="font-mono text-[12px] text-fog-muted">ORE</span>
                </div>
                {ticker?.uore_apr != null && (
                  <div className="subtext mt-1">
                    earning{" "}
                    <span className="font-semibold text-[#FFC061]">{ticker.uore_apr.toFixed(1)}%</span>{" "}
                    APY
                  </div>
                )}
              </div>
            </div>
          </div>
          {hasEvents && (
            <HitRate
              rate={hitRate}
              hits={hs?.hits}
              rounds={hs?.rounds}
              expectedRate={tilesExpect?.expectedRate ?? null}
              avgTiles={tilesExpect?.avgTiles ?? null}
              sampleRounds={tilesExpect?.sampleRounds ?? null}
            />
          )}
        </div>
      </div>

      {!hasEvents && (
        <div className="mt-3 rounded-lg border border-line bg-white/[0.02] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#B7BDD2]">
          No deploys in the covered event window
          {covTs ? ` (round history currently reaches back to ${covTs.toLocaleDateString()} and deepens daily as the backfill digs toward genesis)` : ""}.
          This wallet last mined before that; the figures above are its lifetime on-chain census totals.
        </div>
      )}

      {/* 2. Captured rounds · play & range — immediately above the trend */}
      {hasEvents && (hs || dv) && (
        <div className="mt-5 space-y-3">
          <div className="section-label" style={{ fontSize: 13 }}>Captured rounds · play &amp; range</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {hs && (
              <StatTile variant="inset" label="Rounds"
                value={formatNum(hs.rounds)}
                hint={hitRate != null ? `${formatPct(hitRate)} win rate` : "captured rounds"} />
            )}
            {hs && (
              <StatTile variant="inset" label="Net (captured)"
                value={<span className={netTone((Number(hs.won_sol ?? 0) - Number(hs.dep_sol ?? 0)) / 1e9)}>{formatSol((Number(hs.won_sol ?? 0) - Number(hs.dep_sol ?? 0)) / 1e9, 3)}</span>}
                unit="SOL" hint="won − deployed" />
            )}
            {dv && (
              <StatTile variant="inset" label="Avg bet" value={formatSol(dv.avg_bet_sol, 3)} unit="SOL" hint="per round" />
            )}
            {dv && (
              <StatTile variant="inset" label="Streaks"
                value={<span><span className="text-pos">{dv.longest_hit_streak}</span> / <span className="text-red">{dv.longest_miss_streak}</span></span>}
                hint={`longest hit / miss · now ${dv.current_streak > 0 ? "+" : ""}${dv.current_streak}`} />
            )}
            {dv && (
              <StatTile variant="inset" label="Best round"
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
            )}
            {dv && (
              <StatTile variant="inset" label="Worst round"
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
            )}
            {dv && (
              <StatTile variant="inset" label="ORE won"
                value={formatNum(dv.ore_won_realized ?? dv.ore_won_expected, 3)} unit="ORE"
                hint={`realized, solo wins in full · last ${formatNum(dv.rounds)} rounds`} />
            )}
            {dv && (
              <StatTile variant="inset" label="ORE cost"
                value={dv.ore_cost_sol != null && dv.ore_cost_sol > 0
                  ? formatNum(dv.ore_cost_sol, 3)
                  : (dv.ore_won_realized ?? dv.ore_won_expected) > 0 ? <span className="text-pos">free</span> : "·"}
                unit={dv.ore_cost_sol != null && dv.ore_cost_sol > 0 ? "SOL/ORE" : undefined}
                hint={dv.ore_cost_sol != null && dv.ore_cost_sol > 0 ? "net SOL spent per ORE won" : (dv.ore_won_realized ?? dv.ore_won_expected) > 0 ? "mined at a net SOL profit" : "no ORE won in window"} />
            )}
          </div>
        </div>
      )}

      {/* favorite-tiles section removed from the miner panel per request
      {d.tiles && d.tiles.some((t) => t > 0) && <FavoriteSquares tiles={d.tiles} />}
      */}

      {d.series.length > 1 && <MinerTrend series={d.series} pricesNow={d.prices_now} roundsWin={roundsWin} setRoundsWin={setRoundsWin} refreshing={det.fetching && !!det.data} partial={partialHistory} />}

      {d.history.length > 0 && (<>
      <div className="mt-5 space-y-3">
        <div className="section-label" style={{ fontSize: 13 }}>Recent Rounds</div>
        <div className={tableWrap}>
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
              const tiles = tilesFromMask(h.mask_union);
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
      </div>
      </>)}
    </ChartCard>
  );
}

function MinerTrend({ series, pricesNow, roundsWin, setRoundsWin, refreshing, partial }: {
  series: OreMinerDetail["series"]; pricesNow: OreMinerDetail["prices_now"];
  roundsWin: string; setRoundsWin: (v: string) => void; refreshing?: boolean; partial?: boolean;
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
        <div className="flex items-center gap-2">
          <span className="section-label" style={{ fontSize: 13 }}>Performance</span>
          <span className="section-label"><Refreshing active={!!refreshing} /></span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasUsd && (
            <SegmentedControl aria-label="Currency" variant="loose"
              items={[{ id: "sol", label: "SOL" }, { id: "usd", label: "USD" }]}
              value={cur} onChange={(id) => setCur(id as "sol" | "usd")} />
          )}
          <SegmentedControl aria-label="Rounds window" variant="loose"
            items={[{ id: "100", label: "100" }, { id: "500", label: "500" }, { id: "1000", label: "1000" }, { id: "2500", label: "2500" }, { id: "5000", label: "5000" }, { id: "all", label: "All" }]}
            value={win} onChange={setWin} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile variant="inset" label="Rounds" value={formatNum(nRounds)} hint={win === "all" ? (partial ? "all captured rounds — see note" : "all captured rounds") : undefined} />
        <StatTile variant="inset" label="Win rate" value={nRounds ? formatPct(wins / nRounds) : "···"} />
        <StatTile variant="inset" label="Avg / round"
          value={<span className={netTone(cum / Math.max(1, nRounds))}>{cur === "usd" ? "$" : ""}{formatNum(cum / Math.max(1, nRounds), cur === "usd" ? 2 : 4)}</span>} />
        <StatTile variant="inset" label="Total net"
          value={<span className={netTone(cum)}>{cum >= 0 ? "+" : ""}{cur === "usd" ? "$" : ""}{formatNum(cum, cur === "usd" ? 2 : 3)}</span>}
          unit={cur === "sol" ? "SOL" : undefined}
          hint={nowUsd != null ? (
            <>at today&apos;s prices <span className={netTone(nowUsd)}>{nowUsd >= 0 ? "+" : "-"}${formatNum(Math.abs(nowUsd), 2)}</span></>
          ) : undefined} />
        <StatTile variant="inset" label="ORE cost"
          value={oreCostWin != null ? formatNum(oreCostWin, 3)
            : oreWonWin > 0 ? <span className="text-pos">free</span> : "·"}
          unit={oreCostWin != null ? "SOL/ORE" : undefined}
          hint={oreCostWin != null ? "this window" : oreWonWin > 0 ? "net SOL profit in window" : "no ORE won in window"} />
      </div>
      <PnlChart points={pts} height={220}
        fmt={(v) => (cur === "usd" ? `$${formatNum(v, 2)}` : `${formatNum(v, 3)}`)}
        axisFmt={(v) => {
          // Compact so six-figure whales (FeNY: $108K axis, $98K badge) don't
          // overflow the fixed label gutter. Full precision stays in the tooltip.
          const a = Math.abs(v), sgn = v < 0 ? "-" : "", u = cur === "usd" ? "$" : "";
          const c = a >= 1e6 ? `${(a / 1e6).toFixed(1)}M`
            : a >= 1e3 ? `${(a / 1e3).toFixed(1)}K`
            : a >= 100 ? a.toFixed(0)
            : a.toFixed(cur === "usd" ? 2 : 3);
          return `${sgn}${u}${c}`;
        }}
        emptyText="not enough round history yet" />
    </div>
  );
}
