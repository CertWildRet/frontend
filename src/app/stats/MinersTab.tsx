"use client";

/**
 * Search Miners — address lookup (search box + results / MinerDetail).
 * Census leaderboard lives on Miner Rankings.
 */
import { useContext, useEffect, useRef, useState } from "react";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { Refreshing } from "@/components/primitives/Skeleton";
import { ChartCard } from "@/components/stats/Charts";
import { MinerDetail } from "@/components/stats/MinerDetail";
import { PolledActiveContext, usePolled } from "@/hooks/useOreStats";
import { fetchOreMiners, type OreEnvelope, type OreProvenance } from "@/lib/oreStats";
import { formatNum } from "@/lib/format";
import {
  PAGE, Pager, Caveats,
  type MinerSeed,
} from "./shared";
import {
  SEARCH_SORTS, MINERS_SORT_FALLBACK, MinerTable,
  type MinerRow,
} from "./minersShared";

type SearchData = {
  request_key: string;
  snapshot_ts: string | null;
  total: number;
  net_positive_pct: number | null;
  rows: MinerRow[];
};

const EMPTY_PROVENANCE: OreProvenance = {
  ore_max_round: "0",
  ore_cumulative_through_round: null,
  reset_tail_last_round: "0",
  census_snapshot_ts: null,
  ingest_enabled: true,
  caveats: [],
};

export function MinersTab({
  seed,
  onQueryChange,
}: {
  seed?: MinerSeed | null;
  onQueryChange?: (query: string) => void;
}) {
  const [sort, setSort] = useState("net_sol");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tabActive = useContext(PolledActiveContext);
  const onQueryChangeRef = useRef(onQueryChange);
  useEffect(() => { onQueryChangeRef.current = onQueryChange; }, [onQueryChange]);
  // Focus the search box whenever this tab is shown so users can paste immediately.
  // Defer a frame: the parent keeps the tab mounted under `hidden` until active.
  useEffect(() => {
    if (!tabActive) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [tabActive]);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = qInput.trim();
      setQ(next);
      setOffset(0);
      onQueryChangeRef.current?.(next);
    }, 350);
    return () => clearTimeout(t);
  }, [qInput]);
  // Seeded from another tab (e.g. a motherlode sharer's jump arrow): fill the
  // search bar AND set the query immediately (skip the debounce) so the jump lands
  // on results at once. Keyed on seed.n so re-clicking the same wallet re-fires.
  useEffect(() => {
    if (seed) { setQInput(seed.pubkey); setQ(seed.pubkey); setOffset(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.n]);

  const minersSort = MINERS_SORT_FALLBACK[sort] ?? sort;
  const requestKey = `miners:${minersSort}:${offset}:${q}`;
  const polled = usePolled(async (): Promise<OreEnvelope<SearchData>> => {
    if (!q) {
      return {
        ok: true,
        data: {
          request_key: requestKey,
          snapshot_ts: null,
          total: 0,
          net_positive_pct: null,
          rows: [],
        },
        provenance: EMPTY_PROVENANCE,
      };
    }
    const env = await fetchOreMiners({ sort: minersSort, minDeployed: 0, offset, q, limit: PAGE });
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
        request_key: requestKey,
        snapshot_ts: env.data.snapshot_ts,
        total: env.data.total,
        net_positive_pct: env.data.net_positive_pct ?? null,
        rows,
      },
    };
  }, 0, [sort, offset, q]);

  // Never render rows from a previous query under the new controls.
  const d = q && polled.data?.request_key === requestKey ? polled.data : null;
  const rows = d?.rows ?? [];
  const exactAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q) ? q : null;

  useEffect(() => {
    if (exactAddress) setExpanded(exactAddress);
  }, [exactAddress]);

  const sortLabel = SEARCH_SORTS.find((x) => x.id === sort)?.label ?? sort;

  return (
    <div className="space-y-5">
      {q && (
        <button type="button" onClick={() => setQInput("")}
          className="flex items-center gap-1.5 rounded-md border border-line bg-ink-800 px-3 py-1.5 font-mono text-[13px] font-semibold text-fog-muted transition-colors hover:border-steel hover:text-white">
          <span aria-hidden>←</span> Clear search
        </button>
      )}
      {/* census-missing wallets have no table row to expand (event history only) */}
      {exactAddress && d && !polled.fetching && rows.length === 0 && <MinerDetail pubkey={exactAddress} />}

      <ChartCard
        title="Search Miners"
        subtitle={q
          ? (d?.snapshot_ts
            ? `Results for ${q.slice(0, 4)}…${q.slice(-4)} · ${formatNum(d.total)} match${d.total === 1 ? "" : "es"} · sorted by ${sortLabel}`
            : "searching…")
          : "Look up any ORE miner by Solana wallet address"}>
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted">
          <input
            ref={inputRef}
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="paste Solana wallet address…"
            aria-label="Search miner address"
            className="min-w-0 flex-1 rounded-md border border-line bg-ink-800 px-3 py-2 font-mono text-[13px] text-white placeholder:text-fog-muted focus:border-steel focus:outline-none sm:max-w-md"
          />
          <Refreshing active={!!q && polled.fetching && !!polled.data} />
        </div>

        {!q ? (
          <p className="rounded-lg border border-dashed border-line bg-ink-800/40 px-4 py-8 text-center font-mono text-[13px] text-fog-muted">
            Paste a Solana wallet address to load that miner&apos;s stats.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted">
              <span className="shrink-0">sort:</span>
              <SegmentedControl
                aria-label="Miner sort"
                variant="loose"
                items={SEARCH_SORTS}
                value={sort}
                onChange={(id) => { setSort(id); setOffset(0); }}
              />
            </div>
            <MinerTable
              rows={rows}
              offset={offset}
              loading={!d && polled.fetching}
              mode="miners"
              expanded={expanded}
              onToggle={setExpanded}
            />
            <Pager offset={offset} total={d?.total ?? 0} onPage={setOffset} unit="miners" loading={!d && polled.fetching} />
          </>
        )}
      </ChartCard>

      {q && <Caveats provenance={polled.provenance} error={polled.error} onRetry={polled.refresh} />}
    </div>
  );
}
