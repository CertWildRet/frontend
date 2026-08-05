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
import { fetchOreRounds } from "@/lib/oreStats";
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

export function HealthClient() {
  const connection = useReadonlyRpc();
  const spine = usePolled(() => fetchOreRounds(50, 0), 30_000, []);
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

      <Caveats provenance={spine.provenance} error={spine.error} onRetry={spine.refresh} />
    </div>
  );
}
