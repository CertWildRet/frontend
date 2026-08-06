"use client";

/**
 * RWA tab — compare ORE USD performance against Autonom oracle benchmarks
 * (gold, silver, crude, equities, T-bills). ORE is fixed; the user picks one
 * peer. Chart defaults to normalized %.
 */
import { useMemo, useState } from "react";
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

/** Forward-fill closed-market holes: ORE trades 24/7 but XAU/SPY sleep nights
 *  and weekends, so aligned peer series have nulls exactly where the crowd is
 *  looking. Carrying the LAST CLOSE through (Autonom's fresh=false semantics —
 *  the price you'd transact against next open) keeps both lines continuous and
 *  the comparison honest. Never fills BEFORE the first real bar: pre-history
 *  would be fabricated, holes after a close are just the market being shut.
 *  Returns which indices were carried so tooltips can say so. */
function forwardFillClosed(values: (number | null)[]): { filled: (number | null)[]; carried: boolean[] } {
  const filled: (number | null)[] = [];
  const carried: boolean[] = [];
  let last: number | null = null;
  for (const v of values) {
    if (v != null) {
      last = v;
      filled.push(v);
      carried.push(false);
    } else {
      filled.push(last);
      carried.push(last != null);
    }
  }
  return { filled, carried };
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
  // Hour labels only for sub-daily buckets (24h). Daily ORE points sit at
  // midnight UTC (~86400s apart) which is still < 48h — the old check made
  // every 7d/30d tick read "00:00".
  const useHourLabels = range === "24h";
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

    // Closed-market holes carry the last close (fresh=false semantics). 24/7
    // assets have no holes, so every class renders the same continuous way.
    const { filled: peerFilled, carried } = forwardFillClosed(
      oreCloses.length ? peerAligned : peerRaw.map((p) => p.close),
    );
    // The newest bucket additionally takes the live quote when it is fresher
    // than the last bar — the chart's endpoint then always matches the quoted
    // price in the strip above, open or closed.
    if (peerFilled.length && quote?.price != null) {
      const i = peerFilled.length - 1;
      if (peerFilled[i] == null || carried[i]) {
        peerFilled[i] = quote.price;
        carried[i] = quote.tradable === false;
      }
    }

    // If ORE series is empty, still show peer-only normalized path
    const oreNorm = normalizePerformance(oreCloses.length ? oreCloses : peerFilled.map(() => null));
    const peerNorm = normalizePerformance(peerFilled);

    const a: TPt[] = labels.map((label, i) => ({ label, value: oreNorm[i] ?? null }));
    const b: TPt[] = labels.map((label, i) => ({
      label,
      value: peerNorm[i] ?? null,
      note: carried[i] ? "market closed — last close carried" : undefined,
    }));

    const lastOre = [...oreNorm].reverse().find((v) => v != null) ?? null;
    const lastPeer = [...peerNorm].reverse().find((v) => v != null) ?? null;

    return { a, b, lastOre, lastPeer, hasOre: oreCloses.some((v) => v != null), hasPeer: peerNorm.some((v) => v != null) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orePoints, bars.data, range, quote?.price, quote?.tradable]);

  const loadingChart = (trends.loading && !trends.data) || (bars.loading && !bars.data);
  const pricesLoading = prices.loading && !prices.data;
  const configError = prices.provenance?.caveats?.[0] ?? bars.provenance?.caveats?.[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-wide text-white">RWA</h2>
          <p className="mt-1 max-w-2xl text-sm text-fog-muted">
            Compare ORE&apos;s USD performance against commodity, equity, and rates benchmarks.
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

      {/* Asset picker — classes inline (the stacked label-per-group layout ate
          three screens of vertical space on mobile for nine chips) */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        {RWA_ASSET_CLASSES.map((cls) => {
          const group = RWA_ASSETS.filter((a) => a.assetClass === cls);
          return (
            <div key={cls} className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-fog-dim">
                {cls}
              </span>
              {group.map((a) => {
                const active = a.feedId === feedId;
                return (
                  <button
                    key={a.feedId}
                    type="button"
                    onClick={() => setFeedId(a.feedId)}
                    title={a.name}
                    className={`rounded-md border px-2.5 py-1.5 font-mono text-[12.5px] font-semibold transition ${
                      active
                        ? "border-cyan-400/50 bg-cyan-400/15 text-white"
                        : "border-[rgba(91,108,255,0.25)] bg-ink-800/40 text-[#B7BDD2] hover:border-steel hover:text-white"
                    }`}
                    aria-pressed={active}
                  >
                    {a.symbol}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* The comparison IS the product — one strip, both numbers at equal weight,
          spread as the verdict; price/market/freshness demoted to one meta row. */}
      <div className="rounded-xl border border-line bg-ink-800/40 px-4 py-3.5">
        <div className="flex flex-wrap items-end gap-x-7 gap-y-3 font-mono">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: ORE_COLOR }}>
              ORE · {range.toUpperCase()}
            </div>
            <div className={`num mt-1.5 text-[28px] leading-none tracking-tight ${pctTone(chart.lastOre)}`}>
              {chart.hasOre ? formatPctChange(chart.lastOre) : "···"}
            </div>
          </div>
          <div className="pb-1 text-[13px] text-fog-dim">vs</div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: PEER_COLOR }}>
              {asset.symbol} · {range.toUpperCase()}
            </div>
            <div className={`num mt-1.5 text-[28px] leading-none tracking-tight ${pctTone(chart.lastPeer)}`}>
              {chart.hasPeer ? (
                formatPctChange(chart.lastPeer)
              ) : bars.loading ? (
                "···"
              ) : (
                <button type="button" onClick={bars.refresh}
                  className="rounded border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[13px] font-semibold text-amber-200 transition-colors hover:border-amber-500/60"
                  title={bars.error ?? "The benchmark feed returned no bars for this range — tap to retry"}>
                  feed unavailable · retry
                </button>
              )}
            </div>
          </div>
          {chart.lastOre != null && chart.lastPeer != null && (() => {
            const spreadPts = chart.lastOre - chart.lastPeer;
            const ahead = spreadPts >= 0;
            return (
              <div className="pb-0.5">
                <span
                  className="rounded-md border px-2 py-1 text-[12.5px] font-bold"
                  style={ahead
                    ? { color: "#4ADE80", borderColor: "#4ADE8055", background: "#4ADE8012" }
                    : { color: "#F87171", borderColor: "#F8717155", background: "#F8717112" }}
                  title={`Normalized ${range.toUpperCase()} performance gap: ORE ${formatPctChange(chart.lastOre)} vs ${asset.symbol} ${formatPctChange(chart.lastPeer)}`}
                >
                  ORE {ahead ? "leads" : "trails"} by {Math.abs(spreadPts).toFixed(1)} pts
                </span>
              </div>
            );
          })()}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-2.5 font-mono text-[12.5px] text-fog-muted"
          style={{ borderColor: "rgba(91,108,255,0.16)" }}>
          <span className="text-white">{pricesLoading ? "···" : formatUsdPrice(quote?.price, asset.symbol)}</span>
          <span className="text-fog-dim">·</span>
          <span>
            {quote?.tradable == null
              ? asset.marketHours === "24/7" ? "trades 24/7" : "market status ···"
              : quote.tradable ? "market open" : "market closed"}
          </span>
          {quote && (
            <>
              <span className="text-fog-dim">·</span>
              <span className={`rounded-md border px-1.5 py-0.5 text-[11.5px] font-bold ${freshnessTone(quote.freshness)}`}>
                {freshnessLabelText(quote.freshness)}
              </span>
            </>
          )}
          {quote?.ts && <span title={quote.ts}>{timeAgo(quote.ts)}</span>}
          {quote?.error && <span className="text-[11.5px]">{quote.error}</span>}
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
        <table className="w-full min-w-[480px] border-collapse font-mono text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-ink-800/60 text-left text-fog-muted">
              <th className="px-3 py-2 font-bold">Asset</th>
              <th className="px-3 py-2 font-bold">Class</th>
              <th className="px-3 py-2 font-bold">Price</th>
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
                  // border-line/60 never compiled (alpha modifier on an rgba theme
                  // color) — rows fell back to the near-white default border.
                  className={`cursor-pointer border-b border-[rgba(91,108,255,0.16)] transition hover:bg-white/[0.03] ${
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
