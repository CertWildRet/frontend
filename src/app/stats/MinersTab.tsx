"use client";

import { Fragment, useEffect, useState } from "react";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { Refreshing } from "@/components/primitives/Skeleton";
import { HBars, ChartCard } from "@/components/stats/Charts";
import { MinerDetail } from "@/components/stats/MinerDetail";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchOreLeaderboard, fetchOreMiners,
  lamportsToSol, oreGramsToOre,
  type OreEnvelope, type OreBands,
} from "@/lib/oreStats";
import { formatSol, formatNum, formatPct } from "@/lib/format";
import {
  PAGE, Pager, SkeletonRows, Caveats, netTone,
  tableWrap, theadRow, th, td, bodyRow, oursRow,
  type MinerSeed,
} from "./shared";

// ── Search Miners: ranked census explorer (leaderboard + address search) ─────
const MINER_SORTS: { id: string; label: string }[] = [
  { id: "net_sol", label: "Net SOL" },
  { id: "earned", label: "SOL earned" },
  { id: "deployed", label: "SOL deployed" },
  { id: "ore", label: "ORE earned" },
  { id: "roi", label: "Gross ROI" },
  { id: "unclaimed", label: "Unclaimed ORE" },
  { id: "refined", label: "Refined ORE" },
  { id: "lifetime_ore", label: "Lifetime ORE" },
  { id: "lifetime_sol", label: "Lifetime SOL" },
];
/** Sorts served by /ore/leaderboard (supports min-deployed filter + ROI bands). */
const LB_SORT_IDS = new Set(["net_sol", "earned", "deployed", "ore", "roi"]);
/** Map leaderboard-only sort ids onto /ore/miners when searching by address. */
const MINERS_SORT_FALLBACK: Record<string, string> = {
  earned: "lifetime_sol",
  ore: "lifetime_ore",
  roi: "net_sol",
};
const MIN_DEP = [0, 1, 10, 100];

type MinerRow = {
  authority: string;
  is_ours: boolean;
  deployed: string;
  earned: string;
  ore: string;
  net_sol: string;
  roi: number | null;
  unclaimed: string | null;
  refined: string | null;
};

// Unified shape for both fetch branches (leaderboard census vs live miners
// search) so usePolled binds a single envelope type.
type MinersTabData = {
  mode: "leaderboard" | "miners";
  snapshot_ts: string | null;
  total: number;
  bands: OreBands | null;
  net_positive_pct: number | null;
  rows: MinerRow[];
};

export function MinersTab({ seed }: { seed?: MinerSeed | null }) {
  const [sort, setSort] = useState("net_sol");
  const [minDep, setMinDep] = useState(0);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setOffset(0); }, 350);
    return () => clearTimeout(t);
  }, [qInput]);
  // Seeded from another tab (e.g. a motherlode sharer's jump arrow): fill the
  // search bar AND set the query immediately (skip the debounce) so the jump lands
  // on results at once. Keyed on seed.n so re-clicking the same wallet re-fires.
  useEffect(() => {
    if (seed) { setQInput(seed.pubkey); setQ(seed.pubkey); setOffset(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.n]);

  const useLeaderboard = LB_SORT_IDS.has(sort) && !q;
  const polled = usePolled(async (): Promise<OreEnvelope<MinersTabData>> => {
    if (useLeaderboard) {
      const env = await fetchOreLeaderboard(sort, minDep, offset);
      const rows: MinerRow[] = (env.data.top ?? []).map((m) => ({
        authority: m.authority,
        is_ours: m.is_ours,
        deployed: m.lifetime_deployed,
        earned: m.lifetime_rewards_sol,
        ore: m.lifetime_rewards_ore,
        net_sol: m.net_sol,
        roi: m.roi,
        unclaimed: null,
        refined: null,
      }));
      return {
        ...env,
        data: {
          mode: "leaderboard" as const,
          snapshot_ts: env.data.snapshot_ts,
          total: env.data.total,
          bands: env.data.bands,
          net_positive_pct: env.data.net_positive_pct,
          rows,
        },
      };
    }
    const minersSort = MINERS_SORT_FALLBACK[sort] ?? sort;
    const env = await fetchOreMiners({ sort: minersSort, offset, q, limit: PAGE });
    const rows: MinerRow[] = (env.data.miners ?? []).map((mn) => ({
      authority: mn.authority,
      is_ours: mn.is_ours,
      deployed: mn.deployed,
      earned: mn.lifetime_sol,
      ore: mn.lifetime_ore,
      net_sol: mn.net_sol,
      roi: null,
      unclaimed: mn.unclaimed_ore,
      refined: mn.refined_ore,
    }));
    return {
      ...env,
      data: {
        mode: "miners" as const,
        snapshot_ts: env.data.snapshot_ts,
        total: env.data.total,
        bands: null,
        net_positive_pct: null,
        rows,
      },
    };
  }, 0, [useLeaderboard, sort, minDep, offset, q]);

  const d = polled.data;
  const total = d?.total ?? 0;
  const b = d?.bands ?? null;
  const bandRows = b
    ? [
        { label: "#1", value: b.top1 }, { label: "top 5%", value: b.b05 }, { label: "top 10%", value: b.b10 },
        { label: "top 20%", value: b.b20 }, { label: "top 30%", value: b.b30 }, { label: "top 50%", value: b.b50 },
        { label: "all", value: b.avg_all },
      ]
    : [];
  const sortLabel = MINER_SORTS.find((x) => x.id === sort)?.label ?? sort;
  const rows = d?.rows ?? [];
  const exactAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q) ? q : null;

  // A searched wallet filters the table to its own row — auto-expand it there
  // instead of rendering a second copy of the panel above the table.
  useEffect(() => {
    if (exactAddress) setExpanded(exactAddress);
  }, [exactAddress]);

  return (
    <div className="space-y-5">
      {exactAddress && (
        <button type="button" onClick={() => setQInput("")}
          className="flex items-center gap-1.5 rounded-md border border-line bg-ink-800 px-3 py-1.5 font-mono text-[13px] font-semibold text-fog-muted transition-colors hover:border-steel hover:text-white">
          <span aria-hidden>←</span> Back to all miners
        </button>
      )}
      {/* census-missing wallets have no table row to expand (event history only) */}
      {exactAddress && !polled.loading && rows.length === 0 && <MinerDetail pubkey={exactAddress} />}
      <ChartCard
        title="Miners"
        subtitle={d?.snapshot_ts
          ? `On-chain lifetime census ${new Date(d.snapshot_ts).toLocaleDateString()} · ${formatNum(total)} miners · ranked by ${sortLabel}`
          : "loading census…"}
        right={
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="search address…"
            className="w-full rounded-md border border-line bg-ink-800 px-2.5 py-1.5 font-mono text-[13px] text-white placeholder:text-fog-muted focus:border-steel focus:outline-none sm:w-64" />
        }>
        {d?.net_positive_pct != null && (
          <div className="mb-3 font-mono text-[12.5px] text-fog-muted">
            <span className="text-pos">{formatPct(d.net_positive_pct)}</span> of miners are net-positive lifetime
            (SOL returned − deployed, plus ORE earned at today's market ratio)
          </div>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted">
          <span className="shrink-0">sort:</span>
          <SegmentedControl
            aria-label="Miner sort"
            variant="loose"
            items={MINER_SORTS}
            value={sort}
            onChange={(id) => { setSort(id); setOffset(0); }}
          />
          <span className="section-label ml-auto"><Refreshing active={polled.fetching && !!polled.data} /></span>
        </div>
        {useLeaderboard && (
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
        )}
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
                {useLeaderboard ? (
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
              {polled.loading && !polled.data && <SkeletonRows cols={8} />}
              {rows.map((m, i) => {
                const net = lamportsToSol(m.net_sol);
                const isOpen = expanded === m.authority;
                return (
                  <Fragment key={m.authority}>
                  <tr className={`${m.is_ours ? oursRow : bodyRow} cursor-pointer`}
                    title="Click to expand this wallet"
                    onClick={() => setExpanded(isOpen ? null : m.authority)}>
                    <td className={`${td} text-fog-muted`}>
                      <span className={`mr-1 inline-block transition-transform ${isOpen ? "rotate-90" : ""}`}>▸</span>
                      {offset + i + 1}
                    </td>
                    <td className={`${td} ${m.is_ours ? "text-steel" : "text-white"}`}>
                      <CopyAddress address={m.authority} />{m.is_ours ? " ◆ ours" : ""}
                    </td>
                    <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatSol(lamportsToSol(m.deployed), 1)}</td>
                    <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatSol(lamportsToSol(m.earned), 1)}</td>
                    <td className={`${td} num text-right ${netTone(net)}`}>{net >= 0 ? "+" : ""}{formatSol(net, 2)}</td>
                    <td className={`${td} hidden text-right text-gray-300 sm:table-cell`}>{formatNum(oreGramsToOre(m.ore), useLeaderboard ? 0 : 1)}</td>
                    {useLeaderboard ? (
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
                          intrinsic-width pass (percentage min-width can't resolve against
                          an indefinite basis), so a full-width nested panel can't force the
                          leaderboard wider than its container on mobile; it fills the cell at
                          layout time. The panel's own scrollers handle their overflow. */}
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
        <Pager offset={offset} total={total} onPage={setOffset} unit="miners" loading={polled.loading && !polled.data} />
        {useLeaderboard && (
          <p className="mt-3 max-w-3xl font-mono text-[13px] leading-snug text-fog-muted">
            <span className="text-gray-300">Net SOL</span> = lifetime returned SOL − deployed (real profit, can be negative).
            ROI is the gross returned/deployed ratio. Both from the on-chain returned-SOL watermark (may include stake-back).
          </p>
        )}
      </ChartCard>

      {useLeaderboard && (
        <ChartCard title="Gross ROI by percentile band" subtitle={b ? `${formatNum(b.n)} miners with a deploy · a size-neutral view` : ""}>
          {b ? <div className="max-w-3xl"><HBars rows={bandRows} /></div> : <p className="font-mono text-xs text-fog-muted">No census yet.</p>}
        </ChartCard>
      )}
      <Caveats provenance={polled.provenance} error={polled.error} onRetry={polled.refresh} />
    </div>
  );
}
