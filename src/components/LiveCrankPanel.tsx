"use client";

import { useLiveStats } from "@/hooks/useLiveStats";
import { TileHeatmap } from "./TileHeatmap";
import { FacetMark } from "./FacetMark";
import { formatNum, formatSol, formatRelative } from "@/lib/format";

// The sole keeper wallet that signs every crank_mine on-chain. Public by design:
// anyone can verify the crank's moves on an explorer.
const CRANK_WALLET = "58QKD3siCxvLzgHFezbu8aTacjZFxy7LaYvgMmwQFiCe";

export function LiveCrankPanel() {
  const { stats, connected, enabled } = useLiveStats();

  return (
    <section className="panel">
      <div className="mb-5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <FacetMark className="h-7 w-7 shrink-0 drop-shadow-[0_0_12px_rgba(157,183,216,0.4)]" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <h2 className="whitespace-nowrap font-display text-lg font-semibold text-white">Live crank</h2>
              <a
                href={`https://solscan.io/account/${CRANK_WALLET}`}
                target="_blank"
                rel="noreferrer"
                className="whitespace-nowrap font-mono text-[11px] text-[#9DB7D8] transition-colors hover:text-[#E8EFFA]"
              >
                {CRANK_WALLET.slice(0, 4)}…{CRANK_WALLET.slice(-4)} ↗
              </a>
            </div>
            <p className="font-mono text-[12px] text-fog-muted">What the keeper is doing on the board, right now.</p>
          </div>
        </div>
        <span className={`chip shrink-0 ${enabled && connected ? "border-pos/40 text-white" : "border-line text-fog-muted"}`}>
          {enabled && connected ? <span className="live-dot text-pos" /> : null}
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
                    <span className="text-fog-dim">{humanizeMove(stats.lastCrank.reason)}</span>
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

// Turn the keeper's internal skip/idle reason into plain English (the raw
// strings like "no idle SOL in vault (sol_in_vault == 0)" come from the brain's
// decision engine and shouldn't surface to users).
function humanizeMove(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("no idle sol") || r.includes("sol_in_vault == 0"))
    return "All SOL has been deployed and mined. It returns to the vault as rewards at the next claim window.";
  if (r.includes("per-round budget") || r.includes("near-empty"))
    return "Vault almost empty. It refills at the next claim window.";
  if (r.includes("margin") || r.includes("production cost"))
    return "Holding this round. Mining isn't profitable enough right now.";
  if (r.includes("dry_run")) return "Simulating a dry run, no live transaction.";
  if (r.includes("not readable") || r.includes("not initialized") || r.includes("skipping"))
    return "Waiting on a fresh read from the chain.";
  return "Holding for now, will resume next round.";
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
    <div className="min-w-0">
      <div className="label">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
        <span className={`num text-base sm:text-lg ${accent ? "gradient-text" : "text-white"}`}>{value}</span>
        {unit && <span className="font-mono text-[12px] text-fog-muted">{unit}</span>}
      </div>
    </div>
  );
}
