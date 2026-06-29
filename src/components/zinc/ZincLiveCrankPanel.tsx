"use client";

import { useZincLiveStats } from "@/hooks/useZincLiveStats";
import { FacetMark } from "../FacetMark";
import { formatNum, formatSol, formatRelative } from "@/lib/format";
import type { ZincPoolStats } from "@/lib/cwr";

// The sole keeper wallet signs crank_mine_zinc on-chain too (operator == the
// bucket's operator_wallet). Public by design.
const CRANK_WALLET = "58QKD3siCxvLzgHFezbu8aTacjZFxy7LaYvgMmwQFiCe";

/**
 * Live dZINC keeper panel — the silver-blue twin of <LiveCrankPanel>. The dZINC
 * board is a 30-tile encrypted full-coverage mask, so when the keeper mines it
 * deploys ALL 30 tiles uniformly (perTile = perRoundSol / 30). We light the whole
 * board on a crank_mine_zinc and show it idle when it holds. Driven by the ZINC
 * keeper feed's lastCrank (NEXT_PUBLIC_ZINC_BRAIN_URL); the held-ZINC + price
 * context comes from the on-chain pool data already on the page.
 */
export function ZincLiveCrankPanel({ data }: { data: ZincPoolStats | null }) {
  const { stats, connected, enabled } = useZincLiveStats();
  const last = stats?.lastCrank ?? null;
  const mining = last?.action === "crank_mine_zinc";
  const perTile = last?.perTileSol ?? 0;
  const perRound = last?.perRoundSol ?? 0;
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
            <p className="font-mono text-[12px] text-fog-muted">What the keeper is doing on the ZINC board, right now.</p>
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
        <Empty>Waiting for the first frame from the ZINC keeper.</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)] lg:items-start">
          {/* Left: the 30-tile board. Full coverage => all 30 light uniformly. */}
          <div className="w-full max-w-[440px]">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="label text-fog-dim">Board · 30-tile coverage</h3>
              <span className="font-mono text-[12px] text-fog-muted">{mining ? "full board" : "idle"}</span>
            </div>
            <ZincBoard30 lit={mining} perTile={perTile} />
          </div>

          {/* Right: live stats + the keeper's last move */}
          <aside className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="ZINC round" value={last?.roundId ? `#${last.roundId}` : "···"} />
              <Metric label="ZINC held" value={held} unit="ZINC" accent />
              <Metric label="Board deployed" value={formatSol(perRound, 2)} unit="SOL" />
              <Metric label="Coverage" value={mining ? "30/30" : "0/30"} unit="tiles" />
            </div>

            <div className="rounded-xl border border-line bg-ink-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="label">Keeper&apos;s last move</span>
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

/** 30-tile silver-blue board (6 x 5). Full coverage lights every tile the same. */
function ZincBoard30({ lit, perTile }: { lit: boolean; perTile: number }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          title={`Tile ${i + 1}: ${lit ? `${formatSol(perTile, 4)} SOL` : "not deployed"}`}
          className={`tile !p-1.5 sm:!p-2 ${lit ? "border-gold/40 shadow-glow-gold" : ""}`}
          style={{
            background: lit
              ? "linear-gradient(160deg, rgba(157,183,216,0.20), rgba(90,110,140,0.34))"
              : "linear-gradient(160deg, rgba(157,183,216,0.05), rgba(90,110,140,0.08))",
          }}
        >
          <span className="absolute left-1.5 top-1 font-mono text-[10px] text-fog-muted sm:left-2 sm:top-1.5 sm:text-[12px]">
            #{i + 1}
          </span>
          <span className={`num text-[11px] leading-none sm:text-xs ${lit ? "text-gold" : "text-fog-muted"}`}>
            {lit ? (
              <>
                <span className="sm:hidden">{formatSol(perTile, 2)}</span>
                <span className="hidden sm:inline">{formatSol(perTile, 3)}</span>
              </>
            ) : (
              "·"
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// dZINC keeper hold/skip reasons -> plain English (mirrors LiveCrankPanel).
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
