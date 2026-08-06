"use client";

/**
 * /platform-health — ops readout for analytics round-data completeness.
 *
 * Always-on: provenance-derived tiles + fill quality over the last 50 settled
 * spine rows (30s poll). On-demand: a live sample that fetches one settled
 * round from analytics AND the on-chain Round PDA and diffs them.
 *
 * URL-only by design (no nav entry). Read-only everywhere: this page cannot
 * touch the ingest pipeline.
 */
import { useMemo, useState } from "react";
import { StatTile } from "@/components/primitives/Stat";
import { TileSkeleton, Refreshing } from "@/components/primitives/Skeleton";
import { ChartCard } from "@/components/stats/Charts";
import { Caveats } from "@/app/stats/shared";
import { usePolled } from "@/hooks/useOreStats";
import { useReadonlyRpc } from "@/hooks/useReadonlyRpc";
import { fetchOreRounds, fetchOreHealth, type OreHealthReport } from "@/lib/oreStats";
import { deriveHealthMetrics, runLiveSample, type LiveSampleResult } from "@/lib/platformHealth";
import { formatNum } from "@/lib/format";
import styles from "./health.module.css";

const AMBER_LAG_ROUNDS = 100; // ~2h of rounds; normal ops sit near zero

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

const fmtTs = (iso: string | null): string => {
  if (!iso) return "···";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
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
const WORKER_STATUS_COLOR: Record<string, string> = {
  HEALTHY: "#4ADE80", RUNNING: "#22E0E6", ERROR: "#F87171",
  STANDBY: "#B7BDD2", COMPLETE: "#B7BDD2", STARTING: "#FBBF24", DISABLED: "#6B7280",
};

/** Frontier row for the staleness card: name + round + lag chip vs chain. */
function FrontierRow({ name, round, lag, hint }: { name: string; round: number | null; lag: number | null; hint: string }) {
  const lagColor = lag == null ? undefined : lag <= 2 ? "#4ADE80" : lag <= 100 ? "#FBBF24" : "#F87171";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-gray-300">{name}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-white">{round != null ? formatNum(round) : "···"}</span>
        {lag != null && <span style={{ color: lagColor }}>{lag === 0 ? "at tip" : `−${formatNum(lag)}`}</span>}
        <span className="hidden text-[11px] text-gray-600 sm:inline">{hint}</span>
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

  return (
    <div className={`${styles.page} space-y-6`}>
      <header className={styles.hero}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-white">Platform health</h1>
            <p className="mt-1 font-mono text-[13px] text-fog-muted">
              Analytics round-data completeness · ingest provenance + on-demand chain comparison
            </p>
          </div>
          <div className="flex items-center gap-3">
            {overall && (
              <span className={styles.statusChip} style={{ color: overall.color, borderColor: `${overall.color}55`, background: `${overall.color}12` }}>
                <span className={styles.statusDot} style={{ background: overall.color }} />
                {overall.label}
              </span>
            )}
            <span className="font-mono text-[12px] text-fog-muted">
              30s poll<Refreshing active={spine.fetching && !!spine.data} />
            </span>
          </div>
        </div>
      </header>

      {/* metric grid */}
      {!metrics ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <TileSkeleton /><TileSkeleton /><TileSkeleton /><TileSkeleton /><TileSkeleton /><TileSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Ingest" value={
            <span style={{ color: metrics.ingestEnabled ? "#4ADE80" : "#F87171" }}>{metrics.ingestEnabled ? "ON" : "OFF"}</span>
          } hint="ingest_enabled flag" />
          <StatTile label="Spine tip" value={formatNum(metrics.spineTip)} hint="newest indexed round" />
          <StatTile label="Cumulative through" value={metrics.cumulativeThrough != null ? formatNum(metrics.cumulativeThrough) : "···"} hint="running totals valid to here" />
          <StatTile label="Cumulative lag" value={
            <span style={{ color: (metrics.cumulativeLag ?? 0) > AMBER_LAG_ROUNDS ? "#FBBF24" : undefined }}>
              {metrics.cumulativeLag != null ? formatNum(metrics.cumulativeLag) : "···"}
            </span>
          } unit="rounds" hint={`spine − cumulative · amber > ${AMBER_LAG_ROUNDS}`} />
          <StatTile label="Reset tail" value={metrics.resetTailLastRound != null ? formatNum(metrics.resetTailLastRound) : "···"} hint="last reset-event round" />
          <StatTile label="Census" value={fmtTs(metrics.censusSnapshotTs)} hint="miner census snapshot (30min cadence)" />
        </div>
      )}

      {/* recent fill */}
      <ChartCard title="Recent fill" subtitle="Data quality over the last 50 spine rows: of the settled ones, how many carry a miner count and a per-tile spread.">
        {!fill ? (
          <div className="font-mono text-[13px] text-fog-muted">{spine.loading ? "Loading spine…" : "No spine rows."}</div>
        ) : (
          <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[14px]">
            <span className="text-gray-300">settled <span className="font-bold text-white">{fill.settled}</span> / {fill.sampled} sampled</span>
            <span style={{ color: fill.withMiners === fill.settled ? "#4ADE80" : "#FBBF24" }}>
              with miners {fill.withMiners} / {fill.settled}
            </span>
            <span style={{ color: fill.withTileSpread === fill.settled ? "#4ADE80" : "#FBBF24" }}>
              with tile spread {fill.withTileSpread} / {fill.settled}
            </span>
          </div>
        )}
      </ChartCard>

      {/* live sample */}
      <ChartCard title="Live sample" subtitle="Fetch one settled round from analytics AND the on-chain Round PDA, then diff them. Click-only — nothing here polls the chain.">
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
              <div className="rounded-lg border border-line p-3 font-mono text-[13px]">
                <div className="section-label mb-2">analytics</div>
                {r.analytics.roundPresent ? (
                  <div className="space-y-1 text-gray-300">
                    <div>tile columns <span className="text-white">{r.analytics.tileColumns}/25</span></div>
                    <div>deployed <span className="text-white">{r.analytics.totalDeployedSol != null ? `${formatNum(r.analytics.totalDeployedSol, 3)} SOL` : "·"}</span></div>
                    <div>miners <span className="text-white">{r.analytics.totalMiners ?? "·"}</span></div>
                    <div>winning tile <span className="text-white">{r.analytics.winningTile != null ? `#${r.analytics.winningTile + 1}` : "·"}</span></div>
                  </div>
                ) : (
                  <div className="text-red">no row for this round</div>
                )}
              </div>

              <div className="rounded-lg border border-line p-3 font-mono text-[13px]">
                <div className="section-label mb-2">participants</div>
                {r.participants.hasParticipants ? (
                  <div className="space-y-1 text-gray-300">
                    <div>total <span className="text-white">{r.participants.participantsTotal != null ? formatNum(r.participants.participantsTotal) : "·"}</span></div>
                    <div>deploy frontier <span className="text-white">{r.participants.deployFrontier != null ? formatNum(r.participants.deployFrontier) : "·"}</span></div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-amber">not available</div>
                    {r.participants.reason && <div className="text-[12px] text-fog-muted">{r.participants.reason}</div>}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-line p-3 font-mono text-[13px]">
                <div className="section-label mb-2">on-chain round PDA</div>
                {r.onchain == null ? (
                  <div className="text-amber">RPC lookup failed — analytics half still stands</div>
                ) : r.onchain.missing ? (
                  <div className="space-y-1">
                    <div className="text-gray-300">account reclaimed</div>
                    <div className="text-[12px] text-fog-muted">expected for old rounds — analytics outliving the PDA is the point of indexing</div>
                  </div>
                ) : (
                  <div className="space-y-1 text-gray-300">
                    <div>deployed <span className="text-white">{formatNum(r.onchain.totalDeployedSol, 3)} SOL</span></div>
                    <div>miners <span className="text-white">{formatNum(r.onchain.totalMiners)}</span></div>
                    <div>winning tile <span className="text-white">{r.onchain.winningTile != null ? `#${r.onchain.winningTile + 1}` : "·"}</span></div>
                  </div>
                )}
              </div>
            </div>

            {r.deltas && (
              <div className="flex flex-wrap gap-x-8 gap-y-1 rounded-lg border border-line p-3 font-mono text-[13px]">
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

      {/* ── forensics: staleness ── */}
      <ChartCard title="Staleness · where every frontier sits"
        subtitle="Chain tip (from the live Board read) vs each ingestion frontier. Recorded every 5 min by the health heartbeat — a gap in beats is itself the footprint of an outage.">
        {!h ? (
          <div className="font-mono text-[13px] text-fog-muted">{health.loading ? "Loading…" : health.error ?? "No health report."}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 font-mono text-[13px]">
              <FrontierRow name="Chain (Board)" round={h.now.chain_round} lag={null} hint="live round on-chain" />
              <FrontierRow name="Spine" round={h.now.spine_round} lag={h.now.spine_lag} hint="ore.rounds" />
              <FrontierRow name="Deploy events" round={h.now.deploy_round} lag={h.now.deploy_lag} hint="per-miner data" />
              <FrontierRow name="Cumulative" round={h.now.cumulative_round}
                lag={h.now.chain_round != null && h.now.cumulative_round != null ? h.now.chain_round - h.now.cumulative_round : null} hint="running totals" />
              <div className="pt-1 text-[12px] text-gray-500">
                heartbeat {h.now.heartbeat_age_s != null ? `${Math.round(h.now.heartbeat_age_s / 60)}m ago` : "none yet"}
                {" · "}factor snap {h.now.factor_age_min != null ? `${h.now.factor_age_min}m` : "·"}
                {" · "}census {h.now.census_age_min != null ? `${Math.round(h.now.census_age_min / 60 * 10) / 10}h` : "·"}
              </div>
            </div>
            <div className="space-y-1.5 font-mono text-[13px]">
              {h.staleness.behind_7d && h.staleness.first_beat_ts != null ? (
                <>
                  <div className="text-gray-300">Fell behind (&gt;3 rounds): <span className="text-white">{h.staleness.behind_7d.episodes}×</span> in 7d</div>
                  <div className="text-gray-300">Beats behind: <span className="text-white">{h.staleness.behind_7d.beats_behind}</span> / {h.staleness.behind_7d.beats}</div>
                  <div className="text-[12px] text-gray-500">recording since {fmtDate(h.staleness.first_beat_ts)}</div>
                </>
              ) : (
                <div className="text-[12px] text-fog-muted">Heartbeat history collecting — behind-episode counts appear as beats accrue.</div>
              )}
              {h.now.ingest_progress && (
                <div className="pt-1 text-[12px] text-gray-500">
                  tip lag {h.now.ingest_progress.lag_slots ?? "·"} slots
                  {h.now.ingest_progress.catchup_active && <span className="text-amber"> · CATCH-UP ACTIVE</span>}
                  {" · "}open missing txs {h.now.ingest_progress.missing_open ?? 0}
                  {h.now.ingest_progress.last_error && <div className="text-amber">last error: {h.now.ingest_progress.last_error}</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── forensics: downtime report ── */}
      <ChartCard title="Downtime report"
        subtitle="Outage episodes mined from the 5-min RPC snapshot cadence (a gap IS an outage), classified against the RPC-independent hourly price feed: rpc = only the chain side stopped; service = the whole service was down.">
        {!h ? (
          <div className="font-mono text-[13px] text-fog-muted">{health.loading ? "Loading…" : "·"}</div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[13px]">
              <span className="text-gray-300"><span className="font-bold text-white">{h.downtime.totals.count}</span> episodes since {fmtDate(h.downtime.since_ts)}</span>
              <span className="text-gray-300">total <span className="font-bold text-white">{fmtDur(h.downtime.totals.minutes)}</span></span>
              <span className="text-gray-300">largest <span className="font-bold text-white">{fmtDur(h.downtime.totals.largest_minutes)}</span></span>
              <span style={{ color: h.downtime.totals.last7d_count ? "#FBBF24" : "#4ADE80" }}>
                last 7d: {h.downtime.totals.last7d_count} ({fmtDur(h.downtime.totals.last7d_minutes)})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-[12.5px]">
                <thead><tr className="text-left text-gray-500">
                  <th className="py-1 pr-4 font-semibold">window (local)</th>
                  <th className="py-1 pr-4 text-right font-semibold">duration</th>
                  <th className="py-1 font-semibold">scope</th>
                </tr></thead>
                <tbody>
                  {h.downtime.episodes.map((e, i) => (
                    <tr key={i} className="border-t border-line/50 text-gray-300">
                      <td className="py-1.5 pr-4">{fmtEpochRange(e.from_ts, e.to_ts)}</td>
                      <td className="py-1.5 pr-4 text-right text-white">{fmtDur(e.minutes)}</td>
                      <td className="py-1.5">
                        <span className="rounded border px-1.5 py-0.5 text-[11px] uppercase tracking-wide"
                          style={e.scope === "service"
                            ? { color: "#F87171", borderColor: "#F8717155" }
                            : { color: "#FBBF24", borderColor: "#FBBF2455" }}>
                          {e.scope === "service" ? "service down" : "rpc only"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] leading-relaxed text-gray-500">
              &quot;rpc only&quot; = the off-chain price feed kept landing while chain snapshots stopped — workers were
              alive, the RPC side was not. Ingestion self-heals after each episode (spine backfills), so an
              episode means delayed data, not lost rounds — cross-check the spine holes below for anything
              that never healed.
            </p>
          </div>
        )}
      </ChartCard>

      {/* ── forensics: coverage + backfill depth ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Backfill depth · oldest data"
          subtitle="How far back each dataset reaches. The deep genesis walk is paused; floors move only when it runs.">
          {!h ? <div className="font-mono text-[13px] text-fog-muted">·</div> : (
            <div className="space-y-1.5 font-mono text-[13px]">
              {h.coverage.tables.map((tbl) => (
                <div key={tbl.t} className="flex items-baseline justify-between gap-3">
                  <span className="text-gray-300">{tbl.t}</span>
                  <span>
                    {tbl.min_round != null && <span className="text-white">#{formatNum(Number(tbl.min_round))}</span>}
                    <span className="text-gray-500"> · {fmtDate(tbl.min_ts)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
        <ChartCard title="Spine integrity"
          subtitle="Missing round ids in ore.rounds (holes that never healed) and per-round usefulness over the last 1,000 settled rounds.">
          {!h ? <div className="font-mono text-[13px] text-fog-muted">·</div> : (
            <div className="space-y-2 font-mono text-[13px]">
              <div className="text-gray-300">
                missing rounds <span className="font-bold" style={{ color: h.coverage.spine_holes.missing_total ? "#FBBF24" : "#4ADE80" }}>
                  {formatNum(h.coverage.spine_holes.missing_total)}
                </span>
              </div>
              {h.coverage.spine_holes.gaps.map((g, i) => (
                <div key={i} className="text-[12px] text-gray-500">
                  gap after #{formatNum(g.after_round)} → #{formatNum(g.before_round)} ({formatNum(g.missing)} missing)
                </div>
              ))}
              {h.coverage.recent_1000 && (
                <div className="pt-1 text-gray-300">
                  settled without deploy data (last 1,000):{" "}
                  <span className="font-bold" style={{ color: h.coverage.recent_1000.without_deploys ? "#FBBF24" : "#4ADE80" }}>
                    {h.coverage.recent_1000.without_deploys}
                  </span> / {h.coverage.recent_1000.settled}
                </div>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── forensics: workers ── */}
      <ChartCard title="Background workers"
        subtitle="Live status of every registered analytics worker — the same registry the 30-min log report reads.">
        {!h ? <div className="font-mono text-[13px] text-fog-muted">·</div> : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[12.5px]">
              <thead><tr className="text-left text-gray-500">
                <th className="py-1 pr-3 font-semibold">worker</th>
                <th className="py-1 pr-3 font-semibold">status</th>
                <th className="py-1 pr-3 text-right font-semibold">last ok</th>
                <th className="py-1 pr-3 text-right font-semibold">runs</th>
                <th className="py-1 pr-3 text-right font-semibold">fails</th>
                <th className="py-1 font-semibold">last result / error</th>
              </tr></thead>
              <tbody>
                {h.workers.map((w) => (
                  <tr key={w.name} className="border-t border-line/50 text-gray-300">
                    <td className="py-1.5 pr-3 text-white">{w.name}</td>
                    <td className="py-1.5 pr-3">
                      <span style={{ color: WORKER_STATUS_COLOR[w.status] ?? "#B7BDD2" }}>{w.status}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-right">{ago(w.last_success_at)}</td>
                    <td className="py-1.5 pr-3 text-right">{formatNum(w.successes)}</td>
                    <td className="py-1.5 pr-3 text-right" style={{ color: w.failures ? "#FBBF24" : undefined }}>{formatNum(w.failures)}</td>
                    <td className="max-w-[320px] truncate py-1.5 text-[11.5px] text-gray-500" title={w.last_error ?? w.last_result ?? undefined}>
                      {w.status === "ERROR" && w.last_error ? <span className="text-red">{w.last_error}</span> : w.last_result ?? "·"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <Caveats provenance={spine.provenance} error={spine.error} onRetry={spine.refresh} />
    </div>
  );
}
