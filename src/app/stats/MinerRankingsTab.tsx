"use client";

/**
 * Miner Rankings — on-chain lifetime census leaderboard (no address search).
 */
import { useEffect, useState } from "react";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { Refreshing } from "@/components/primitives/Skeleton";
import { HBars, ChartCard } from "@/components/stats/Charts";
import { usePolled } from "@/hooks/useOreStats";
import { fetchOreLeaderboard, type OreEnvelope, type OreBands } from "@/lib/oreStats";
import { formatNum, formatPct } from "@/lib/format";
import { PAGE, Pager, Caveats } from "./shared";
import {
  RANKING_SORTS, MIN_DEP, MinerTable,
  type MinerRow,
} from "./minersShared";

type RankingsData = {
  request_key: string;
  snapshot_ts: string | null;
  total: number;
  bands: OreBands | null;
  net_positive_pct: number | null;
  rows: MinerRow[];
};

type CensusMeta = {
  snapshot_ts: string;
  total: number;
  net_positive_pct: number | null;
};

export function MinerRankingsTab() {
  const [sort, setSort] = useState("net_sol");
  const [minDep, setMinDep] = useState(0);
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const requestKey = `leaderboard:${sort}:${minDep}:${offset}`;
  const polled = usePolled(async (): Promise<OreEnvelope<RankingsData>> => {
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
      service: m.service ?? null,
    }));
    return {
      ...env,
      data: {
        request_key: requestKey,
        snapshot_ts: env.data.snapshot_ts,
        total: env.data.total,
        bands: env.data.bands,
        net_positive_pct: env.data.net_positive_pct,
        rows,
      },
    };
  }, 0, [sort, minDep, offset]);

  const d = polled.data?.request_key === requestKey ? polled.data : null;
  const [censusMeta, setCensusMeta] = useState<CensusMeta | null>(null);
  useEffect(() => {
    if (d?.snapshot_ts) {
      setCensusMeta((previous) => ({
        snapshot_ts: d.snapshot_ts!,
        total: d.total,
        net_positive_pct: d.net_positive_pct ?? previous?.net_positive_pct ?? null,
      }));
    }
  }, [d]);

  const headlineMeta = censusMeta
    ?? (d?.snapshot_ts
      ? { snapshot_ts: d.snapshot_ts, total: d.total, net_positive_pct: d.net_positive_pct }
      : null);
  const b = d?.bands ?? null;
  const bandRows = b
    ? [
        { label: "#1", value: b.top1 }, { label: "top 5%", value: b.b05 }, { label: "top 10%", value: b.b10 },
        { label: "top 20%", value: b.b20 }, { label: "top 30%", value: b.b30 }, { label: "top 50%", value: b.b50 },
        { label: "all", value: b.avg_all },
      ]
    : [];
  const sortLabel = RANKING_SORTS.find((x) => x.id === sort)?.label ?? sort;
  const rows = d?.rows ?? [];

  return (
    <div className="space-y-5">
      <ChartCard
        title="Miner Rankings"
        subtitle={headlineMeta
          ? `On-chain lifetime census ${new Date(headlineMeta.snapshot_ts).toLocaleDateString()} · ${formatNum(headlineMeta.total)} miners · ranked by ${sortLabel}`
          : "loading census…"}>
        {headlineMeta?.net_positive_pct != null && (
          <div className="mb-3 font-mono text-[12.5px] text-fog-muted">
            <span className="text-pos">{formatPct(headlineMeta.net_positive_pct)}</span> of miners are net-positive lifetime
            (SOL returned − deployed, plus ORE earned at today&apos;s market ratio). Deployed is turnover, not capital
            burned — after Aug 2026 returned SOL includes recycled stake, so lifetime ROI mixes the old 100%-miss
            economy with the new ~10.9% rake.
          </div>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted">
          <span className="shrink-0">sort:</span>
          <SegmentedControl
            aria-label="Miner sort"
            variant="loose"
            items={RANKING_SORTS}
            value={sort}
            onChange={(id) => { setSort(id); setOffset(0); }}
          />
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted">
          <span className="shrink-0">min deployed:</span>
          <SegmentedControl
            aria-label="Minimum deployed"
            variant="loose"
            items={MIN_DEP.map((v) => ({ id: String(v), label: v === 0 ? "any" : `${v} SOL` }))}
            value={String(minDep)}
            onChange={(id) => { setMinDep(Number(id)); setOffset(0); }}
          />
          <Refreshing active={polled.fetching && !!polled.data} />
        </div>
        <MinerTable
          rows={rows}
          offset={offset}
          loading={!d && polled.fetching}
          mode="leaderboard"
          expanded={expanded}
          onToggle={setExpanded}
        />
        <Pager offset={offset} total={d?.total ?? 0} onPage={setOffset} unit="miners" loading={!d && polled.fetching} />
        <p className="mt-3 max-w-3xl font-mono text-[13px] leading-snug text-fog-muted">
          <span className="text-gray-300">Net SOL</span> = lifetime returned SOL − deployed (real profit, can be negative).
          ROI is the gross returned/deployed ratio. Both from the on-chain returned-SOL watermark (may include stake-back).
        </p>
      </ChartCard>

      <ChartCard title="Gross ROI by percentile band" subtitle={b ? `${formatNum(b.n)} miners with a deploy · a size-neutral view` : ""}>
        {b ? <div className="max-w-3xl"><HBars rows={bandRows} /></div> : <p className="font-mono text-xs text-fog-muted">No census yet.</p>}
      </ChartCard>
      <Caveats provenance={polled.provenance} error={polled.error} onRetry={polled.refresh} />
    </div>
  );
}
