"use client";

import { useZincLiveStats } from "@/hooks/useZincLiveStats";
import { useZincRoundStats } from "@/hooks/useZincRoundStats";
import { ZincRoulette } from "./ZincRoulette";
import { FacetMark } from "../FacetMark";
import { formatNum, formatSol, formatRelative } from "@/lib/format";
import type { ZincPoolStats } from "@/lib/cwr";

// The sole miner wallet signs crank_mine_zinc on-chain too (operator == the
// bucket's operator_wallet). Public by design.
const CRANK_WALLET = "58QKD3siCxvLzgHFezbu8aTacjZFxy7LaYvgMmwQFiCe";

/**
 * Live dZINC miner panel — the silver-blue twin of <LiveCrankPanel>. The dZINC
 * board is a 30-tile encrypted full-coverage mask, so when the miner mines it
 * deploys ALL 30 tiles uniformly (perTile = perRoundSol / 30). We light the whole
 * board on a crank_mine_zinc and show it idle when it holds. Driven by the ZINC
 * miner feed's lastCrank (NEXT_PUBLIC_ZINC_BRAIN_URL); the held-ZINC + price
 * context comes from the on-chain pool data already on the page.
 */
export function ZincLiveCrankPanel({ data }: { data: ZincPoolStats | null }) {
  const { stats, connected, enabled } = useZincLiveStats();
  const { stats: round } = useZincRoundStats();
  const last = stats?.lastCrank ?? null;
  const mining = last?.action === "crank_mine_zinc";
  const perTile = last?.perTileSol ?? 0;
  const held = data ? formatNum(data.smeltedZincHeld, 2) : "···";

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
            <p className="font-mono text-[12px] text-fog-muted">What the miner is doing on the ZINC board, right now.</p>
          </div>
        </div>
        <span className={`chip shrink-0 ${enabled && connected ? "border-pos/40 text-white" : "border-line text-fog-muted"}`}>
          {enabled && connected ? <span className="live-dot text-pos" /> : null}
          {enabled ? (connected ? "live" : "reconnecting") : "feed offline"}
        </span>
      </div>

      {!enabled ? (
        <Empty>
          Live feed not configured (set <code className="text-fog-dim">NEXT_PUBLIC_ZINC_BRAIN_URL</code>).
        </Empty>
      ) : !stats ? (
        <Empty>Waiting for the first frame from the ZINC miner.</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)] lg:items-start">
          {/* Left: the 30-tile roulette (the canonical dZINC board format). Full
              coverage => all 30 lit + spinning; idle => dim + static. */}
          <div className="flex w-full max-w-[440px] flex-col items-center">
            <div className="mb-3 flex w-full items-baseline justify-between">
              <h3 className="label text-fog-dim">Board · 30 tiles</h3>
              <span className="font-mono text-[12px] text-fog-muted">{mining ? "full coverage" : "idle"}</span>
            </div>
            <ZincRoulette
              size={360}
              litTiles={mining ? "all" : []}
              animated={mining}
              palette="steel"
              className="max-w-full"
              center={
                <div className="flex flex-col items-center px-2">
                  <span className="font-display text-[22px] font-bold leading-none text-white">
                    {mining ? "30/30" : "idle"}
                  </span>
                  <span className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.26em] text-[#9DB7D8]">
                    {mining ? "tiles lit" : "not mining"}
                  </span>
                </div>
              }
            />
          </div>

          {/* Right: live stats + the miner's last move */}
          <aside className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <Metric
                label="ZINC round"
                value={round?.initialized ? `#${round.roundId}` : last?.roundId ? `#${last.roundId}` : "···"}
              />
              <Metric
                label="Round pot"
                value={round?.initialized ? formatSol(round.totalDeployedSol, 1) : "···"}
                unit="SOL"
                accent
              />
              <Metric label="Players" value={round?.initialized ? formatNum(round.players) : "···"} />
              <Metric label="ZINC held" value={held} unit="ZINC" />
            </div>

            <div className="rounded-xl border border-line bg-ink-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="label">Miner&apos;s last move</span>
                {last && <span className="font-mono text-[12px] text-fog-muted">{formatRelative(last.ts)}</span>}
              </div>
              {last ? (
                <p className="mt-1.5 num text-sm">
                  {last.action === "crank_mine_zinc" ? (
                    <>
                      deployed <span className="text-gold">{formatSol(perTile, 4)} SOL</span> × 30 tiles
                      {last.evUsd ? <> · edge ${formatNum(last.evUsd, 2)}</> : null}
                    </>
                  ) : (
                    <span className="text-fog-dim">{humanizeMove(last.reason)}</span>
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

// dZINC miner hold/skip reasons -> plain English (mirrors LiveCrankPanel).
function humanizeMove(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("already deployed")) return "Already mined this round. Waiting for the next one.";
  if (r.includes("near-empty") || r.includes("budget") || r.includes("idle sol"))
    return "Vault almost empty. It refills at the next claim window.";
  if (r.includes("margin") || r.includes("production cost") || r.includes("cost-to-mine"))
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
