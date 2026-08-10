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
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { IconExternalLink } from "@tabler/icons-react";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { InfoDot } from "@/components/primitives/InfoDot";
import { RefreshIconButton } from "@/components/primitives/RefreshIconButton";
import { ServiceChip } from "@/components/primitives/ServiceChip";
import { TileSkeleton, Refreshing } from "@/components/primitives/Skeleton";
import { ChartCard, ChartWatermarkContext } from "@/components/stats/Charts";
import { HitRate } from "@/components/stats/HitRate";
import { PnlChart, type TPt } from "@/components/stats/TrendCharts";
import { usePolled } from "@/hooks/useOreStats";
import { useTicker } from "@/hooks/useTicker";
import {
  fetchOreMiner,
  fetchOreMinerHistory,
  lamportsToSol,
  oreGramsToOre,
  ORE_TILE_COUNT,
  type OreMinerDetail,
} from "@/lib/oreStats";
import { formatSol, formatNum, formatPct } from "@/lib/format";
import { Pager, PAGE } from "@/app/stats/shared";
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
  const [roundsWin, setRoundsWin] = useState("500");
  // History pagination: page 0 renders instantly from the envelope's embedded
  // newest-50; deeper pages fetch /ore/miner/:pubkey/history so the ENTIRE
  // captured history is walkable, same Pager as the Rounds/Motherlode tables.
  const [histOffset, setHistOffset] = useState(0);
  const ticker = useTicker();
  // Fetch on mount, pubkey/window change, and manual refresh only — no background poll.
  const det = usePolled(() => fetchOreMiner(pubkey, roundsWin === "all" ? "all" : Math.max(1000, Number(roundsWin))), 0, [pubkey, roundsWin]);
  const histPage = usePolled(() => fetchOreMinerHistory(pubkey, PAGE, histOffset), 0, [pubkey, histOffset]);
  useEffect(() => { setHistOffset(0); }, [pubkey]);
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
  const tilesExpect = avgTilesExpected(d.history, 50);
  const firstTs = d.events?.first_ts ? new Date(Number(d.events.first_ts) * 1000) : null;
  const lastTs = d.events?.last_ts ? new Date(Number(d.events.last_ts) * 1000) : null;
  const dv = d.derived;
  const hasEvents = !!d.events && d.series.length > 0;
  const covTs = d.coverage?.min_ts ? new Date(d.coverage.min_ts * 1000) : null;
  // Net P&L = current-rate accounting over the FULL lifetime census, not the
  // fetched window: net SOL (returned − deployed) valued at today's SOL price,
  // plus lifetime ORE earned valued at today's ORE price. One consistent
  // "what is this mining position worth in dollars now" figure — the previous
  // window-summed number silently changed with the timeframe toggle while
  // claiming to be lifetime.
  const solNow = d.prices_now?.sol_usd ?? null;
  const oreNow = d.prices_now?.ore_usd ?? null;
  const solLegUsd = solNow != null ? net * solNow : null;
  const oreLegUsd = oreNow != null ? oreLifetime * oreNow : null;
  const pnlUsd = solLegUsd != null && oreLegUsd != null ? solLegUsd + oreLegUsd : null;
  const roundsAll = hs?.rounds ?? d.series.reduce((a, p) => a + (p.n ?? 1), 0);
  const avgPerRoundUsd = pnlUsd != null && roundsAll > 0 ? pnlUsd / roundsAll : null;
  const fmtSignedUsd = (v: number, dec = 2) => `${v >= 0 ? "+" : "-"}$${formatNum(Math.abs(v), dec)}`;

  // Page 0 falls back to the embedded newest-50 while (or if) the endpoint
  // fetch is in flight; deeper pages only ever come from the endpoint.
  const historyRows = histPage.data?.rows ?? (histOffset === 0 ? d.history : []);
  // Pager total = full covered rounds (rollup count from the envelope); the
  // embedded history length is the floor when events aren't aggregated yet.
  const historyTotal = d.events?.rounds ?? d.history.length;

  return (
    <ChartWatermarkContext.Provider value={true}>
    <div className="space-y-5">
    <ChartCard
      title={`Miner ${short(pubkey)}`}
      right={
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2" data-no-capture="true">
          <div className="flex min-w-0 items-center gap-1.5">
            <ServiceChip service={d.service} />
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
      }
    >
      {d.managed_by.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[12.5px] text-[#B7BDD2]">
          managed by
          {d.managed_by.map((m) => (
            m.service ? (
              <span key={m.pubkey} className="rounded border px-1.5 py-0.5" title={`${m.service.label} executor ${m.pubkey}`}
                style={{ color: m.service.color, borderColor: `${m.service.color}55`, backgroundColor: `${m.service.color}14` }}>
                {m.service.label} {short(m.pubkey)}
              </span>
            ) : (
              <span key={m.pubkey} className="rounded border border-line px-1.5 py-0.5" title={m.pubkey}>
                pool {short(m.pubkey)}
              </span>
            )
          ))}
        </div>
      )}

      {/* 1. Lifetime profitability glance */}
      <div className="grid grid-cols-1 items-stretch gap-2.5 md:grid-cols-3">
        {/*
          Desktop: size-container + cqh so the hero P&L scales to the stretched
          card height beside Ore/Hit-rate. Mobile: never use container-type:size —
          size containment ignores content height, collapses the card, and the
          clamp'd value overflows over the label, footer, and next tiles.
        */}
        <div className="flex flex-col rounded-xl border border-line bg-[rgba(91,108,255,0.07)] px-3.5 py-3 md:col-span-2 md:h-full md:[container-type:size]">
          <div
            className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium leading-none text-[#9AA3C8]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            Lifetime Net P&amp;L
            <InfoDot
              className="text-fog-muted"
              title={
                pnlUsd != null
                  ? "Current-rate accounting: lifetime net SOL (returned − deployed) valued at today's SOL price, plus lifetime ORE earned valued at today's ORE price — what this mining position is worth in dollars right now. Both legs from the on-chain census."
                  : censusMissing
                    ? "Won − deployed over captured rounds"
                    : "Returned − deployed from on-chain lifetime census"
              }
            />
          </div>
          <div className="flex min-h-0 flex-col justify-center gap-2 py-2.5 md:flex-1 md:py-0.5">
            {pnlUsd != null ? (
              <>
                <span className={`num block text-[2.75rem] leading-[0.9] tracking-tight md:text-[clamp(2.75rem,28cqh,4.25rem)] ${netTone(pnlUsd)}`}>
                  {fmtSignedUsd(pnlUsd)}
                </span>
                {/* The reconciliation the page never offered: how a negative net
                    SOL and a pile of ORE combine into one dollar figure. */}
                <span className="num text-[13px] text-[#8B93B4]">
                  SOL <span className={netTone(solLegUsd ?? 0)}>{fmtSignedUsd(solLegUsd ?? 0)}</span>
                  <span className="text-[#5A6284]"> · </span>
                  ORE <span className={netTone(oreLegUsd ?? 0)}>{fmtSignedUsd(oreLegUsd ?? 0)}</span>
                  <span className="text-[#5A6284]"> at current prices</span>
                </span>
              </>
            ) : (
              <div className="flex items-baseline gap-2 whitespace-nowrap">
                <span className={`num text-[2.75rem] leading-[0.9] tracking-tight md:text-[clamp(2.75rem,28cqh,4.25rem)] ${netTone(net)}`}>
                  {net > 0 ? "+" : ""}{formatSol(net, 2)}
                </span>
                <span
                  className="text-[13px] font-medium text-[#9AA3C8]"
                  style={{ fontFamily: "var(--font-subtext)" }}
                >
                  SOL
                </span>
              </div>
            )}
          </div>
          <div
            className="shrink-0 border-t border-line pt-2 text-[14px] text-[#A8B0CC]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            {avgPerRoundUsd != null ? (
              <>
                Average per round:{" "}
                <span className={`font-semibold ${netTone(avgPerRoundUsd)}`}>
                  {fmtSignedUsd(avgPerRoundUsd)}
                </span>
                <span className="text-[#8B93B4]"> over {formatNum(roundsAll)} rounds</span>
              </>
            ) : (
              <>Average per round: <span className="font-semibold text-[#EAECF6]">·</span></>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="rounded-xl border border-line bg-[rgba(255,192,97,0.07)] px-3.5 py-2.5">
            <div
              className="text-[13px] font-medium leading-none text-[#9AA3C8]"
              style={{ fontFamily: "var(--font-subtext)" }}
            >
              Unrefined Ore Mined
            </div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-ink-900/60">
                <Image src="/ore-token.png" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="num text-[22px] leading-none tracking-tight gradient-text">{formatNum(oreLifetime, 2)}</span>
                  <span
                    className="text-[13px] font-medium text-[#9AA3C8]"
                    style={{ fontFamily: "var(--font-subtext)" }}
                  >
                    ORE
                  </span>
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
              className="bg-[rgba(154,107,255,0.07)]"
            />
          )}
        </div>
      </div>

      {/* Lifetime performance · on-chain totals */}
      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h3
            className="text-[18px] font-bold tracking-tight text-[#EAECF6]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            Lifetime performance
          </h3>
          {firstTs && (
            <div
              className="text-[12px] leading-snug text-[#8B93B4]"
              style={{ fontFamily: "var(--font-subtext)" }}
            >
              Since {fmtSeen(firstTs)}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            <LifetimeCell
              label="SOL deployed"
              value={formatSol(deployed, 2)}
              unit="SOL"
              className="rounded-xl border border-line bg-[rgba(91,108,255,0.07)]"
            />
            <LifetimeCell
              label="SOL returned"
              value={formatSol(returned, 2)}
              unit="SOL"
              className="rounded-xl border border-line bg-[rgba(34,224,230,0.06)]"
            />
            <LifetimeCell
              label="Net SOL"
              value={
                <span className={netTone(net)}>
                  {net > 0 ? "+" : ""}{formatSol(net, 2)}
                </span>
              }
              unit="SOL"
              className="col-span-2 rounded-xl border border-line bg-[rgba(154,107,255,0.07)] md:col-span-1"
            />
            <LifetimeCell
              label="ORE earned"
              value={<span className="text-[#86EFAC]">{formatNum(oreLifetime, 2)}</span>}
              unit="ORE"
              className="rounded-xl border border-line bg-[rgba(255,192,97,0.07)]"
            />
            <LifetimeCell
              label={
                <span className="inline-flex items-center gap-1">
                  Refined ORE
                  <InfoDot className="text-[#8B93B4]" title="Live refined balance from the on-chain census" />
                </span>
              }
              value={formatNum(refinedLive, 2)}
              unit="ORE"
              className="rounded-xl border border-line bg-[rgba(255,90,200,0.05)]"
            />
            <LifetimeCell
              label="Unclaimed ORE"
              value={formatNum(unclaimed, 2)}
              unit="ORE"
              className="col-span-2 rounded-xl border border-line bg-[rgba(74,222,128,0.05)] md:col-span-1"
            />
          </div>
      </div>

      {!hasEvents && (
        <div className="mt-3 rounded-lg border border-line bg-white/[0.02] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#B7BDD2]">
          No deploys in the covered event window
          {covTs ? ` (round history currently reaches back to ${covTs.toLocaleDateString()} and deepens daily as the backfill digs toward genesis)` : ""}.
          This wallet last mined before that; the figures above are its lifetime on-chain census totals.
        </div>
      )}
    </ChartCard>

      {d.series.length > 1 && (
        <MinerTrend
          pubkey={pubkey}
          series={d.series}
          derived={dv}
          pricesNow={d.prices_now}
          oreLifetime={censusMissing ? null : oreLifetime}
          lifetimePnlUsd={pnlUsd}
          roundsWin={roundsWin}
          setRoundsWin={setRoundsWin}
          refreshing={det.fetching && !!det.data}
        />
      )}

      {d.history.length > 0 && (
      <ChartCard
        title={`${pubkey.slice(0, 4)}'s round history`}
        subtitle={`Per-round deploy and outcome — every captured round, newest first${historyTotal > PAGE ? ` (${formatNum(historyTotal)} rounds)` : ""}.`}
      >
        <div className="overflow-hidden rounded-xl border border-line bg-ink-800/80">
        <div className={`${tableWrap} border-0 bg-transparent`}>
        <table className="w-full font-mono text-[13px] sm:min-w-[560px]">
          {/* No Result column — the outcome is already in the numbers (SOL back
              > 0 = hit the winning tile; ORE 0 with a negative net = miss), and
              dropping it lets ORE gain stay visible on mobile. Refund/unsettled
              rounds are the one state that needs a word: it lives in Net ($). */}
          <thead><tr className={theadRow}>
            <th className={th}>Round</th>
            <th className={`${th} text-right`}>Deployed</th>
            <th className={`${th} hidden text-right sm:table-cell`}>Tiles</th>
            <th className={`${th} text-right`} title="ORE credited this round (winner-emission share + any motherlode slice). 0 alongside a negative net = the round missed.">ORE gain</th>
            <th className={`${th} text-right`} title="Pro-rata SOL from the winners' pot — anything above 0 means the round hit the winning tile">SOL back</th>
            <th className={`${th} text-right`} title="Round SOL net + ORE won, both valued at current prices — same accounting as the Net P&L">Net ($)</th>
          </tr></thead>
          <tbody>
            {historyRows.map((h) => {
              const dep = lamportsToSol(h.deployed);
              const stakeW = Number(h.stake_w ?? "0");
              const hit = stakeW > 0;
              const dws = Number(h.deployed_winning_square ?? "0");
              const won = hit && dws > 0
                ? (stakeW * 0.99 + Number(h.total_winnings ?? "0") * (stakeW / dws)) / 1e9
                : 0;
              const rowNetSol = won - dep;
              const tiles = tilesFromMask(h.mask_union);
              // ORE won: same rules as the series — solo rounds pay the full
              // base to the sampled winner, splits pro-rata by winning-tile
              // stake, motherlode pops always pro-rata. A settled round that is
              // not a split IS solo (the API coalesces the pre-#292,600 null),
              // and solo base is credited only to a RECORDED winner — an
              // unrecorded-era solo win is shown as unrecorded, never guessed.
              const share = hit && dws > 0 ? stakeW / dws : 0;
              const baseGrams = Math.max(0, Number(h.total_minted ?? "0") - 20_000_000_000);
              const isSplit = Number(h.is_split) === 1;
              let oreWonRow = 0;
              if (share > 0) {
                if (isSplit) oreWonRow = (baseGrams * share) / 1e11;
                else oreWonRow = h.top_miner != null && h.top_miner === pubkey ? baseGrams / 1e11 : 0;
                oreWonRow += (Number(h.motherlode_paid ?? "0") * share) / 1e11;
              }
              const rowNetUsd = solNow != null && oreNow != null
                ? rowNetSol * solNow + oreWonRow * oreNow : null;
              // Why a solo round shows no ORE: lost the winner sample (correct,
              // winner-take-all) vs the winner simply not being recorded
              // (pre-#292,600 era) — two different truths, two tooltips.
              const soloMiss = share > 0 && !isSplit && h.top_miner != null && h.top_miner !== pubkey;
              const soloUnrecorded = share > 0 && !isSplit && h.top_miner == null;
              return (
                <tr key={h.round_id} className={bodyRow}>
                  <td className={`${td} text-white`}>
                    <Link href={`/stats?section=rounds&round=${h.round_id}`}
                      className="underline decoration-[rgba(91,108,255,0.5)] decoration-dotted underline-offset-4 transition-colors hover:text-[#22E0E6]"
                      title="Open this round on the Rounds tab (participants, tiles, outcome)">
                      #{formatNum(Number(h.round_id))}
                    </Link>
                  </td>
                  <td className={`${td} text-right text-gray-300`}>{formatSol(dep, 3)}</td>
                  <td className={`${td} hidden text-right text-fog-muted sm:table-cell`}>{tiles}</td>
                  <td className={`${td} num text-right ${oreWonRow > 0 ? "text-[#86EFAC]" : "text-fog-dim"}`}>
                    {oreWonRow >= 0.0005 ? (
                      formatNum(oreWonRow, 3)
                    ) : oreWonRow > 0 ? (
                      <span title="Tiny pro-rata share — real but below 0.001 ORE">{"<0.001"}</span>
                    ) : (
                      <span
                        title={soloMiss
                          ? "Solo round — the full ~1 ORE emission went to the one sampled winner, everyone else gets SOL back only"
                          : soloUnrecorded
                            ? "Solo round from before ~#292,600 — the winner wasn't recorded on-chain, so this round's ORE can't be attributed to anyone"
                            : undefined}
                      >
                        ·
                      </span>
                    )}
                  </td>
                  <td className={`${td} num text-right text-gray-300`}>{won > 0 ? formatSol(won, 3) : "·"}</td>
                  <td className={`${td} num text-right ${h.winning_tile == null ? "" : netTone(rowNetUsd ?? rowNetSol)}`}>
                    {h.winning_tile == null
                      ? <span className="text-fog-dim" title="Round not settled (or voided) — no outcome to score yet">refund</span>
                      : rowNetUsd != null
                        ? `${rowNetUsd >= 0 ? "+" : "-"}$${formatNum(Math.abs(rowNetUsd), 2)}`
                        : formatSol(rowNetSol, 3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line px-4 pb-3 pt-1" data-no-capture="true">
        <Pager offset={histOffset} total={historyTotal}
          onPage={setHistOffset} unit="rounds"
          loading={histPage.fetching && !!histPage.data} />
      </div>
      </div>
      </ChartCard>
      )}
    </div>
    </ChartWatermarkContext.Provider>
  );
}

function DerivedMetricCell({
  label,
  value,
  unit,
  hint,
  title,
  className = "",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  /** Hover explanation, used where a metric's name alone invites a wrong reading. */
  title?: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 flex-1 px-5 py-4 ${className}`} title={title}>
      <div
        className="text-[13px] font-medium leading-none text-[#9AA3C8]"
        style={{ fontFamily: "var(--font-subtext)" }}
      >
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="num text-[22px] font-semibold leading-none tracking-tight text-white">
          {value}
        </span>
        {unit && (
          <span
            className="text-[13px] font-medium text-[#9AA3C8]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <div
          className="mt-1.5 text-[12px] leading-none text-[#8B93B4]"
          style={{ fontFamily: "var(--font-subtext)" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function DerivedStreaksCell({
  longestWin,
  longestLoss,
  className = "",
}: {
  longestWin: number;
  longestLoss: number;
  className?: string;
}) {
  return (
    <div className={`min-w-0 flex-1 px-5 py-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="text-[12px] text-[#8B93B4]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            Longest winning streak
          </span>
          <span className="num text-[15px] font-semibold leading-none text-pos">
            {formatNum(longestWin)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="text-[12px] text-[#8B93B4]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            Longest losing streak
          </span>
          <span className="num text-[15px] font-semibold leading-none text-red">
            {formatNum(longestLoss)}
          </span>
        </div>
      </div>
    </div>
  );
}

function DerivedRoundExtremesCell({
  bestUsd,
  worstUsd,
  className = "",
}: {
  bestUsd?: number | null;
  worstUsd?: number | null;
  className?: string;
}) {
  const fmtUsd = (v: number | null | undefined) =>
    v != null ? `${v >= 0 ? "+" : "-"}$${formatNum(Math.abs(v), 2)}` : "·";

  return (
    <div className={`min-w-0 flex-1 px-5 py-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="text-[12px] text-[#8B93B4]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            Best round
          </span>
          <span className={`num text-[15px] font-semibold leading-none ${bestUsd != null ? netTone(bestUsd) : "text-fog-muted"}`}>
            {fmtUsd(bestUsd)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="text-[12px] text-[#8B93B4]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            Worst round
          </span>
          <span className={`num text-[15px] font-semibold leading-none ${worstUsd != null ? netTone(worstUsd) : "text-fog-muted"}`}>
            {fmtUsd(worstUsd)}
          </span>
        </div>
      </div>
    </div>
  );
}

function LifetimeCell({
  label,
  value,
  unit,
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  className?: string;
}) {
  return (
    <div className={`px-4 py-3.5 ${className}`}>
      <div
        className="text-[13px] font-medium leading-none text-[#9AA3C8]"
        style={{ fontFamily: "var(--font-subtext)" }}
      >
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="num text-[22px] font-semibold leading-none tracking-tight text-white">
          {value}
        </span>
        {unit && (
          <span
            className="text-[13px] font-medium text-[#9AA3C8]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The round in which the program began recording the winner-take-all winner.
 *
 * Below it a solo round's ORE base is credited to NOBODY: the chain never said who won,
 * and inventing a pro-rata split would be fabrication. That single rule is the whole
 * reason this card's ORE total can sit far below the lifetime census, so the card states
 * it outright rather than leaving two numbers to look like a contradiction.
 * Mirrors DEPLOY-era gating in the analytics service (`top_miner.first_valid_round`).
 */
const SOLO_WINNER_FIRST_ROUND = 292_659;

function MinerTrend({ pubkey, series, derived, pricesNow, oreLifetime, lifetimePnlUsd, roundsWin, setRoundsWin, refreshing }: {
  pubkey: string;
  series: OreMinerDetail["series"];
  derived: OreMinerDetail["derived"];
  pricesNow: OreMinerDetail["prices_now"];
  oreLifetime: number | null;
  lifetimePnlUsd: number | null;
  roundsWin: string; setRoundsWin: (v: string) => void; refreshing?: boolean;
}) {
  const win = roundsWin;
  const setWin = setRoundsWin;
  const [cur, setCur] = useState<"sol" | "usd">("usd");
  // "all" -> the whole (possibly bucketed) series; each point may sum n rounds
  const slice = win === "all" ? series : series.slice(-Math.min(Number(win), series.length));
  // USD = current-rate accounting, consistent with the Net P&L hero: each
  // round's SOL leg and ORE leg valued at TODAY'S prices (not round-time).
  // Falls back to the API's round-time net_usd only when spot is unavailable.
  const solNow = pricesNow?.sol_usd ?? null;
  const oreNow = pricesNow?.ore_usd ?? null;
  const usdOf = (p: OreMinerDetail["series"][number]): number | null =>
    solNow != null && oreNow != null ? p.net_sol * solNow + p.ore_won * oreNow : p.net_usd;
  const hasUsd = (solNow != null && oreNow != null) || slice.some((p) => p.net_usd != null);
  // cumulative recomputed over the visible window so it starts at 0.
  let cum = 0;
  const pts: TPt[] = slice.map((p) => {
    cum += cur === "usd" ? usdOf(p) ?? p.net_sol : p.net_sol;
    return { label: `#${formatNum(p.round_id)}`, value: cum };
  });
  const nRounds = slice.reduce((a, p) => a + (p.n ?? 1), 0);
  const hitsWin = slice.reduce((a, p) => a + (p.hits ?? (p.hit ? 1 : 0)), 0);
  const hitRateWin = nRounds > 0 ? hitsWin / nRounds : null;
  const oreWonWin = slice.reduce((a, p) => a + p.ore_won, 0);
  const netSolWin = slice.reduce((a, p) => a + p.net_sol, 0);
  const oreCostWin = oreWonWin > 0 && netSolWin < 0 ? -netSolWin / oreWonWin : null;
  const avgPerRound = nRounds > 0 ? cum / nRounds : 0;

  // Mean net on HIT rounds vs MISS rounds. "Hit" means the wallet had stake on the
  // winning tile, NOT that the round made money: a hit still pays for the 24 losing
  // tiles, so the figure can land either side of zero. Labelled "hit"/"miss" rather than
  // "win"/"loss" for exactly that reason.
  //
  // Two sources, preferring the one that actually matches what the chart is showing:
  //  - An UNBUCKETED window (every point is one round) is summed here, so the figure
  //    tracks the selected timeframe exactly.
  //  - A BUCKETED window cannot be summed here at all: a bucket mixing hits and misses
  //    carries a single net for both outcomes. Reading those points once produced an
  //    average over whichever pure buckets happened to exist: 22% of one wallet's rounds,
  //    and no miss figure at all. So we take the server's per-round aggregate instead,
  //    which is exact over the whole fetched history, and say so in the hint rather than
  //    passing a full-history number off as a window number.
  const sliceUnbucketed = slice.every((p) => (p.n ?? 1) === 1);
  let avgWin: number | null = null;
  let avgLoss: number | null = null;
  let winRounds = 0, lossRounds = 0;
  let avgScopeIsLifetime = false;
  if (sliceUnbucketed) {
    let hitSum = 0, missSum = 0;
    for (const p of slice) {
      const net = cur === "usd" ? usdOf(p) ?? p.net_sol : p.net_sol;
      if (p.hit) { hitSum += net; winRounds += 1; }
      else { missSum += net; lossRounds += 1; }
    }
    avgWin = winRounds > 0 ? hitSum / winRounds : null;
    avgLoss = lossRounds > 0 ? missSum / lossRounds : null;
  } else if (derived?.hit_rounds != null && derived?.miss_rounds != null) {
    const legUsd = (netSol: number, ore: number): number | null =>
      cur === "sol" ? netSol : solNow != null && oreNow != null ? netSol * solNow + ore * oreNow : null;
    winRounds = derived.hit_rounds;
    lossRounds = derived.miss_rounds;
    const hv = legUsd(derived.hit_net_sol ?? 0, derived.hit_ore_won ?? 0);
    const mv = legUsd(derived.miss_net_sol ?? 0, derived.miss_ore_won ?? 0);
    avgWin = winRounds > 0 && hv != null ? hv / winRounds : null;
    avgLoss = lossRounds > 0 && mv != null ? mv / lossRounds : null;
    avgScopeIsLifetime = true;
  }
  const avgScopeNote = avgScopeIsLifetime ? " · full history" : "";

  // ── Reconciliation against the lifetime census ────────────────────────────────
  // This card sums REBUILT rounds; the hero above reads the on-chain census. The SOL
  // legs agree to within ~0.2 SOL in 29,000 (verified), so any gap between the two
  // headline dollar figures is the ORE leg and nothing else. Surfacing that delta and
  // naming its cause is the difference between a documented limitation and an apparent
  // contradiction in our own numbers.
  const windowLoRound = slice.length ? slice[0].round_id : null;
  const spansUnrecordedSolo = windowLoRound != null && windowLoRound < SOLO_WINNER_FIRST_ROUND;
  const oreGap = oreLifetime != null ? oreLifetime - oreWonWin : null;
  // Only a whole-history window can be compared to a lifetime total.
  const oreGapMeaningful = oreGap != null && win === "all" && Math.abs(oreGap) > Math.max(1, oreLifetime! * 0.005);
  const oreGapUsd = oreGap != null && oreNow != null ? oreGap * oreNow : null;

  // Best / worst in the visible chart window, same current-rate USD.
  let bestUsd: number | null = null;
  let worstUsd: number | null = null;
  for (const p of slice) {
    const v = usdOf(p);
    if (v == null) continue;
    if (bestUsd == null || v > bestUsd) bestUsd = v;
    if (worstUsd == null || v < worstUsd) worstUsd = v;
  }
  // Fall back to derived extremes (revalued at current prices when possible).
  const derivedUsd = (r: { net_sol: number; ore_won: number; net_usd: number | null } | null | undefined): number | null =>
    r == null ? null : solNow != null && oreNow != null ? r.net_sol * solNow + r.ore_won * oreNow : r.net_usd;
  if (bestUsd == null) bestUsd = derivedUsd(derived?.best_round);
  if (worstUsd == null) worstUsd = derivedUsd(derived?.worst_round);

  return (
    <ChartCard
      title={`${pubkey.slice(0, 4)}'s last ${formatNum(nRounds)} rounds`}
      subtitle={cur === "usd" && solNow != null
        ? "Play, consistency and streaks in the captured window, rebuilt round by round. SOL is exact; ORE is reconstructed and can differ from the lifetime figure above. Reconciled below."
        : "Play, consistency and streaks in the captured window, rebuilt round by round."}
      right={
        <div className="flex flex-wrap items-center gap-2" data-no-capture="true">
          <Refreshing active={!!refreshing} />
          <div className="flex items-center gap-2">
            <span
              className="text-[12px] font-medium text-[#8B93B4]"
              style={{ fontFamily: "var(--font-subtext)" }}
            >
              Timeframe
            </span>
            <SegmentedControl aria-label="Timeframe" variant="loose"
              items={[{ id: "100", label: "100" }, { id: "500", label: "500" }, { id: "1000", label: "1000" }, { id: "2500", label: "2500" }, { id: "5000", label: "5000" }, { id: "all", label: "All" }]}
              value={win} onChange={setWin} />
          </div>
          {hasUsd && (
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-medium text-[#5A6284]"
                style={{ fontFamily: "var(--font-subtext)" }}
              >
                Show
              </span>
              {/* appearance-none + own chevron: the native arrow crowded the
                  right edge and the default chrome read like a toggle button. */}
              <span className="relative inline-flex">
                <select
                  aria-label="Show currency"
                  value={cur}
                  onChange={(e) => setCur(e.target.value as "sol" | "usd")}
                  title="USD values both legs (SOL + ORE) at current prices"
                  className="appearance-none rounded-lg border border-[rgba(91,108,255,0.3)] bg-ink-900 py-2 pl-3 pr-8 text-[12px] font-semibold text-[#EAECF6] transition-colors hover:border-[rgba(91,108,255,0.55)] focus:border-steel focus:outline-none"
                  style={{ fontFamily: "var(--font-subtext)" }}
                >
                  <option value="sol">SOL</option>
                  <option value="usd">USD</option>
                </select>
                <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" fill="none"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8B93B4]">
                  <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-3">
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

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <DerivedMetricCell
            label="ORE won"
            value={formatNum(oreWonWin, 3)}
            unit="ORE"
            className="rounded-xl border border-line bg-[rgba(255,192,97,0.07)]"
          />
          {derived && (
            <DerivedMetricCell
              label="Average bet"
              value={formatSol(derived.avg_bet_sol, 4)}
              unit="SOL"
              hint="per round"
              className="rounded-xl border border-line bg-[rgba(34,224,230,0.06)]"
            />
          )}
          <DerivedMetricCell
            label="Hit rate"
            value={hitRateWin != null ? formatPct(hitRateWin) : "·"}
            hint={hitRateWin != null ? `${formatNum(hitsWin)} / ${formatNum(nRounds)} rounds` : undefined}
            className="rounded-xl border border-line bg-[rgba(154,107,255,0.07)]"
          />
        </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <DerivedMetricCell
            label="Avg per round"
            value={
              <span className={netTone(avgPerRound)}>
                {cur === "usd" ? "$" : ""}{formatNum(avgPerRound, cur === "usd" ? 2 : 4)}
              </span>
            }
            unit={cur === "sol" ? "SOL" : undefined}
            className="rounded-xl border border-line bg-[rgba(91,108,255,0.07)]"
          />
          <DerivedMetricCell
            label="Avg hit round"
            title="Mean net across rounds where this wallet had stake on the winning tile: SOL returned minus the whole round's deploy, plus any ORE won. A hit still pays for the losing tiles, so this is not an 'average win' and can land either side of zero."
            value={
              avgWin != null ? (
                <span className={netTone(avgWin)}>
                  {avgWin >= 0 ? "+" : ""}{cur === "usd" ? "$" : ""}{formatNum(avgWin, cur === "usd" ? 2 : 4)}
                </span>
              ) : "·"
            }
            unit={avgWin != null && cur === "sol" ? "SOL" : undefined}
            hint={avgWin != null ? `${formatNum(winRounds)} hit round${winRounds === 1 ? "" : "s"}${avgScopeNote}` : undefined}
            className="rounded-xl border border-line bg-[rgba(74,222,128,0.05)]"
          />
          <DerivedMetricCell
            label="Avg miss round"
            title="Mean net across rounds where this wallet had no stake on the winning tile, so the full deploy is lost."
            value={
              avgLoss != null ? (
                <span className={netTone(avgLoss)}>
                  {avgLoss >= 0 ? "+" : ""}{cur === "usd" ? "$" : ""}{formatNum(avgLoss, cur === "usd" ? 2 : 4)}
                </span>
              ) : "·"
            }
            unit={avgLoss != null && cur === "sol" ? "SOL" : undefined}
            hint={avgLoss != null ? `${formatNum(lossRounds)} miss round${lossRounds === 1 ? "" : "es"}${avgScopeNote}` : undefined}
            className="rounded-xl border border-line bg-[rgba(255,90,200,0.05)]"
          />
        </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <DerivedMetricCell
            label="Total net"
            title="Sum of the rebuilt rounds in this window: exact SOL plus reconstructed ORE. The Net P&L at the top of the page is a different measurement, the on-chain lifetime census, so the two agree only where every ORE win is attributable."
            value={
              <span className={netTone(cum)}>
                {cum >= 0 ? "+" : ""}{cur === "usd" ? "$" : ""}{formatNum(cum, cur === "usd" ? 2 : 3)}
              </span>
            }
            unit={cur === "sol" ? "SOL" : undefined}
            hint={oreGapMeaningful ? "rebuilt rounds; differs from lifetime, see below" : "sum of captured rounds"}
            className="rounded-xl border border-line bg-[rgba(74,222,128,0.05)]"
          />
          <DerivedMetricCell
            label="ORE cost"
            value={
              oreCostWin != null ? formatNum(oreCostWin, 3)
                : oreWonWin > 0 ? <span className="text-pos">FREE</span> : "·"
            }
            unit={oreCostWin != null ? "SOL/ORE" : undefined}
            hint={oreCostWin != null ? "this window" : oreWonWin > 0 ? "net profit" : "no ORE won"}
            className="rounded-xl border border-line bg-[rgba(255,90,200,0.05)]"
          />
        </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {derived && (
            <DerivedStreaksCell
              longestWin={derived.longest_hit_streak}
              longestLoss={derived.longest_miss_streak}
              className="rounded-xl border border-line bg-[rgba(74,222,128,0.05)]"
            />
          )}
          <DerivedRoundExtremesCell
            bestUsd={bestUsd}
            worstUsd={worstUsd}
            className="rounded-xl border border-line bg-[rgba(255,192,97,0.07)]"
          />
        </div>

      {/* The reconciliation itself. Two honest measurements of the same wallet can
          disagree; what is not acceptable is letting a reader discover that on their own
          and conclude the data is wrong. State the gap, price it, and name its cause. */}
      {oreGapMeaningful && (
        <div className="rounded-xl border border-line bg-[rgba(255,192,97,0.05)] px-5 py-4">
          <div
            className="text-[13px] font-medium leading-none text-[#EAECF6]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            Why this total differs from the Net P&amp;L above
          </div>
          <div
            className="mt-3 flex flex-col gap-2 text-[12.5px] leading-[1.55] text-[#A8B0CC]"
            style={{ fontFamily: "var(--font-subtext)" }}
          >
            <div className="num text-[13px] text-[#EAECF6]">
              ORE rebuilt here {formatNum(oreWonWin, 1)}
              <span className="text-[#5A6284]"> · </span>
              lifetime on-chain {formatNum(oreLifetime!, 1)}
              <span className="text-[#5A6284]"> · </span>
              <span className="text-[#FFC061]">
                rebuilt is {oreGap! > 0 ? "short by" : "over by"} {formatNum(Math.abs(oreGap!), 1)} ORE
                {oreGapUsd != null && ` (${formatNum(Math.abs(oreGapUsd), 0)} USD)`}
              </span>
            </div>
            <div>
              Both cards use the same SOL figure, per-tile stake reconstruction, which
              reconciles to the on-chain census within a fraction of a percent. The gap between
              this card&apos;s total and the Net P&amp;L above is <em>entirely</em> the ORE line above.
              Only rounds present in the on-chain event tape are rebuilt here.
            </div>
            {spansUnrecordedSolo ? (
              <div>
                This window reaches back to round #{formatNum(windowLoRound!)}, before the program
                started recording the winner-take-all winner at #{formatNum(SOLO_WINNER_FIRST_ROUND)}.
                In those earlier rounds the chain never published <em>who</em> took the 1 ORE base, so
                it is credited to nobody rather than guessed. This card therefore understates ORE for
                this wallet; the lifetime figure above counts it and is the one to trust.
              </div>
            ) : (
              <div>
                Per-round ORE is apportioned from each round&apos;s minted base, the wallet&apos;s share of
                the winning tile, and any motherlode payout. Apportioning round by round can drift
                from the wallet&apos;s own on-chain lifetime counter in either direction. Where the two
                disagree, that counter (the Net P&amp;L above) is the authoritative figure.
              </div>
            )}
            {lifetimePnlUsd != null && (
              <div className="num text-[#8B93B4]">
                Authoritative lifetime Net P&amp;L:{" "}
                <span className={netTone(lifetimePnlUsd)}>
                  {lifetimePnlUsd >= 0 ? "+" : "−"}${formatNum(Math.abs(lifetimePnlUsd), 2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </ChartCard>
  );
}
