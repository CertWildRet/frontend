"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { RowsSkeleton } from "@/components/primitives/Skeleton";
import { ChartCard } from "@/components/stats/Charts";
import { usePolled } from "@/hooks/useOreStats";
import { fetchOreCompetition } from "@/lib/oreStats";
import { formatSol } from "@/lib/format";
import {
  SkeletonRows, Caveats,
  tableWrap, theadRow, th, td, bodyRow, oursRow,
} from "./shared";

// ── Round Analysis: competition — top players + "what deploy gets me top-N" ──
const COMPETE_WINDOWS = [10, 25, 50];
const RANK_CHOICES = [1, 3, 5, 10, 20];
export function RoundAnalysisTab() {
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
      <ChartCard title="Your competition" subtitle={`The persistent top wallets across the last ${n} rounds: who you're up against every round.`}>
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
                        className="ml-1.5 rounded border border-line px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#B7BDD2]"
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
