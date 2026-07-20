"use client";

/**
 * Cohort tab — ORE holder-size distribution + cohort balance changes.
 *
 * v1 is MINER-SIDE ORE only (unclaimed rewards + live refined from the miner
 * census). It is NOT a full token-holder distribution — it misses claimed/wallet
 * ORE, staked stORE, and pure buyers (~3/4 of circulating supply). The page says
 * so plainly; true SPL token-holder cohorts are the planned v2.
 */
import { useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { Refreshing } from "@/components/primitives/Skeleton";
import { ChartCard } from "@/components/stats/Charts";
import { Donut, CohortBalanceBars, COHORTS, cohortOf } from "@/components/stats/CohortCharts";
import { usePolled } from "@/hooks/useOreStats";
import { fetchOreCohorts } from "@/lib/oreStats";
import { formatNum, formatPct } from "@/lib/format";

const timeAgo = (iso: string | null) => {
  if (!iso) return "·";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

export function CohortTab() {
  const [metric, setMetric] = useState<"holders" | "ore">("holders");
  const polled = usePolled(() => fetchOreCohorts(30), 300_000, []);
  const d = polled.data;

  const dist = d?.distribution ?? [];
  const byId = (id: number) => dist.find((r) => r.cohort === id);
  const totalHolders = d?.total_holders ?? 0;
  const minerHeld = d?.miner_held_ore ?? 0;
  const supply = d?.supply_ore ?? null;
  const supplyShare = supply && supply > 0 ? minerHeld / supply : null;
  const whales = byId(5)?.holders ?? 0;
  const whaleOre = byId(5)?.ore ?? 0;

  // donut slices — relative composition of the 5 cohorts (no vault/CEX slice)
  const slices = COHORTS.map((c) => {
    const row = byId(c.id);
    return { label: c.name, sub: `${c.range} ORE`, value: metric === "holders" ? row?.holders ?? 0 : row?.ore ?? 0, color: c.color };
  }).filter((s) => s.value > 0);
  const donutTotal = slices.reduce((a, s) => a + s.value, 0);

  // balance-change buckets: group changes by snapshot, one stacked bar each
  const changes = d?.changes ?? [];
  const bucketMap = new Map<string, number[]>();
  for (const ch of changes) {
    if (!bucketMap.has(ch.snapshot_ts)) bucketMap.set(ch.snapshot_ts, [0, 0, 0, 0, 0]);
    bucketMap.get(ch.snapshot_ts)![ch.cohort - 1] = ch.delta_ore;
  }
  const buckets = [...bucketMap.entries()].map(([ts, values]) => {
    const dt = new Date(ts);
    const label = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
    return { label, values };
  });
  const series = COHORTS.map((c) => ({ name: c.name, color: c.color }));

  const loading = polled.loading && !d;

  return (
    <div className="space-y-5">
      {/* honesty banner — this is miner-side ORE, not full token holders (v1) */}
      <div className="rounded-lg border border-amber/25 bg-amber/[0.05] px-3 py-2 font-mono text-[12px] leading-relaxed text-amber">
        <span className="text-white">Miner-held ORE only (v1).</span> Cohorts bucket the ORE miners hold on the mine
        (unclaimed rewards + live refined){supplyShare != null ? <> — about <span className="text-white">{formatPct(supplyShare, 0)}</span> of circulating supply</> : ""}.
        Claimed/wallet ORE, staked stORE, exchange balances and pure buyers aren&apos;t captured by the census; a true
        token-holder breakdown is the planned v2.
      </div>

      {/* hero tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile variant="inset" label="Holders (miner-side)" value={loading ? "···" : formatNum(totalHolders)} hint="miners holding >0 ORE" />
        <StatTile variant="inset" label="Miner-held ORE" value={loading ? "···" : formatNum(minerHeld, 0)} unit="ORE" tone="gold"
          hint={supply ? `of ${formatNum(supply, 0)} circulating` : undefined} />
        <StatTile variant="inset" label="Share of supply" value={supplyShare != null ? formatPct(supplyShare, 1) : "···"} hint="miner-held ÷ circulating" />
        <StatTile variant="inset" label="Whales (>500)" value={loading ? "···" : formatNum(whales)}
          hint={whaleOre ? `hold ${formatNum(whaleOre, 0)} ORE` : "the biggest cohort"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* distribution donut */}
        <ChartCard variant="dispersion" cutCorner="tr" title="Holder distribution"
          subtitle="ORE miners bucketed by how much ORE they hold on the mine. Whale = the bright-gold sliver; Plankton = the teal majority."
          right={
            <SegmentedControl aria-label="Distribution metric" variant="loose"
              items={[{ id: "holders", label: "Holders" }, { id: "ore", label: "ORE held" }]}
              value={metric} onChange={(id) => setMetric(id as "holders" | "ore")} />
          }>
          <Donut slices={slices} loading={loading} height={300}
            centerLabel={formatNum(donutTotal, metric === "ore" ? 0 : 0)}
            centerSub={metric === "holders" ? "holders" : "ORE held"}
            fmt={(v) => formatNum(v, metric === "ore" ? 0 : 0)} />
        </ChartCard>

        {/* per-cohort table */}
        <ChartCard variant="dispersion" cutCorner="bl" title="By cohort"
          subtitle="Every size band, its holder count and the ORE it controls. Few whales, most of the ORE."
          right={<span className="section-label"><Refreshing active={polled.fetching && !!d} /></span>}>
          <div className={`${"overflow-x-auto"}`}>
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
                        </span>
                      </td>
                      <td className="px-2 py-2 text-fog-muted">{c.range}</td>
                      <td className="px-2 py-2 text-right text-gray-200">{formatNum(holders)}</td>
                      <td className="px-2 py-2 text-right text-fog-muted">{totalHolders ? formatPct(holders / totalHolders, 1) : "·"}</td>
                      <td className="px-2 py-2 text-right text-gold">{formatNum(ore, 0)}</td>
                      <td className="px-2 py-2 text-right text-fog-muted">{minerHeld ? formatPct(ore / minerHeld, 1) : "·"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* balance changes — full width */}
      <ChartCard variant="dispersion" cutCorner="bl" title="Cohort balance changes"
        subtitle="Net ORE each cohort gained (up) or lost (down) between census snapshots — accumulation vs distribution. A miner crossing a size line shows as one cohort down + the next up.">
        <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12.5px] font-semibold text-[#bcc3da]">
          {COHORTS.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} /> {c.name}</span>
          ))}
        </div>
        <CohortBalanceBars buckets={buckets} series={series} loading={loading} height={320}
          fmt={(v) => formatNum(v, 1)} unit="net ORE change per snapshot"
          emptyText="collecting census snapshots — balance-change history builds up as new snapshots land (roughly daily)." />
      </ChartCard>

      {/* footer: freshness + error */}
      <div className="flex items-center justify-between font-mono text-[12px] text-fog-muted">
        <span>{d?.updated_at ? `census snapshot ${timeAgo(d.updated_at)}` : polled.error ? "" : "loading…"}</span>
        {polled.error && (
          <button onClick={polled.refresh} className="rounded border border-line px-2 py-1 text-fog-muted transition-colors hover:border-steel hover:text-white">
            retry
          </button>
        )}
      </div>
    </div>
  );
}
