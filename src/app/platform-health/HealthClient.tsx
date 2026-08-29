"use client";

/**
 * /platform-health — ops readout for analytics round-data completeness.
 *
 * Structure (grouped by purpose, each fact stated exactly once):
 *   1. hero            overall verdict + poll state
 *   2. Ingestion now   frontiers vs chain (left) · freshness + tip internals (right)
 *   3. integrity row   data quality/holes · backfill depth
 *   4. Downtime report historical outages, classified
 *   5. Live sample     click-only analytics-vs-chain diff for one round
 *   6. Workers         live registry table
 *
 * URL-only by design (no nav entry). Read-only everywhere: this page cannot
 * touch the ingest pipeline.
 */
import { useMemo, useState } from "react";
import { Refreshing } from "@/components/primitives/Skeleton";
import { ChartCard } from "@/components/stats/Charts";
import { FetchError } from "@/app/stats/shared";
import { ApiUsage } from "./ApiUsage";
import { usePolled } from "@/hooks/useOreStats";
import { useReadonlyRpc } from "@/hooks/useReadonlyRpc";
import { fetchOreRounds, fetchOreHealth, type OreHealthReport } from "@/lib/oreStats";
import { deriveHealthMetrics, runLiveSample, type LiveSampleResult } from "@/lib/platformHealth";
import { formatNum } from "@/lib/format";
import styles from "./health.module.css";

const AMBER_LAG_ROUNDS = 100; // ~2h of rounds; normal ops sit near zero
const DIVIDER = "rgba(91,108,255,0.16)"; // row separators on the dark blue surface

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  green: { color: "#4ADE80", label: "healthy" },
  amber: { color: "#FBBF24", label: "degraded" },
  red: { color: "#F87171", label: "ingest off" },
};

const SAMPLE_BADGE: Record<LiveSampleResult["status"], { color: string; label: string; blurb: string }> = {
  ok: { color: "#4ADE80", label: "OK", blurb: "round is fully useful: tiles + participants present, consistent with chain" },
  partial: { color: "#FBBF24", label: "PARTIAL", blurb: "spine row exists but participants or per-tile data are incomplete" },
  missing: { color: "#F87171", label: "MISSING", blurb: "analytics has no usable row for this round" },
  unreachable: { color: "#F87171", label: "UNREACHABLE", blurb: "analytics could not be queried — nothing can be concluded about the data" },
};

const fmtDur = (min: number): string => (min >= 90 ? `${(min / 60).toFixed(1)}h` : `${min}min`);
const fmtEpochRange = (fromTs: number, toTs: number): string => {
  const f = new Date(fromTs * 1000), t = new Date(toTs * 1000);
  const d = (x: Date) => x.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const hm = (x: Date) => x.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d(f) === d(t) ? `${d(f)} ${hm(f)} → ${hm(t)}` : `${d(f)} ${hm(f)} → ${d(t)} ${hm(t)}`;
};
const fmtDate = (tsSec: number | string | null): string => {
  if (tsSec == null) return "···";
  const d = new Date(Number(tsSec) * 1000);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const ago = (msEpoch: number | null): string => {
  if (msEpoch == null) return "never";
  const s = Math.max(0, (Date.now() - msEpoch) / 1000);
  if (s < 90) return `${Math.round(s)}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  return `${(s / 3600).toFixed(1)}h ago`;
};
const fmtAgeMin = (min: number | null): string => {
  if (min == null) return "···";
  if (min < 1) return "just now";
  if (min < 90) return `${min}m ago`;
  return `${(min / 60).toFixed(1)}h ago`;
};
const WORKER_STATUS_COLOR: Record<string, string> = {
  HEALTHY: "#4ADE80", RUNNING: "#22E0E6", ERROR: "#F87171",
  STANDBY: "#B7BDD2", COMPLETE: "#B7BDD2", STARTING: "#FBBF24", DISABLED: "#6B7280",
};

/** Plain-language status meanings — written for a non-technical reader. */
const WORKER_STATUS_INFO: Record<string, string> = {
  HEALTHY: "Last run finished successfully. Everything normal.",
  RUNNING: "Doing a pass right now.",
  ERROR: "The most recent run failed — see the error on the right. One failure is usually transient; repeated failures matter.",
  STANDBY: "Skipped its last turn because another copy of the service held the work lease. Normal on shared infra, not an error.",
  COMPLETE: "A one-time job that already finished. It will not run again.",
  STARTING: "Registered but hasn't taken its first turn since the service booted.",
  DISABLED: "Switched off on purpose via config. Not a failure.",
};

/** What each background worker does + how to read its "last result" number.
 *  Written for a non-technical reader; shown inline (does) and on hover (result). */
const WORKER_INFO: Record<string, { does: string; result: string }> = {
  "ore-live-round": {
    does: "Watches the live round on-chain every few seconds — keeps the current board (tiles, SOL, miner count) fresh on the site.",
    result: "Shows \"ok\" after each pass. It runs every ~4 seconds, so \"last ok\" should always be seconds ago.",
  },
  "ore-reset-tail": {
    does: "Catches each round's final settlement record (one per ~75s round) so finished rounds get their outcome quickly.",
    result: "Number of new settlements ingested this pass — 0 between rounds is normal.",
  },
  "ore-tip": {
    does: "The main indexer: reads every deploy transaction from chain and records who staked what, on which tile.",
    result: "Events processed this pass. Hundreds per pass is normal during busy rounds.",
  },
  "ore-cumulative": {
    does: "Recomputes the running totals (emission, rake, vaulted) for newly settled rounds.",
    result: "Rounds advanced this pass — 0 while waiting for the next settlement is normal.",
  },
  "ore-reset-backfill": {
    does: "One-time gap filler that stitched old settlements down to the historical import. Its gap closed long ago; passes are no-ops.",
    result: "Rounds filled — 0 is the expected steady state.",
  },
  "ore-missing-retry": {
    does: "Retries the handful of transactions the indexer couldn't fetch on the first try (pruned or flaky RPC responses).",
    result: "Transactions recovered — 0 means nothing is missing, which is the good case.",
  },
  "ore-backfill-missing-retry": {
    does: "Retry lane for the deep history walk. Off while the walk is paused.",
    result: "Disabled — no output expected.",
  },
  "ore-prices": {
    does: "Pulls ORE and SOL prices from CoinGecko every minute. No blockchain involved — this is why it keeps running through RPC outages.",
    result: "Price rows written (usually 0 or 1 — one per hourly bucket).",
  },
  "ore-prices-gapfill": {
    does: "Backfills any price hours the minute-poller missed.",
    result: "Hours filled — 0 means no holes.",
  },
  "ore-factor-snapshot": {
    does: "Snapshots the on-chain treasury every ~5 minutes — powers the Yields charts, and its gaps double as this page's downtime detector.",
    result: "1 when a snapshot landed, 0 when the 5-minute lease wasn't due yet.",
  },
  "ore-daily-activity": {
    does: "Rolls up daily mining activity (rounds, unique miners, volume, whale share) for the Trends charts.",
    result: "Days recomputed this pass.",
  },
  "ore-census": {
    does: "Full sweep of every miner account on-chain (~every 30 min) — powers the leaderboard and miner balances.",
    result: "Miner accounts captured (~30,000+ on a real sweep; 0 between sweeps is normal).",
  },
  "ore-miner-cohorts": {
    does: "Groups miners into size buckets (Plankton → Whale) from the census — the Cohort tab's miner view.",
    result: "Snapshots derived this pass.",
  },
  "ore-holder-cohorts": {
    does: "Sweeps every ORE token holder wallet (~every 30 min) — the Cohort tab's wallet-holders view.",
    result: "Holder wallets counted on a real sweep (~26,000+); 0 between sweeps is normal.",
  },
  "ore-warm-miners": {
    does: "Pre-computes the most-viewed miner pages every 6 hours so they open instantly instead of taking minutes.",
    result: "Miner pages warmed. STANDBY between 6-hour passes is normal.",
  },
  "ore-health-heartbeat": {
    does: "Records where every data frontier sits every 5 minutes — the recorder feeding this very page's staleness history.",
    result: "1 per beat.",
  },
  "ore-backfill": {
    does: "The deep history walk toward round zero. Paused on purpose — it runs on its own dedicated RPC when enabled.",
    result: "Disabled — no output expected.",
  },
};

/** Rounds settle ~every 66s — rough count of rounds whose data arrived late. */
const roundsDelayed = (minutes: number): number => Math.round((minutes * 60) / 66);

/** Small colored pill, the page's one repeated accent device. */
function Pill({ color, children, title }: { color: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title}
      className="inline-flex items-center rounded border px-1.5 py-px text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}12` }}>
      {children}
    </span>
  );
}

/** Aligned label/value line — the whole page speaks in these. */
function KV({ label, children, title }: { label: React.ReactNode; children: React.ReactNode; title?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[3px]" title={title}>
      <span className="shrink-0 text-gray-400">{label}</span>
      <span className="text-right text-white [font-variant-numeric:tabular-nums]">{children}</span>
    </div>
  );
}

function FrontierRow({ name, round, lag, hint }: { name: string; round: number | null; lag: number | null; hint: string }) {
  const pill =
    lag == null ? null
    : lag <= 0 ? <Pill color="#4ADE80">at tip</Pill>
    : lag <= AMBER_LAG_ROUNDS ? <Pill color={lag <= 2 ? "#4ADE80" : "#FBBF24"}>−{formatNum(lag)}</Pill>
    : <Pill color="#F87171">−{formatNum(lag)}</Pill>;
  return (
    <div className="flex items-center justify-between gap-3 border-t py-1.5 first:border-t-0" style={{ borderColor: DIVIDER }} title={hint}>
      <span className="text-gray-300">{name}</span>
      <span className="flex items-center gap-2">
        <span className="text-white [font-variant-numeric:tabular-nums]">{round != null ? formatNum(round) : "···"}</span>
        <span className="inline-flex w-16 justify-end">{pill}</span>
      </span>
    </div>
  );
}

export function HealthClient() {
  const connection = useReadonlyRpc();
  const spine = usePolled(() => fetchOreRounds(50, 0), 30_000, []);
  const health = usePolled(() => fetchOreHealth(), 60_000, []);
  const h: OreHealthReport | null = health.data;
  const metrics = useMemo(
    () => (spine.provenance ? deriveHealthMetrics(spine.provenance, spine.data) : null),
    [spine.provenance, spine.data],
  );

  const overall = !metrics
    ? null
    : !metrics.ingestEnabled
      ? STATUS_STYLES.red
      : (metrics.cumulativeLag ?? 0) > AMBER_LAG_ROUNDS
        ? STATUS_STYLES.amber
        : STATUS_STYLES.green;

  // Live sample — click-only, never polled.
  const [roundInput, setRoundInput] = useState("");
  const [sample, setSample] = useState<{ loading: boolean; error: string | null; result: LiveSampleResult | null }>({
    loading: false, error: null, result: null,
  });
  const tip = metrics?.spineTip ?? null;
  const defaultSampleId = tip != null && tip > 1 ? tip - 1 : null;

  const runSample = async () => {
    if (tip == null) return;
    const parsed = roundInput.trim() === "" ? undefined : Number(roundInput.trim());
    if (parsed != null && (!Number.isInteger(parsed) || parsed < 1)) {
      setSample({ loading: false, error: "round id must be a positive integer", result: null });
      return;
    }
    setSample({ loading: true, error: null, result: null });
    try {
      setSample({ loading: false, error: null, result: await runLiveSample(connection, tip, parsed) });
    } catch (e) {
      setSample({ loading: false, error: e instanceof Error ? e.message : String(e), result: null });
    }
  };

  const r = sample.result;
  const badge = r ? SAMPLE_BADGE[r.status] : null;
  const fill = metrics?.recentFill ?? null;
  const delta = (v: number | null | undefined, thresh: number, decimals = 4): { text: string; hot: boolean } => {
    if (v == null) return { text: "·", hot: false };
    const hot = Math.abs(v) > thresh;
    return { text: `${v >= 0 ? "+" : ""}${formatNum(v, decimals)}`, hot };
  };
  const beh = h?.staleness.behind_7d ?? null;

  return (
    <div className={`${styles.page} space-y-5`}>
      {/* ── 1 · hero ── */}
      <header className={styles.hero}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-white">Platform health</h1>
            <p className="mt-1 font-mono text-[13px] text-fog-muted">
              Analytics round-data completeness · ingest forensics + on-demand chain comparison
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono">
            {metrics && (
              <span className="text-[12px] text-fog-muted">
                ingest <span style={{ color: metrics.ingestEnabled ? "#4ADE80" : "#F87171" }}>{metrics.ingestEnabled ? "ON" : "OFF"}</span>
              </span>
            )}
            {overall && (
              <span className={styles.statusChip} style={{ color: overall.color, borderColor: `${overall.color}55`, background: `${overall.color}12` }}>
                <span className={styles.statusDot} style={{ background: overall.color }} />
                {overall.label}
              </span>
            )}
            <span className="text-[12px] text-fog-muted">
              30s poll<Refreshing active={spine.fetching && !!spine.data} />
            </span>
          </div>
        </div>
      </header>

      {/* ── 2 · ingestion now ── */}
      <ChartCard variant="dispersion" cutCorner="tr" title="Ingestion now"
        subtitle="Every frontier vs the live chain tip (left) and how fresh each producer is (right). Recorded every 5 min by the health heartbeat — a gap in beats is itself the footprint of an outage.">
        {!h ? (
          <div className="font-mono text-[13px] text-fog-muted">{health.loading ? "Loading…" : health.error ?? "No health report."}</div>
        ) : (
          <div className="grid gap-x-10 gap-y-4 font-mono text-[13px] md:grid-cols-2">
            <div>
              <div className="section-label mb-1.5">frontiers · hover a row for its source</div>
              <FrontierRow name="Chain (Board)" round={h.now.chain_round} lag={null} hint="live round on-chain, via the live-round worker's Board read" />
              <FrontierRow name="Spine" round={h.now.spine_round} lag={h.now.spine_lag} hint="ore.rounds — round outcomes" />
              <FrontierRow name="Deploy events" round={h.now.deploy_round} lag={h.now.deploy_lag} hint="per-miner deploy data (participants, competition)" />
              <FrontierRow name="Cumulative" round={h.now.cumulative_round}
                lag={h.now.chain_round != null && h.now.cumulative_round != null ? h.now.chain_round - h.now.cumulative_round : null}
                hint="running totals (emission, rake)" />
              <FrontierRow name="Reset tail" round={h.now.reset_tail_round}
                lag={h.now.chain_round != null && h.now.reset_tail_round != null ? h.now.chain_round - h.now.reset_tail_round : null}
                hint="independent reset-event cursor (fast recovery path)" />
            </div>
            <div>
              <div className="section-label mb-1.5">freshness &amp; tip internals</div>
              <KV label="Health heartbeat">{h.now.heartbeat_age_s != null ? fmtAgeMin(Math.round(h.now.heartbeat_age_s / 60)) : "none yet"}</KV>
              <KV label="Factor snapshot">{fmtAgeMin(h.now.factor_age_min)}</KV>
              <KV label="Price point">{fmtAgeMin(h.now.price_age_min)}</KV>
              <KV label="Miner census">{fmtAgeMin(h.now.census_age_min)}</KV>
              {h.now.ingest_progress && (
                <>
                  <KV label="Tip slot lag" title="ingest_progress.lag_slots — slots between the chain tip and the last provably indexed slot">
                    {h.now.ingest_progress.lag_slots ?? "·"} slots
                    {h.now.ingest_progress.catchup_active && <Pill color="#FBBF24" title="the tip is paging a backlog">catch-up</Pill>}
                  </KV>
                  <KV label="Open missing txs">
                    <span style={{ color: (h.now.ingest_progress.missing_open ?? 0) > 0 ? "#FBBF24" : undefined }}>
                      {h.now.ingest_progress.missing_open ?? 0}
                    </span>
                  </KV>
                  {h.now.ingest_progress.last_error && (
                    <div className="pt-1 text-[12px] text-amber">last tip error: {h.now.ingest_progress.last_error}</div>
                  )}
                </>
              )}
              <div className="mt-2 border-t pt-2" style={{ borderColor: DIVIDER }}>
                {beh && h.staleness.first_beat_ts != null ? (
                  <KV label="Fell behind ›3 rounds (7d)" title={`${beh.beats_behind} of ${beh.beats} beats behind · recording since ${fmtDate(h.staleness.first_beat_ts)}`}>
                    <span style={{ color: beh.episodes ? "#FBBF24" : "#4ADE80" }}>{beh.episodes}×</span>
                  </KV>
                ) : (
                  <div className="text-[12px] text-fog-muted">Behind-episode counts appear as heartbeat history accrues.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── 3 · integrity row ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard variant="dispersion" cutCorner="bl" title="Data integrity"
          subtitle="Per-round usefulness and holes that never healed.">
          <div className="space-y-0.5 font-mono text-[13px]">
            {fill && (
              <>
                <KV label="Settled (last 50 spine rows)">{fill.settled} / {fill.sampled}</KV>
                <KV label="…carrying miner counts">
                  <span style={{ color: fill.withMiners === fill.settled ? "#4ADE80" : "#FBBF24" }}>{fill.withMiners} / {fill.settled}</span>
                </KV>
                <KV label="…carrying tile spread">
                  <span style={{ color: fill.withTileSpread === fill.settled ? "#4ADE80" : "#FBBF24" }}>{fill.withTileSpread} / {fill.settled}</span>
                </KV>
              </>
            )}
            {h && (
              <>
                <KV label="Missing rounds (all history)">
                  <span style={{ color: h.coverage.spine_holes.missing_total ? "#FBBF24" : "#4ADE80" }}>
                    {formatNum(h.coverage.spine_holes.missing_total)}
                  </span>
                </KV>
                {h.coverage.spine_holes.gaps.map((g, i) => (
                  <div key={i} className="py-[2px] text-right text-[12px] text-gray-500">
                    after #{formatNum(g.after_round)} → #{formatNum(g.before_round)} · {formatNum(g.missing)} missing
                  </div>
                ))}
                {h.coverage.recent_1000 && (
                  <KV label="Settled w/o deploy data (last 1,000)">
                    <span style={{ color: h.coverage.recent_1000.without_deploys ? "#FBBF24" : "#4ADE80" }}>
                      {h.coverage.recent_1000.without_deploys}
                    </span> / {h.coverage.recent_1000.settled}
                  </KV>
                )}
              </>
            )}
          </div>
        </ChartCard>

        <ChartCard variant="dispersion" cutCorner="tr" title="Backfill depth"
          subtitle="How far back each dataset reaches. Floors move only when the paused genesis walk runs.">
          <div className="space-y-0.5 font-mono text-[13px]">
            {(h?.coverage.tables ?? []).map((tbl) => (
              <KV key={tbl.t} label={tbl.t}>
                {tbl.min_round != null && <>#{formatNum(Number(tbl.min_round))}<span className="text-gray-500"> · </span></>}
                <span className="text-gray-400">{fmtDate(tbl.min_ts)}</span>
              </KV>
            ))}
            {!h && <div className="text-fog-muted">·</div>}
          </div>
        </ChartCard>
      </div>

      {/* ── 4 · downtime report ── */}
      <ChartCard variant="dispersion" cutCorner="bl" title="Downtime report"
        subtitle="Outage episodes mined from the 5-min RPC snapshot cadence (a gap IS an outage), classified against the RPC-independent hourly price feed.">
        {!h ? (
          <div className="font-mono text-[13px] text-fog-muted">{health.loading ? "Loading…" : "·"}</div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[13px] [font-variant-numeric:tabular-nums]">
              <span className="text-gray-300"><span className="font-bold text-white">{h.downtime.totals.count}</span> episodes since {fmtDate(h.downtime.since_ts)}</span>
              <span className="text-gray-300">total <span className="font-bold text-white">{fmtDur(h.downtime.totals.minutes)}</span></span>
              <span className="text-gray-300">largest <span className="font-bold text-white">{fmtDur(h.downtime.totals.largest_minutes)}</span></span>
              <span style={{ color: h.downtime.totals.last7d_count ? "#FBBF24" : "#4ADE80" }}>
                last 7d: {h.downtime.totals.last7d_count} ({fmtDur(h.downtime.totals.last7d_minutes)})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-[12.5px] [font-variant-numeric:tabular-nums]">
                {/* Percentage widths spread the columns across the card instead of
                    packing left with one stretched trailing column. */}
                <thead><tr className="text-left text-gray-500">
                  <th className="w-[22%] whitespace-nowrap py-1 pr-6 font-semibold" title="When the outage started and ended, in your local time">window (local)</th>
                  <th className="w-[9%] whitespace-nowrap py-1 pr-6 text-right font-semibold" title="How long chain snapshots were missing">duration</th>
                  <th className="w-[13%] whitespace-nowrap py-1 pr-6 text-right font-semibold" title="Rough number of game rounds whose data arrived late (rounds settle about every 66 seconds). Delayed, not lost — ingestion backfills after recovery.">≈ rounds delayed</th>
                  <th className="w-[13%] whitespace-nowrap py-1 pr-6 font-semibold" title="What was down: 'rpc only' = our blockchain connection; 'service down' = the whole analytics service">scope</th>
                  <th className="py-1 font-semibold" title="What this meant for the site while it lasted">impact</th>
                </tr></thead>
                <tbody>
                  {h.downtime.episodes.map((e, i) => (
                    <tr key={i} className="border-t text-gray-300" style={{ borderColor: DIVIDER }}>
                      <td className="whitespace-nowrap py-1.5 pr-6">{fmtEpochRange(e.from_ts, e.to_ts)}</td>
                      <td className="whitespace-nowrap py-1.5 pr-6 text-right text-white">{fmtDur(e.minutes)}</td>
                      <td className="whitespace-nowrap py-1.5 pr-6 text-right">{formatNum(roundsDelayed(e.minutes))}</td>
                      <td className="whitespace-nowrap py-1.5 pr-6">
                        <Pill color={e.scope === "service" ? "#F87171" : "#FBBF24"}
                          title={e.scope === "service"
                            ? "Price hours are missing too — the whole analytics service was down, not just its chain connection."
                            : "The off-chain price feed kept landing, so workers were alive — only the blockchain (RPC) side stopped."}>
                          {e.scope === "service" ? "service down" : "rpc only"}
                        </Pill>
                      </td>
                      <td className="py-1.5 text-[12px] text-gray-500">
                        {e.scope === "service"
                          ? "site data frozen while it lasted; backfilled after recovery"
                          : "chain data paused; prices kept updating; backfilled after recovery"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] leading-relaxed text-gray-500">
              &quot;rpc only&quot; = the off-chain price feed kept landing while chain snapshots stopped — workers were
              alive, the RPC side was not. Ingestion self-heals after each episode (the spine backfills), so an
              episode means delayed data, not lost rounds — anything that never healed shows under Data integrity.
            </p>
          </div>
        )}
      </ChartCard>

      {/* ── 5 · live sample ── */}
      <ChartCard variant="dispersion" cutCorner="tr" title="Live sample"
        subtitle="Fetch one settled round from analytics AND the on-chain Round PDA, then diff them. Click-only — nothing here polls the chain.">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={roundInput}
            onChange={(e) => setRoundInput(e.target.value)}
            placeholder={defaultSampleId != null ? `#${defaultSampleId} (tip − 1)` : "round id"}
            inputMode="numeric"
            className="w-44 rounded-lg border border-line bg-transparent px-3 py-1.5 font-mono text-[13px] text-white placeholder:text-gray-600 focus:border-steel focus:outline-none"
            aria-label="Round id to sample"
          />
          <button
            type="button"
            onClick={runSample}
            disabled={tip == null || sample.loading}
            className="rounded-lg border border-line px-4 py-1.5 font-mono text-[13px] text-gray-200 transition-colors hover:border-steel hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sample.loading ? "Sampling…" : "Run live sample"}
          </button>
          {sample.error && <span className="font-mono text-[12px] text-red">{sample.error}</span>}
        </div>

        {r && badge && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className={styles.statusChip} style={{ color: badge.color, borderColor: `${badge.color}55`, background: `${badge.color}12` }}>
                <span className={styles.statusDot} style={{ background: badge.color }} />
                {badge.label}
              </span>
              <span className="font-mono text-[13px] text-gray-300">
                round <span className="text-white">#{formatNum(r.roundId)}</span> · {formatNum(r.lagBehindTip)} behind tip
              </span>
              <span className="font-mono text-[12px] text-fog-muted">{badge.blurb}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3 font-mono text-[13px]" style={{ borderColor: DIVIDER }}>
                <div className="section-label mb-1.5">analytics</div>
                {r.analytics.roundPresent ? (
                  <div className="space-y-0.5">
                    <KV label="tile columns">{r.analytics.tileColumns}/25</KV>
                    <KV label="deployed">{r.analytics.totalDeployedSol != null ? `${formatNum(r.analytics.totalDeployedSol, 3)} SOL` : "·"}</KV>
                    <KV label="miners">{r.analytics.totalMiners ?? "·"}</KV>
                    <KV label="winning tile">{r.analytics.winningTile != null ? `#${r.analytics.winningTile + 1}` : "·"}</KV>
                  </div>
                ) : (
                  <div className="text-red">no row for this round</div>
                )}
              </div>

              <div className="rounded-lg border p-3 font-mono text-[13px]" style={{ borderColor: DIVIDER }}>
                <div className="section-label mb-1.5">participants</div>
                {r.participants.hasParticipants ? (
                  <div className="space-y-0.5">
                    <KV label="total">{r.participants.participantsTotal != null ? formatNum(r.participants.participantsTotal) : "·"}</KV>
                    <KV label="deploy frontier">{r.participants.deployFrontier != null ? formatNum(r.participants.deployFrontier) : "·"}</KV>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-amber">not available</div>
                    {r.participants.reason && <div className="text-[12px] text-fog-muted">{r.participants.reason}</div>}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-3 font-mono text-[13px]" style={{ borderColor: DIVIDER }}>
                <div className="section-label mb-1.5">
                  on-chain round PDA
                  {r.onchainVia === "public-fallback" && (
                    <span className="ml-2 normal-case tracking-normal">
                      <Pill color="#FBBF24" title="The site's own RPC failed; this reading came from an independent public mainnet node instead — the comparison still stands.">via public fallback</Pill>
                    </span>
                  )}
                </div>
                {r.onchain == null ? (
                  <div className="text-amber">both the site RPC and the public fallback failed — chain unreadable, analytics half still stands</div>
                ) : r.onchain.missing ? (
                  <div className="space-y-1">
                    <div className="text-gray-300">account reclaimed</div>
                    <div className="text-[12px] text-fog-muted">expected for old rounds — analytics outliving the PDA is the point of indexing</div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <KV label="deployed">{formatNum(r.onchain.totalDeployedSol, 3)} SOL</KV>
                    <KV label="miners">{formatNum(r.onchain.totalMiners)}</KV>
                    <KV label="winning tile">{r.onchain.winningTile != null ? `#${r.onchain.winningTile + 1}` : "·"}</KV>
                  </div>
                )}
              </div>
            </div>

            {r.deltas && (
              <div className="flex flex-wrap items-center gap-x-8 gap-y-1 rounded-lg border p-3 font-mono text-[13px]" style={{ borderColor: DIVIDER }}>
                <span className="section-label">deltas (analytics − chain)</span>
                {(() => { const d = delta(r.deltas.deployedSol, 0.01); return (
                  <span style={{ color: d.hot ? "#F87171" : "#4ADE80" }}>deployed {d.text}{r.deltas.deployedSol != null ? " SOL" : ""}</span>
                ); })()}
                {(() => { const d = delta(r.deltas.miners, 0, 0); return (
                  <span style={{ color: d.hot ? "#F87171" : "#4ADE80" }}>miners {d.text}</span>
                ); })()}
              </div>
            )}

            {r.errors.length > 0 && (
              <div className="font-mono text-[12px] text-fog-muted">
                {r.errors.map((e, i) => <div key={i}>· {e}</div>)}
              </div>
            )}
          </div>
        )}
      </ChartCard>

      {/* ── 6 · workers ── */}
      <ChartCard variant="dispersion" cutCorner="bl" title="Background workers"
        subtitle="Live status of every registered analytics worker — the same registry the 30-min log report reads.">
        {!h ? <div className="font-mono text-[13px] text-fog-muted">·</div> : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[12.5px] [font-variant-numeric:tabular-nums]">
              <thead><tr className="text-left text-gray-500">
                <th className="whitespace-nowrap py-1 pr-5 font-semibold">worker</th>
                <th className="w-full py-1 pr-5 font-semibold">what it does</th>
                <th className="whitespace-nowrap py-1 pr-5 font-semibold" title="HEALTHY = last run succeeded · RUNNING = mid-pass right now · STANDBY = skipped its turn (another instance held the lease — normal) · COMPLETE = one-time job, finished · DISABLED = switched off on purpose · ERROR = last run failed">status</th>
                <th className="whitespace-nowrap py-1 pr-5 text-right font-semibold" title="When this worker last finished a pass successfully. Compare against its cadence: a 4-second worker should read seconds ago, a 6-hour one can read hours ago.">last ok</th>
                <th className="whitespace-nowrap py-1 pr-5 text-right font-semibold" title="Successful passes since the service last restarted (resets on every deploy)">runs</th>
                <th className="whitespace-nowrap py-1 pr-5 text-right font-semibold" title="Failed passes since the last restart. Occasional blips self-heal; a climbing number matters.">fails</th>
                <th className="whitespace-nowrap py-1 font-semibold" title="What the last pass reported — hover a value to see what the number means for that worker">last result</th>
              </tr></thead>
              <tbody>
                {h.workers.map((w) => {
                  const info = WORKER_INFO[w.name];
                  return (
                    <tr key={w.name} className="border-t align-top text-gray-300" style={{ borderColor: DIVIDER }}>
                      <td className="whitespace-nowrap py-2 pr-5 text-white">{w.name}</td>
                      <td className="min-w-[260px] py-2 pr-5 text-[12px] leading-relaxed text-gray-500">{info?.does ?? "·"}</td>
                      <td className="whitespace-nowrap py-2 pr-5">
                        <span style={{ color: WORKER_STATUS_COLOR[w.status] ?? "#B7BDD2" }}
                          title={WORKER_STATUS_INFO[w.status]}>{w.status}</span>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-5 text-right"
                        title={w.interval_ms != null ? `runs every ${w.interval_ms >= 60_000 ? `${Math.round(w.interval_ms / 60_000)} min` : `${Math.round(w.interval_ms / 1000)}s`}` : undefined}>
                        {ago(w.last_success_at)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-5 text-right">{formatNum(w.successes)}</td>
                      <td className="whitespace-nowrap py-2 pr-5 text-right" style={{ color: w.failures ? "#FBBF24" : undefined }}
                        title={w.failures ? `${w.failures} failed pass(es) since restart — see last error` : "no failures since the last restart"}>
                        {formatNum(w.failures)}
                      </td>
                      <td className="max-w-[220px] truncate py-2 text-[11.5px] text-gray-500"
                        title={w.status === "ERROR" && w.last_error ? w.last_error : info?.result ?? w.last_result ?? undefined}>
                        {w.status === "ERROR" && w.last_error ? <span className="text-red">{w.last_error}</span> : w.last_result ?? "·"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* API gateway usage — who calls this service, how much, and what it costs. */}
      <ApiUsage />

      <FetchError error={spine.error} onRetry={spine.refresh} />
    </div>
  );
}
