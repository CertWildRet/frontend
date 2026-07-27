"use client";

/**
 * RWA / Crypto tab — compare ORE USD performance against Autonom oracle
 * benchmarks (BTC, ETH, SOL, gold, silver, crude, equities, T-bills).
 * ORE is fixed; the user picks one peer. Chart defaults to normalized %.
 */
import { useMemo, useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { Refreshing } from "@/components/primitives/Skeleton";
import { ChartCard } from "@/components/stats/Charts";
import { DualLine, ORE_COLOR, type TPt } from "@/components/stats/TrendCharts";
import { usePolled } from "@/hooks/useOreStats";
import { fetchOreTrends } from "@/lib/oreStats";
import {
  DEFAULT_RWA_FEED_ID,
  RWA_ASSET_CLASSES,
  RWA_ASSETS,
  RWA_RANGES,
  rwaAssetByFeedId,
  type RwaRange,
} from "@/lib/rwaAssets";
import {
  fetchRwaBars,
  fetchRwaPrices,
  formatPctChange,
  formatUsdPrice,
  freshnessLabelText,
  normalizePerformance,
  timeAgo,
  type FreshnessLabel,
  type RwaPriceQuote,
} from "@/lib/rwa";

const PEER_COLOR = "#22E0E6";

const dayLbl = (tsSec: number) => {
  const d = new Date(tsSec * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};
const hourLbl = (tsSec: number) => {
  const d = new Date(tsSec * 1000);
  return `${d.getUTCHours().toString().padStart(2, "0")}:00`;
};

function freshnessTone(f: FreshnessLabel): string {
  switch (f) {
    case "live":
      return "border-pos/40 bg-pos/10 text-pos";
    case "market_closed":
      return "border-line bg-ink-800/60 text-fog-muted";
    case "last_close":
      return "border-amber-500/35 bg-amber-500/10 text-amber-200";
    case "stale":
      return "border-red/40 bg-red/10 text-red";
  }
}

function pctTone(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "text-fog-muted";
  if (pct > 0) return "text-pos";
  if (pct < 0) return "text-red";
  return "text-fog-muted";
}

/** Align peer bars onto ORE bucket timestamps; nearest bar within half a bucket. */
function alignPeerToOre(
  oreTsMs: number[],
  peer: { t: number; close: number }[],
): (number | null)[] {
  if (!peer.length) return oreTsMs.map(() => null);
  let j = 0;
  const maxGap = oreTsMs.length > 1
    ? Math.max(60_000, Math.abs(oreTsMs[1] - oreTsMs[0]) * 0.75)
    : 6 * 3600_000;
  return oreTsMs.map((t) => {
    while (j + 1 < peer.length && Math.abs(peer[j + 1].t - t) <= Math.abs(peer[j].t - t)) j++;
    const best = peer[j];
    if (Math.abs(best.t - t) > maxGap) return null;
    return best.close;
  });
}

export function RwaTab() {
  const [range, setRange] = useState<RwaRange>("30d");
  const [feedId, setFeedId] = useState(DEFAULT_RWA_FEED_ID);
  const asset = rwaAssetByFeedId(feedId) ?? RWA_ASSETS[0];

  const trends = usePolled(() => fetchOreTrends(range), 60_000, [range]);
  const prices = usePolled(() => fetchRwaPrices(), 60_000, []);
  const bars = usePolled(() => fetchRwaBars(feedId, range), 120_000, [feedId, range]);

  const quote: RwaPriceQuote | null =
    prices.data?.quotes.find((q) => q.feedId === feedId) ?? null;

  const orePoints = trends.data?.points ?? [];
  const useHourLabels = range === "24h" || (orePoints.length > 1 && (orePoints[1]?.day_ts - orePoints[0]?.day_ts) < 48 * 3600);
  const lbl = (ts: number) => (useHourLabels ? hourLbl(ts) : dayLbl(ts));

  const chart = useMemo(() => {
    const oreTs = orePoints.map((p) => (p.day_ts > 1e12 ? p.day_ts : p.day_ts * 1000));
    const oreCloses = orePoints.map((p) => p.ore_usd);
    const peerRaw = bars.data?.points ?? [];
    const peerAligned = oreTs.length
      ? alignPeerToOre(oreTs, peerRaw)
      : peerRaw.map((p) => p.close);
    const labels = oreTs.length
      ? orePoints.map((p) => lbl(p.day_ts > 1e12 ? Math.floor(p.day_ts / 1000) : p.day_ts))
      : peerRaw.map((p) => lbl(Math.floor(p.t / 1000)));

    // If ORE series is empty, still show peer-only normalized path
    const oreNorm = normalizePerformance(oreCloses.length ? oreCloses : peerAligned.map(() => null));
    const peerNorm = normalizePerformance(
      oreCloses.length ? peerAligned : peerRaw.map((p) => p.close),
    );

    const a: TPt[] = labels.map((label, i) => ({ label, value: oreNorm[i] ?? null }));
    const b: TPt[] = labels.map((label, i) => ({ label, value: peerNorm[i] ?? null }));

    const lastOre = [...oreNorm].reverse().find((v) => v != null) ?? null;
    const lastPeer = [...peerNorm].reverse().find((v) => v != null) ?? null;

    return { a, b, lastOre, lastPeer, hasOre: oreCloses.some((v) => v != null), hasPeer: peerNorm.some((v) => v != null) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orePoints, bars.data, range]);

  const loadingChart = (trends.loading && !trends.data) || (bars.loading && !bars.data);
  const pricesLoading = prices.loading && !prices.data;
  const configError = prices.provenance?.caveats?.[0] ?? bars.provenance?.caveats?.[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-wide text-white">RWA / Crypto</h2>
          <p className="mt-1 max-w-2xl text-sm text-fog-muted">
            Compare ORE&apos;s USD performance against major crypto, commodity, equity, and rates benchmarks.
            Chart shows normalized % from the start of the selected range.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Refreshing active={prices.fetching || bars.fetching || trends.fetching} />
          <SegmentedControl
            aria-label="Comparison time range"
            items={[...RWA_RANGES]}
            value={range}
            onChange={(id) => setRange(id as RwaRange)}
          />
        </div>
      </div>

      {/* Asset picker grouped by class */}
      <div className="space-y-3">
        {RWA_ASSET_CLASSES.map((cls) => {
          const group = RWA_ASSETS.filter((a) => a.assetClass === cls);
          return (
            <div key={cls}>
              <div className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-fog-muted">
                {cls}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.map((a) => {
                  const active = a.feedId === feedId;
                  return (
                    <button
                      key={a.feedId}
                      type="button"
                      onClick={() => setFeedId(a.feedId)}
                      className={`rounded-md border px-2.5 py-1.5 font-mono text-[12.5px] font-semibold transition ${
                        active
                          ? "border-cyan-400/50 bg-cyan-400/15 text-white"
                          : "border-line bg-ink-800/40 text-[#B7BDD2] hover:border-line-bright hover:text-white"
                      }`}
                      aria-pressed={active}
                    >
                      <span className="text-white">{a.symbol}</span>
                      <span className="ml-1.5 hidden text-fog-muted sm:inline">{a.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected asset summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={`${asset.name} (${asset.symbol})`}
          value={pricesLoading ? "···" : formatUsdPrice(quote?.price, asset.symbol)}
          hint={asset.assetClass}
        />
        <StatTile
          label={`${asset.symbol} · ${range.toUpperCase()}`}
          value={
            <span className={pctTone(chart.lastPeer)}>
              {formatPctChange(chart.lastPeer)}
            </span>
          }
          hint={chart.lastOre != null ? `ORE ${formatPctChange(chart.lastOre)}` : "normalized % change"}
        />
        <StatTile
          label="Market status"
          value={
            quote?.tradable == null
              ? asset.marketHours === "24/7"
                ? "24/7"
                : "···"
              : quote.tradable
                ? "Open"
                : "Closed"
          }
          hint={quote?.ts ? `as of ${timeAgo(quote.ts)}` : undefined}
        />
        <div className="flex flex-col justify-center rounded-lg border border-line bg-ink-800/40 px-3 py-3">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-fog-muted">
            Quote freshness
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {quote ? (
              <span
                className={`rounded-md border px-2 py-1 font-mono text-[12px] font-bold ${freshnessTone(quote.freshness)}`}
              >
                {freshnessLabelText(quote.freshness)}
              </span>
            ) : (
              <span className="font-mono text-sm text-fog-muted">{pricesLoading ? "loading…" : "unavailable"}</span>
            )}
            {quote?.ts && (
              <span className="font-mono text-[12px] text-fog-muted" title={quote.ts}>
                {timeAgo(quote.ts)}
              </span>
            )}
          </div>
          {quote?.error && (
            <div className="mt-1 font-mono text-[11px] text-fog-muted">{quote.error}</div>
          )}
        </div>
      </div>

      {(prices.error || bars.error || trends.error || configError) && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 font-mono text-[12.5px] text-amber-100/90">
          {prices.error || bars.error || trends.error || configError}
          {" — "}partial data may still show. One failed feed never blanks the tab.
        </div>
      )}

      <ChartCard
        variant="dispersion"
        cutCorner="bl"
        title={`ORE vs ${asset.symbol} · normalized performance`}
        subtitle="Both series indexed to 0% at the first available point in the range. Raw prices differ too much to share a dollar axis."
        right={
          <span className="rounded-md border border-line px-2 py-1 font-mono text-[12px] font-bold text-[#B7BDD2]">
            {asset.assetClass}
          </span>
        }
      >
        <DualLine
          shared
          a={chart.a}
          b={chart.b}
          aName="ORE"
          bName={asset.symbol}
          aColor={ORE_COLOR}
          bColor={PEER_COLOR}
          height={260}
          fill
          aFmt={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
          bFmt={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
          loading={loadingChart}
          emptyText={
            !chart.hasOre && !chart.hasPeer
              ? "No overlapping price history yet. Check Autonom keys / analytics trends."
              : undefined
          }
        />
      </ChartCard>

      {/* Compact quote table for all assets */}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[640px] border-collapse font-mono text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-ink-800/60 text-left text-fog-muted">
              <th className="px-3 py-2 font-bold">Asset</th>
              <th className="px-3 py-2 font-bold">Class</th>
              <th className="px-3 py-2 font-bold">Price</th>
              <th className="px-3 py-2 font-bold">Status</th>
              <th className="px-3 py-2 font-bold">Freshness</th>
              <th className="px-3 py-2 font-bold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {RWA_ASSETS.map((a) => {
              const q = prices.data?.quotes.find((x) => x.feedId === a.feedId);
              const active = a.feedId === feedId;
              return (
                <tr
                  key={a.feedId}
                  className={`cursor-pointer border-b border-line/60 transition hover:bg-white/[0.03] ${
                    active ? "bg-cyan-400/5" : ""
                  }`}
                  onClick={() => setFeedId(a.feedId)}
                >
                  <td className="px-3 py-2">
                    <span className="font-bold text-white">{a.symbol}</span>
                    <span className="ml-2 text-fog-muted">{a.name}</span>
                  </td>
                  <td className="px-3 py-2 text-fog-muted">{a.assetClass}</td>
                  <td className="px-3 py-2 text-white">
                    {pricesLoading ? "···" : formatUsdPrice(q?.price ?? null, a.symbol)}
                  </td>
                  <td className="px-3 py-2 text-fog-muted">
                    {q?.tradable == null
                      ? a.marketHours === "24/7"
                        ? "24/7"
                        : "—"
                      : q.tradable
                        ? "Open"
                        : "Closed"}
                  </td>
                  <td className="px-3 py-2">
                    {q ? (
                      <span className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${freshnessTone(q.freshness)}`}>
                        {freshnessLabelText(q.freshness)}
                      </span>
                    ) : (
                      <span className="text-fog-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-fog-muted">{timeAgo(q?.ts)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
