"use client";

import { Fragment, useContext, useEffect, useState } from "react";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { Refreshing } from "@/components/primitives/Skeleton";
import { ChartCard } from "@/components/stats/Charts";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchOreRounds, fetchOreParticipants,
  lamportsToSol, roundTileDeployRange, roundMaxSpreadFrac,
} from "@/lib/oreStats";
import { formatSol, formatNum, formatPct } from "@/lib/format";
import {
  PAGE, POP_PAGE, Pager, SkeletonRows, Caveats, solOf, netTone,
  tableWrap, theadRow, th, td, bodyRow, oursRow,
  fmtDust, fmtPctDust,
  MinerNavContext,
} from "./shared";

// Per-round participant drill-down (the Rounds-tab chevron): every deployer in a
// settled round + their P&L. Fed by /ore/participants — DeployEvent-derived, so it
// gracefully reports "still ingesting" for rounds the forward tip hasn't reached.
function RoundParticipants({ roundId }: { roundId: number }) {
  const [sort, setSort] = useState<"deployed" | "roi" | "won">("deployed");
  const [shown, setShown] = useState(POP_PAGE);
  const goToMiner = useContext(MinerNavContext);
  const dd = usePolled(() => fetchOreParticipants(roundId, sort, 4000), 300_000, [roundId, sort]);
  useEffect(() => { setShown(POP_PAGE); }, [roundId, sort]);
  const d = dd.data;
  if (dd.loading && !d) return <div className="px-3 py-4 text-[12px] text-gray-400">Loading participants…</div>;
  if (d && !d.has_participants)
    return (
      <div className="px-3 py-4 text-[12px] text-gray-400">
        Participant breakdown isn&apos;t available yet — {d.reason ?? "no deploy history"}.
      </div>
    );
  const wt = d?.round.winning_tile ?? null;
  return (
    <div className="space-y-3 px-1 py-3 sm:px-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12px] text-gray-300">
          <span className="text-white">{formatNum(d?.participants_total ?? 0)}</span> miners deployed this round
          {d?.winners_count != null && wt != null && (
            <> · <span className="text-pos">{formatNum(d.winners_count)}</span> hit the winning tile #{wt + 1}</>
          )}
        </div>
        <SegmentedControl
          aria-label="sort participants"
          items={[{ id: "deployed", label: "By deploy" }, { id: "roi", label: "By ROI" }, { id: "won", label: "Winners" }]}
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
              <th className={`${th} text-right`}>Cost (SOL)</th>
              <th className={`${th} text-right`}>Share</th>
              <th className={`${th} text-right`}>SOL back</th>
              <th className={`${th} hidden text-right sm:table-cell`}>ORE won</th>
              <th className={`${th} text-right`}>ROI</th>
            </tr>
          </thead>
          <tbody>
            {(d?.participants ?? []).slice(0, shown).map((p) => (
              <tr key={p.pubkey} className={p.is_solo_winner ? oursRow : bodyRow}>
                <td className={`${td} text-white`}>
                  <span className="inline-flex items-center gap-1.5">
                    <CopyAddress address={p.pubkey} />
                    <button
                      type="button"
                      onClick={() => goToMiner(p.pubkey)}
                      title="Search this miner"
                      aria-label={`Search miner ${p.pubkey}`}
                      className="text-gray-500 transition-colors hover:text-[#22E0E6]"
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path d="M4.25 7.75 L7.75 4.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        <path d="M5.25 4.25 H7.75 V6.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {p.won && <span title="staked on the winning tile" className="rounded bg-pos/15 px-1 text-[10px] text-pos">won</span>}
                    {p.is_solo_winner && <span title="also won the round's separate ~1-ORE base prize" className="rounded bg-gold/15 px-1 text-[10px] text-gold">solo ORE</span>}
                  </span>
                </td>
                <td className={`${td} num hidden text-right text-gray-300 sm:table-cell`}>{p.tiles_covered}</td>
                <td className={`${td} num text-right text-gray-300`}>{fmtDust(p.deployed_sol, 2)}</td>
                <td className={`${td} num text-right text-gray-300`}>{fmtPctDust(p.share)}</td>
                <td className={`${td} num text-right ${p.sol_return > 0 ? "text-gray-200" : "text-gray-600"}`}>
                  {p.sol_return > 0 ? fmtDust(p.sol_return, 3) : "·"}
                </td>
                <td className={`${td} num hidden text-right sm:table-cell ${p.ore_won > 0.005 ? "text-gold" : "text-gray-600"}`}>
                  {p.ore_won > 0.005 ? formatNum(p.ore_won, p.ore_won >= 10 ? 0 : 2) : "·"}
                </td>
                <td className={`${td} num text-right ${p.roi == null ? "text-gray-500" : netTone(p.roi - 1)}`}>
                  {p.roi == null ? "·" : `${formatNum(p.roi, 1)}×`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(d?.participants?.length ?? 0) > shown && (
        <div className="flex justify-center">
          <button
            onClick={() => setShown((n) => n + POP_PAGE)}
            className="rounded-lg border border-line px-4 py-1.5 font-mono text-[12px] text-gray-300 transition-colors hover:border-steel hover:text-white"
          >
            Load {Math.min(POP_PAGE, (d?.participants?.length ?? 0) - shown)} more · {formatNum(shown)} of {formatNum(d?.participants?.length ?? 0)}
          </button>
        </div>
      )}
      <p className="px-1 text-[11px] leading-relaxed text-gray-500">
        Every miner that deployed this round, by SOL staked. <span className="text-pos">won</span> = staked on the winning
        tile{wt != null ? ` #${wt + 1}` : ""}; <span className="text-gray-400">SOL back</span> is their pro-rata slice of the
        winners&apos; pot; <span className="text-gold">ORE won</span> is their cut of the ~1-ORE winner emission (all to the
        solo winner, or shared pro-rata on a split round) plus any motherlode slice on a pop. ROI is the round&apos;s gross
        return over what they deployed, at round-time prices. Sorted by{" "}
        {sort === "roi" ? "ROI" : sort === "won" ? "winners first" : "deploy size"}.
      </p>
    </div>
  );
}

// ── Rounds: recent spine table ───────────────────────────────────────────────
export function RoundsTab() {
  const [offset, setOffset] = useState(0);
  const [openRound, setOpenRound] = useState<number | null>(null);
  // Miners + tile spread are computed server-side by /ore/rounds (deploy events,
  // falling back to the round's live-PDA tile columns), so the row already carries
  // total_miners + tile_max/tile_min — no per-round detail fetch needed.
  const rounds = usePolled(() => fetchOreRounds(PAGE, offset), 20_000, [offset]);
  const rs = rounds.data?.rounds ?? [];
  const total = rounds.data?.total ?? 0;

  return (
    <div className="space-y-5">
      <ChartCard subtitle="Tap a settled round to see every participant and their P&L. Split = jackpot shared across winners. Max spread = hottest minus coldest tile; % = spread ÷ coldest."
        right={<Refreshing active={rounds.fetching && !!rounds.data} label="loading" />}>
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
              {rs.map((r) => {
                const rid = Number(r.round_id);
                // Only settled rounds (winning tile recorded) are drillable — the
                // live in-flight round is skipped, exactly as asked.
                const drillable = r.winning_tile != null;
                const open = drillable && openRound === rid;
                return (
                <Fragment key={r.round_id}>
                <tr
                  className={`${bodyRow} ${drillable ? "cursor-pointer" : ""}`}
                  onClick={drillable ? () => setOpenRound(open ? null : rid) : undefined}
                >
                  <td className={`${td} text-white`}>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-[9px] text-gray-500">{drillable ? (open ? "▾" : "▸") : ""}</span>
                      #{formatNum(rid)}
                    </span>
                  </td>
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
                      const range = roundTileDeployRange(r);
                      return range != null ? `${formatSol(lamportsToSol(range.spread.toString()), 3)} SOL` : "·";
                    })()}
                  </td>
                  <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>
                    {(() => {
                      const range = roundTileDeployRange(r);
                      const frac = range ? roundMaxSpreadFrac(range) : null;
                      return frac != null ? formatPct(frac, 2) : "·";
                    })()}
                  </td>
                </tr>
                {open && (
                  <tr className="bg-black/20">
                    {/* w-0 min-w-full: keeps the nested participant table from forcing the
                        outer rounds table wider than its container on mobile (see Miners). */}
                    <td colSpan={8} className="p-0"><div className="w-0 min-w-full"><RoundParticipants roundId={rid} /></div></td>
                  </tr>
                )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager offset={offset} total={total} onPage={setOffset} unit="rounds" loading={rounds.loading && !rounds.data} />
      </ChartCard>
      <Caveats provenance={rounds.provenance} error={rounds.error} onRetry={rounds.refresh} />
    </div>
  );
}
