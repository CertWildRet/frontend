"use client";

import { useLiveStats } from "@/hooks/useLiveStats";
import { TileHeatmap } from "./TileHeatmap";
import { formatNum, formatSol, formatRelative } from "@/lib/format";

export function LiveCrankPanel() {
  const { stats, connected, enabled } = useLiveStats();

  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Live crank</h2>
          <p className="text-xs text-muted">What the 24/7 keeper is doing on the ORE board, right now.</p>
        </div>
        <span
          className={`badge ${
            enabled && connected
              ? "bg-accent-simple/15 text-accent-simple"
              : "bg-bg-elevated text-muted"
          }`}
        >
          {enabled ? (connected ? "● live" : "○ reconnecting") : "○ feed offline"}
        </span>
      </div>

      {!enabled ? (
        <p className="rounded-md border border-bg-border bg-bg-elevated p-6 text-center text-sm text-muted">
          Live feed not configured (set <code>NEXT_PUBLIC_BRAIN_URL</code>).
        </p>
      ) : !stats ? (
        <p className="rounded-md border border-bg-border bg-bg-elevated p-6 text-center text-sm text-muted">
          Waiting for the first frame from the keeper…
        </p>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-5 md:grid-cols-4">
            <Metric label="ORE round" value={`#${stats.roundId}`} />
            <Metric label="Motherlode pool" value={`${formatSol(stats.motherlodePoolOre, 1)} ORE`} hint="1/625 hit/round" />
            <Metric label="Board deployed" value={`${formatSol(stats.totalDeployedSol, 2)} SOL`} />
            <Metric label="Active miners" value={formatNum(stats.totalMiners)} />
          </div>

          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-gray-300">Board — per-tile deploys (all miners)</h3>
            <span className="text-xs text-muted">shade ∝ SOL</span>
          </div>
          <TileHeatmap perTileSol={stats.perTileSol} />

          <div className="mt-5 rounded-md border border-bg-border bg-bg-elevated p-4">
            <div className="flex items-center justify-between">
              <span className="stat-label">Keeper&apos;s last action</span>
              {stats.lastCrank && (
                <span className="text-xs text-muted">{formatRelative(stats.lastCrank.ts)}</span>
              )}
            </div>
            {stats.lastCrank ? (
              <p className="mt-1.5 font-mono text-sm text-gray-200">
                {stats.lastCrank.action === "crank_mine" ? (
                  <>
                    deployed{" "}
                    <span className="text-accent-simple">{formatSol(stats.lastCrank.perTileSol, 4)} SOL</span>{" "}
                    × 25 tiles · EV ${formatNum(stats.lastCrank.evUsd, 2)}
                  </>
                ) : (
                  <>
                    {stats.lastCrank.action}{" "}
                    <span className="text-muted">— {stats.lastCrank.reason}</span>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-muted">No crank yet this session.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value mt-1">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted">{hint}</div>}
    </div>
  );
}
