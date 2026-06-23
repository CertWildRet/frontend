"use client";

import { useLiveStats } from "@/hooks/useLiveStats";
import { TileHeatmap } from "./TileHeatmap";
import { OreMark } from "./OreMark";
import { formatNum, formatSol, formatRelative } from "@/lib/format";

export function LiveCrankPanel() {
  const { stats, connected, enabled } = useLiveStats();

  return (
    <section className="panel">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OreMark className="h-7 w-7 text-gold/70 drop-shadow-[0_0_12px_rgba(194,144,26,0.4)]" />
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Live crank</h2>
            <p className="font-mono text-[12px] text-fog-muted">What the keeper is doing on the board, right now.</p>
          </div>
        </div>
        <span className={`chip ${enabled && connected ? "border-gold/30 text-gold" : "border-line text-fog-muted"}`}>
          {enabled && connected ? <span className="live-dot text-gold" /> : null}
          {enabled ? (connected ? "live" : "reconnecting") : "feed offline"}
        </span>
      </div>

      {!enabled ? (
        <Empty>
          Live feed not configured (set <code className="text-fog-dim">NEXT_PUBLIC_BRAIN_URL</code>).
        </Empty>
      ) : !stats ? (
        <Empty>Waiting for the first frame from the keeper.</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)] lg:items-start">
          {/* Left: the 25-tile board, capped so the 5x5 stays compact and uniform across viewports */}
          <div className="w-full max-w-[440px]">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="label text-fog-dim">Board · per-tile deploys</h3>
              <span className="font-mono text-[12px] text-fog-muted">shade ∝ SOL</span>
            </div>
            <TileHeatmap perTileSol={stats.perTileSol} />
          </div>

          {/* Right: live stats + the keeper's last move */}
          <aside className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="ORE round" value={`#${stats.roundId}`} />
              <Metric label="Motherlode" value={formatSol(stats.motherlodePoolOre, 1)} unit="ORE" accent />
              <Metric label="Board deployed" value={formatSol(stats.totalDeployedSol, 2)} unit="SOL" />
              <Metric label="Miners" value={formatNum(stats.totalMiners)} />
            </div>

            <div className="rounded-xl border border-line bg-ink-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="label">Keeper&apos;s last move</span>
                {stats.lastCrank && (
                  <span className="font-mono text-[12px] text-fog-muted">{formatRelative(stats.lastCrank.ts)}</span>
                )}
              </div>
              {stats.lastCrank ? (
                <p className="mt-1.5 num text-sm">
                  {stats.lastCrank.action === "crank_mine" ? (
                    <>
                      deployed <span className="text-gold">{formatSol(stats.lastCrank.perTileSol, 4)} SOL</span> × 25
                      tiles · edge ${formatNum(stats.lastCrank.evUsd, 2)}
                    </>
                  ) : (
                    <span className="text-fog-dim">
                      {stats.lastCrank.action}: {stats.lastCrank.reason}
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-1.5 font-mono text-sm text-fog-muted">No move yet this session.</p>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-line bg-ink-800/40 p-8 text-center font-mono text-sm text-fog-muted">
      {children}
    </p>
  );
}

function Metric({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`num text-lg ${accent ? "gradient-text" : "text-white"}`}>{value}</span>
        {unit && <span className="font-mono text-[12px] text-fog-muted">{unit}</span>}
      </div>
    </div>
  );
}
