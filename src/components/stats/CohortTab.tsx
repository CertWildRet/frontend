"use client";

/**
 * Cohort tab — ORE holder-size distribution + cohort balance changes, with a
 * source toggle (spelled out in full by the (?) CohortInfoModal):
 *   Wallet Holders (default) — liquid ORE in direct wallets, per owner across every
 *                              ORE token account. Known program custody is broken
 *                              out by purpose, not counted as holder whales.
 *   Unclaimed Rewards        — miner-side ORE only: unclaimed rewards + live refined
 *                              still on the mine, not yet claimed to a wallet.
 */
import { useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { Refreshing } from "@/components/primitives/Skeleton";
import { ChartCard } from "@/components/stats/Charts";
import { Donut, CohortBalanceBars, COHORTS } from "@/components/stats/CohortCharts";
import { CohortInfoModal } from "@/components/stats/CohortInfoModal";
import { usePolled } from "@/hooks/useOreStats";
import { fetchOreCohorts, type OreCohortRange, type OreCohortSource } from "@/lib/oreStats";
import { formatNum, formatPct } from "@/lib/format";

const timeAgo = (iso: string | null) => {
  if (!iso) return "·";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

const COHORT_RANGES: { id: OreCohortRange; label: string }[] = [
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "all", label: "All" },
];

export function CohortTab() {
  const [source, setSource] = useState<OreCohortSource>("holder");
  const [range, setRange] = useState<OreCohortRange>("30d");
  const [metric, setMetric] = useState<"holders" | "ore">("holders");
  const [infoOpen, setInfoOpen] = useState(false);
  const polled = usePolled(() => fetchOreCohorts(source, range), 300_000, [source, range]);
  const d = polled.data;
  // Only use data whose source matches the current toggle — during a switch `d`
  // still holds the OLD source's payload for a render or two, and reading scalars
  // from it would show e.g. holder counts under "Miner-held" labels. Treat
  // mismatched data as absent so the loading state shows instead.
  const md = d && d.source === source ? d : null;
  const isHolder = source === "holder";
  const loading = !md && !polled.error;

  const dist = md?.distribution ?? [];
  const byId = (id: number) => dist.find((r) => r.cohort === id);
  const totalHolders = md?.total_holders ?? 0;
  const held = md?.held_ore ?? 0;
  const supply = md?.supply_ore ?? null;
  const custody = md?.custody ?? null;
  const custodyTotal = custody
    ? { owners: custody.owners, ore: custody.total_ore }
    : md?.vaulted ?? null; // old analytics deploy compatibility
  const stats = md?.stats ?? null;
  const supplyShare = supply && supply > 0 ? held / supply : null;
  const whales = byId(5)?.holders ?? 0;
  const whaleOre = byId(5)?.ore ?? 0;
  const pctSupply = (ore: number | null | undefined) => (supply && ore != null ? formatPct(ore / supply, ore / supply >= 0.1 ? 0 : 1) : "···");
  const custodyComponents = custody ? [
    {
      id: "mine_treasury",
      label: "Mining Treasury",
      ore: custody.components.mine_treasury.ore,
      detail: "Escrow backing unclaimed + refined miner rewards; motherlode is one accounting field inside it.",
    },
    {
      id: "store_backing",
      label: "stORE backing",
      ore: custody.components.store_backing.ore,
      detail: "ORE backing stORE held by users.",
    },
    {
      id: "staking_rewards",
      label: "Staking rewards",
      ore: custody.components.staking_rewards.ore,
      detail: "Staker reward custody; bury/buyback routes its 10% staker share here.",
    },
    {
      id: "other_excluded",
      label: "Other exclusions",
      ore: custody.components.other_excluded.ore,
      detail: "Extra owners explicitly excluded by the analytics operator.",
    },
  ].filter((component) => component.ore > 0) : [];

  // donut slices — relative composition of the 5 size cohorts
  const slices = COHORTS.map((c) => {
    const row = byId(c.id);
    return { label: c.name, sub: `${c.range} ORE`, value: metric === "holders" ? row?.holders ?? 0 : row?.ore ?? 0, color: c.color };
  }).filter((s) => s.value > 0);
  const donutTotal = slices.reduce((a, s) => a + s.value, 0);

  // balance-change buckets: one diverging stacked bar per snapshot. Carry each
  // cohort's TOTAL alongside the delta so the tooltip can show the move as a % of
  // the cohort (a big-looking ORE number is usually a rounding error on the band).
  const bucketMap = new Map<string, { values: number[]; totals: number[]; approximate: boolean }>();
  for (const ch of md?.changes ?? []) {
    if (!bucketMap.has(ch.snapshot_ts)) bucketMap.set(ch.snapshot_ts, { values: [0, 0, 0, 0, 0], totals: [0, 0, 0, 0, 0], approximate: false });
    const e = bucketMap.get(ch.snapshot_ts)!;
    e.values[ch.cohort - 1] = ch.delta_ore;
    e.totals[ch.cohort - 1] = ch.ore;
    e.approximate ||= ch.is_estimated;
  }
  const buckets = [...bucketMap.entries()].map(([ts, { values, totals, approximate }]) => {
    const dt = new Date(ts);
    const label = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
    return { label, values, totals, approximate };
  });
  const hasApproximateTicks = buckets.some((bucket) => bucket.approximate);
  const series = COHORTS.map((c) => ({ name: c.name, color: c.color }));

  return (
    <div className="space-y-5">
      {/* source toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SegmentedControl aria-label="Cohort source"
            items={[{ id: "holder", label: "Wallet Holders" }, { id: "miner", label: "Unclaimed Rewards" }]}
            value={source} onChange={(id) => setSource(id as OreCohortSource)} />
          <button type="button" onClick={() => setInfoOpen(true)}
            aria-label="What's the difference between Wallet Holders and Unclaimed Rewards?"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-line text-[12px] font-bold text-fog-muted transition-colors hover:border-steel hover:text-fog focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30">
            ?
          </button>
        </div>
        <span className="section-label"><Refreshing active={polled.fetching && !!d} /></span>
      </div>

      {/* honesty banner per source */}
      {isHolder ? (
        <div className="rounded-lg border border-white/[0.07] bg-cyan/[0.05] px-3 py-2 font-mono text-[12px] leading-relaxed text-[#7fe9ee]">
          <span className="text-white">Direct-wallet ORE holders.</span> ORE is aggregated per owner across all token accounts
          {supplyShare != null ? <> — <span className="text-white">{formatPct(supplyShare, 0)}</span> of circulating supply</> : ""}.
          Known program custody is shown separately by purpose below, not as holder whales. Exchange custodial wallets can&apos;t be
          labeled and may appear as whales.
        </div>
      ) : (
        <div className="rounded-lg border border-white/[0.07] bg-amber/[0.05] px-3 py-2 font-mono text-[12px] leading-relaxed text-amber">
          <span className="text-white">Miner-held ORE only.</span> ORE miners hold on the mine (unclaimed rewards + live refined)
          {supplyShare != null ? <> — about <span className="text-white">{formatPct(supplyShare, 0)}</span> of circulating supply</> : ""}.
          Switch to <span className="text-white">Wallet Holders</span> for the full token-holder picture.
          {md?.latest_estimated ? <span className="ml-1 text-[#ffe9a8]">Latest distribution: Approx*</span> : null}
        </div>
      )}

      {/* hero tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile variant="inset" label={isHolder ? "Direct holders" : "Holders (miner-side)"} value={loading ? "···" : formatNum(totalHolders)}
          hint={isHolder ? "wallet owners holding ORE" : "miners holding >0 ORE"} />
        <StatTile variant="inset" label={isHolder ? "In direct wallets" : "Miner-held ORE"} value={loading ? "···" : formatNum(held, 0)} unit="ORE" tone="gold"
          hint={supply ? `of ${formatNum(supply, 0)} circulating` : undefined} />
        <StatTile variant="inset" label="Share of supply" value={supplyShare != null ? formatPct(supplyShare, 1) : "···"}
          hint={isHolder ? "direct wallets ÷ circulating" : "miner-held ÷ circulating"} />
        <StatTile variant="inset" label="Whales (>500)" value={loading ? "···" : formatNum(whales)}
          hint={whaleOre ? `hold ${formatNum(whaleOre, 0)} ORE` : "the biggest cohort"} />
      </div>

      {/* concentration tiles (holder source only) */}
      {isHolder && stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile variant="inset" label="Largest holder" value={formatNum(stats.largest_ore ?? 0, 0)} unit="ORE"
            hint={supply ? `${pctSupply(stats.largest_ore)} of supply` : undefined} />
          <StatTile variant="inset" label="Top 10 hold" value={pctSupply(stats.top10_ore)}
            hint={`${formatNum(stats.top10_ore ?? 0, 0)} ORE of supply`} />
          <StatTile variant="inset" label="Top 100 hold" value={pctSupply(stats.top100_ore)}
            hint={`${formatNum(stats.top100_ore ?? 0, 0)} ORE of supply`} />
          <StatTile variant="inset" label="Whales' grip" value={held ? formatPct(whaleOre / held, 0) : "···"}
            hint={`${formatNum(whales)} wallets · of all holder ORE`} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* distribution donut */}
        <ChartCard variant="dispersion" cutCorner="tr" title={isHolder ? "Direct-wallet distribution" : "Holder distribution"}
          subtitle={isHolder
            ? "Every direct ORE wallet by size, after known program custody is removed."
            : "ORE miners bucketed by how much ORE they hold on the mine."}
          right={
            <SegmentedControl aria-label="Distribution metric" variant="loose"
              items={[{ id: "holders", label: "Holders" }, { id: "ore", label: "ORE held" }]}
              value={metric} onChange={(id) => setMetric(id as "holders" | "ore")} />
          }>
          <Donut slices={slices} loading={loading} height={340}
            centerLabel={formatNum(donutTotal, 0)}
            centerSub={metric === "holders" ? "holders" : "ORE held"}
            fmt={(v) => formatNum(v, 0)} />
          {/* Contract custody is excluded from holder bands, then explained by purpose. */}
          {isHolder && custodyTotal && custodyTotal.ore > 0 && (
            <div className="mt-3 rounded-lg border border-line bg-white/[0.02] px-3 py-3 font-mono text-[12px] leading-relaxed text-fog-muted">
              <div className="text-center">
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#6b7280" }} />
                <span className="text-gray-200">{formatNum(custodyTotal.ore, 0)} ORE</span>
                <span> in contract custody ({pctSupply(custodyTotal.ore)} of supply), excluded from direct-wallet cohorts.</span>
              </div>
              {custodyComponents.length > 0 && (
                <div className="mt-3 grid gap-2 border-t border-white/[0.05] pt-3 sm:grid-cols-3">
                  {custodyComponents.map((component) => (
                    <div key={component.id} className="rounded-md bg-black/15 px-2.5 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-fog">{component.label}</span>
                        <span className="whitespace-nowrap text-gray-200">{formatNum(component.ore, 0)} ORE</span>
                      </div>
                      <p className="mt-1 text-[10.5px] leading-snug text-fog-muted">{component.detail}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-center text-[10.5px] text-fog-muted">
                Contract custody describes where tokens sit; it does not mean every component is protocol-owned inventory.
              </p>
            </div>
          )}
        </ChartCard>

        {/* per-cohort table */}
        <ChartCard variant="dispersion" cutCorner="bl" title="By cohort"
          subtitle={isHolder
            ? "Every direct-wallet size band, its owner count and ORE balance."
            : "Every miner size band, its holder count and ORE balance."}>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[13px]">
              <thead><tr className="text-left text-[12.5px] uppercase tracking-[0.08em] text-[#c6cde6]">
                <th className="px-2 py-2 font-bold">Cohort</th>
                <th className="px-2 py-2 font-bold">ORE</th>
                <th className="px-2 py-2 text-right font-bold">Holders</th>
                <th className="px-2 py-2 text-right font-bold">% of holders</th>
                <th className="px-2 py-2 text-right font-bold">ORE held</th>
                <th className="px-2 py-2 text-right font-bold">% of ORE</th>
              </tr></thead>
              <tbody>
                {COHORTS.map((c) => {
                  const r = byId(c.id);
                  const holders = r?.holders ?? 0, ore = r?.ore ?? 0;
                  return (
                    <tr key={c.id} className="border-t border-white/[0.04]">
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                          <span className="text-white">{c.name}</span>
                          {!isHolder && r?.is_estimated ? <span className="text-[10px] font-bold text-amber">Approx*</span> : null}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-fog-muted">{c.range}</td>
                      <td className="px-2 py-2 text-right text-gray-200">{formatNum(holders)}</td>
                      <td className="px-2 py-2 text-right text-fog-muted">{totalHolders ? formatPct(holders / totalHolders, 1) : "·"}</td>
                      <td className="px-2 py-2 text-right text-gold">{formatNum(ore, 0)}</td>
                      <td className="px-2 py-2 text-right text-fog-muted">{held ? formatPct(ore / held, 1) : "·"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* concentration visual — fills the card and shows the inversion at a
              glance: the crowd is Plankton by count, but the ORE is nearly all Whale. */}
          <div className="mt-5 space-y-4 border-t border-white/[0.05] pt-5">
            {[
              { key: "wallets", label: isHolder ? "by wallets" : "by miners", total: totalHolders, get: (c: (typeof COHORTS)[number]) => byId(c.id)?.holders ?? 0 },
              { key: "ore", label: "by ORE held", total: held, get: (c: (typeof COHORTS)[number]) => byId(c.id)?.ore ?? 0 },
            ].map((row) => (
              <div key={row.key}>
                <div className="mb-1.5 flex justify-between font-mono text-[13px] text-fog-muted">
                  <span>{row.label}</span>
                  <span>{row.key === "ore" ? `${formatNum(row.total, 0)} ORE` : formatNum(row.total)}</span>
                </div>
                <div className="flex h-6 overflow-hidden rounded bg-white/[0.03]">
                  {COHORTS.map((c) => {
                    const w = row.total ? (row.get(c) / row.total) * 100 : 0;
                    return w > 0 ? <div key={c.id} style={{ width: `${w}%`, background: c.color }} title={`${c.name}: ${w.toFixed(1)}%`} /> : null;
                  })}
                </div>
              </div>
            ))}
            <p className="font-mono text-[13px] leading-relaxed text-fog-muted">
              {(() => {
                const pk = byId(1), wh = byId(5);
                const pkH = totalHolders ? (pk?.holders ?? 0) / totalHolders : 0;
                const pkO = held ? (pk?.ore ?? 0) / held : 0;
                const whH = totalHolders ? (wh?.holders ?? 0) / totalHolders : 0;
                const whO = held ? (wh?.ore ?? 0) / held : 0;
                const who = isHolder ? "wallets" : "miners";
                return `Plankton are ${formatPct(pkH, 0)} of ${who} but hold ${formatPct(pkO, 1)} of the ORE; whales are ${formatPct(whH, 1)} of ${who} but hold ${formatPct(whO, 0)}.`;
              })()}
            </p>
          </div>
        </ChartCard>
      </div>

      {/* balance changes — full width */}
      <ChartCard variant="dispersion" cutCorner="bl" title="Cohort balance changes"
        subtitle="Net ORE each cohort gained (up) or lost (down) between snapshots — accumulation vs distribution. A wallet crossing a size line shows as one cohort down + the next up. Moves are usually a fraction of a percent of each band (hover for the %); the axis auto-zooms, so small shifts still fill the bars."
        right={(
          <>
            <Refreshing active={polled.fetching && !!md} />
            <SegmentedControl aria-label="Cohort balance time range" items={COHORT_RANGES} value={range} onChange={setRange} />
          </>
        )}>
        <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12.5px] font-semibold text-[#bcc3da]">
          {COHORTS.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} /> {c.name}</span>
          ))}
        </div>
        <CohortBalanceBars buckets={buckets} series={series} loading={loading} height={320}
          fmt={(v) => formatNum(v, 1)} unit="net ORE change per snapshot"
          emptyText={isHolder
            ? "collecting holder snapshots — balance-change history builds up as the daily sweep runs."
            : "collecting census snapshots — balance-change history builds up as new snapshots land."} />
        {!isHolder && hasApproximateTicks && (
          <p className="mt-2 font-mono text-[11.5px] leading-relaxed text-amber">
            Approx* = exact Treasury total with the cohort split estimated from surrounding complete Miner census snapshots.
          </p>
        )}
      </ChartCard>

      {/* footer */}
      <div className="flex items-center justify-between font-mono text-[12px] text-fog-muted">
        <span>{md?.updated_at
          ? `${isHolder ? "holder sweep" : md.latest_estimated ? "Approx* cohort estimate" : "census snapshot"} ${timeAgo(md.updated_at)}`
          : polled.error ? "" : "loading…"}</span>
        {polled.error && (
          <button onClick={polled.refresh} className="rounded border border-line px-2 py-1 text-fog-muted transition-colors hover:border-steel hover:text-white">
            retry
          </button>
        )}
      </div>

      <CohortInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
