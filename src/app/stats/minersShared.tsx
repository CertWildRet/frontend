"use client";

/** Shared miner table types + expandable rows for Miner Rankings. */
import { Fragment } from "react";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { ServiceChip } from "@/components/primitives/ServiceChip";
import { MinerDetail } from "@/components/stats/MinerDetail";
import { lamportsToSol, oreGramsToOre, type OreServiceTag } from "@/lib/oreStats";
import { formatSol, formatNum } from "@/lib/format";
import {
  SkeletonRows, netTone,
  tableWrap, theadRow, th, td, bodyRow, oursRow,
} from "./shared";

export const RANKING_SORTS: { id: string; label: string }[] = [
  { id: "net_sol", label: "Net SOL" },
  { id: "earned", label: "SOL earned" },
  { id: "deployed", label: "SOL deployed" },
  { id: "ore", label: "ORE earned" },
  { id: "roi", label: "Gross ROI" },
];

export const MIN_DEP = [0, 1, 10, 100];

export type MinerRow = {
  authority: string;
  is_ours: boolean;
  deployed: string;
  earned: string;
  ore: string;
  net_sol: string;
  roi: number | null;
  unclaimed: string | null;
  refined: string | null;
  service?: OreServiceTag | null;
};

export function MinerTable({
  rows,
  offset,
  loading,
  mode,
  expanded,
  onToggle,
}: {
  rows: MinerRow[];
  offset: number;
  loading: boolean;
  mode: "leaderboard" | "miners";
  expanded: string | null;
  onToggle: (authority: string | null) => void;
}) {
  const showRoi = mode === "leaderboard";
  return (
    <div className={tableWrap}>
      <table className="w-full font-mono text-[13px] sm:min-w-[640px]">
        <thead>
          <tr className={theadRow}>
            <th className={th}>#</th>
            <th className={th}>Miner</th>
            <th className={`${th} hidden text-right sm:table-cell`}>Deployed</th>
            <th className={`${th} hidden text-right sm:table-cell`}>Earned</th>
            <th className={`${th} text-right`}>Net SOL</th>
            <th className={`${th} hidden text-right sm:table-cell`}>ORE</th>
            {showRoi ? (
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
          {loading && <SkeletonRows cols={8} />}
          {rows.map((m, i) => {
            const net = lamportsToSol(m.net_sol);
            const isOpen = expanded === m.authority;
            return (
              <Fragment key={m.authority}>
                <tr
                  className={`${m.is_ours ? oursRow : bodyRow} cursor-pointer`}
                  title="Click to expand this wallet"
                  onClick={() => onToggle(isOpen ? null : m.authority)}
                >
                  <td className={`${td} text-fog-muted`}>
                    <span className={`mr-1 inline-block transition-transform ${isOpen ? "rotate-90" : ""}`}>▸</span>
                    {offset + i + 1}
                  </td>
                  <td className={`${td} ${m.is_ours ? "text-steel" : "text-white"}`}>
                    <CopyAddress address={m.authority} />{m.is_ours ? " ◆ ours" : ""}
                    <ServiceChip service={m.service} compact className="ml-1.5" />
                  </td>
                  <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatSol(lamportsToSol(m.deployed), 1)}</td>
                  <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatSol(lamportsToSol(m.earned), 1)}</td>
                  <td className={`${td} num text-right ${netTone(net)}`}>{net >= 0 ? "+" : ""}{formatSol(net, 2)}</td>
                  <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatNum(oreGramsToOre(m.ore), showRoi ? 0 : 1)}</td>
                  {showRoi ? (
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
                    {/* w-0 min-w-full: the wrapper collapses to 0 during the table's
                        intrinsic-width pass so a full-width nested panel can't force
                        the leaderboard wider than its container on mobile. */}
                    <td colSpan={8} className="bg-white/[0.015] px-2 py-3 sm:px-4">
                      <div className="w-0 min-w-full">
                        <MinerDetail pubkey={m.authority} />
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
  );
}
