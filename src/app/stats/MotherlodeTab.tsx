"use client";

import { Fragment, useContext, useEffect, useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { AreaLine, ChartCard, type Pt } from "@/components/stats/Charts";
import { MotherlodeReachChart } from "@/components/stats/TrendCharts";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchOreMotherlode, fetchOreMotherlodePop,
  motherlodeOdds, oreGramsToOre,
} from "@/lib/oreStats";
import { formatNum, formatPct } from "@/lib/format";
import {
  PAGE, POP_PAGE, Pager, SkeletonRows, Caveats, solOf, short, netTone,
  tableWrap, theadRow, th, td, bodyRow, oursRow,
  fmtUsd, fmtDust, fmtPctDust, fmtWhen, popEcon,
  MinerNavContext,
} from "./shared";

// Per-pop drill-down: who ACTUALLY shared the pool (pro-rata to winning-tile
// stakes) + each sharer's ROI. Lazy: only fetches when a row is expanded. This is
// the detail hawg.win can't show — winning the solo ORE says nothing about how
// much of the motherlode you took.
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

export function MotherlodeTab() {
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
                          {/* w-0 min-w-full: keeps the nested drill-down table from forcing
                              the outer table wider than its container on mobile (see Miners). */}
                          <div className="w-0 min-w-full">
                            <PopDrilldown roundId={rid} />
                          </div>
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
