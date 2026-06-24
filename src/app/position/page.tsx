"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useVaultData } from "@/hooks/useVaultData";
import { useUserPosition } from "@/hooks/useUserPosition";
import { useStats } from "@/hooks/useStats";
import { useLiveStats } from "@/hooks/useLiveStats";
import { WalletButton } from "@/components/WalletButton";
import { formatNum, formatSol, formatRelative } from "@/lib/format";

/**
 * High-level overview of YOUR position: holdings, exact on-chain backing (your
 * pro-rata SOL + stORE + unclaimed ORE), and what the pool is mining on your
 * behalf right now. Amounts are exact from chain; only the $/combined value is
 * priced.
 */
export default function PositionPage() {
  const { connected } = useWallet();
  const { data } = useVaultData();
  const { pos } = useUserPosition(data?.totalShares ?? 0);
  const stats = useStats();
  const { stats: live, connected: liveOn } = useLiveStats();

  const shares = pos?.shares ?? 0;
  const fraction = data && data.totalShares > 0 ? shares / data.totalShares : 0;

  const yourSol = data ? fraction * data.recoverableSol : 0;
  const yourStore = data ? fraction * data.storeInVaultOre : 0;
  // Net of the 10% claim fee the pool pays on the rewards_ore leg at harvest, so
  // this backing line matches the Total value (which uses the net recoverableOre).
  const yourUnclaimedOre = data ? fraction * Math.max(0, data.unclaimedOre - data.claimFeeOre) : 0;
  const yourOre = data ? fraction * data.recoverableOre : 0;

  const solUsd = stats?.prices.solUsd ?? 0;
  const oreUsd = stats?.prices.oreUsd ?? 0;
  const oreToSol = solUsd > 0 && oreUsd > 0 ? oreUsd / solUsd : 0;
  const priced = oreToSol > 0;
  const storeUsd = oreUsd * (data?.storeToOreRate ?? 1); // stORE price (rate x ORE)
  const valueSol = yourSol + yourOre * oreToSol;
  const valueUsd = valueSol * solUsd;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Your position</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fog-dim">
          A high-level view of what you hold and exactly what backs it, read straight from the vault and
          the ORE miner. The pool mines as one; your CWR is a pro-rata claim on everything below.
        </p>
      </header>

      {!connected ? (
        <div className="card">
          <h3 className="font-display text-base font-semibold text-white">Connect to view your position</h3>
          <p className="mb-4 mt-1 font-mono text-[12px] text-fog-muted">Your holdings + exact backing appear once connected.</p>
          <WalletButton />
        </div>
      ) : (
        <>
          {/* headline */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Big label="CWR held" value={formatNum(shares, 4)} />
            <Big
              label="Value"
              value={priced ? formatSol(valueSol, 4) : formatSol(yourSol, 4)}
              unit="SOL"
              tone="gold"
              sub={priced ? `≈ $${formatNum(valueUsd, 2)} (SOL + ORE)` : "SOL only (no ORE price)"}
            />
            <Big label="Pool share" value={`${formatNum(pos?.poolSharePct ?? 0, 2)}%`} />
          </div>

          {/* exact backing */}
          <div className="card">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-white">What backs your CWR</h3>
              <span className="chip border-gold/30 text-gold">exact on-chain</span>
            </div>
            <p className="mb-4 font-mono text-[12px] text-fog-muted">
              Your pro-rata slice of the pool. On withdraw you receive your SOL plus your stORE token.
            </p>
            <Line k="Recoverable SOL" v={formatSol(yourSol, 6)} unit="SOL" usd={priced ? yourSol * solUsd : null} />
            <Line k="stORE held (claimed ORE)" v={formatNum(yourStore, 6)} unit="stORE" usd={priced ? yourStore * storeUsd : null} />
            <Line k="Unclaimed ORE (settles to stORE)" v={formatNum(yourUnclaimedOre, 6)} unit="ORE" usd={priced ? yourUnclaimedOre * oreUsd : null} />
            <div className="mt-2 border-t border-line pt-2">
              <Line k="Total value" v={priced ? formatSol(valueSol, 6) : formatSol(yourSol, 6)} unit="SOL" usd={priced ? valueUsd : null} strong />
            </div>
          </div>

          {/* what the pool is mining for you */}
          <div className="card">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-white">What the pool is mining for you</h3>
              <span className={`chip ${liveOn ? "border-pos/40 text-white" : "border-line text-fog-muted"}`}>
                {liveOn ? <span className="live-dot text-pos" /> : null}
                {liveOn ? "live" : "feed offline"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Mini label="Phase" value={data ? (data.phase === 0 ? "Cranking" : "Deposit & claim") : "···"} />
              <Mini label="ORE round" value={live ? `#${live.roundId}` : "···"} />
              <Mini label="Motherlode pool" value={live ? `${formatNum(live.motherlodePoolOre, 1)} ORE` : "···"} />
              <Mini label="Miners on board" value={live ? String(live.totalMiners) : "···"} />
            </div>
            <div className="mt-4 rounded-xl border border-line bg-ink-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="label">Keeper&apos;s last move</span>
                {live?.lastCrank && (
                  <span className="font-mono text-[12px] text-fog-muted">{formatRelative(live.lastCrank.ts)}</span>
                )}
              </div>
              {live?.lastCrank ? (
                <p className="mt-1.5 num text-sm">
                  {live.lastCrank.action === "crank_mine" ? (
                    <>
                      deployed <span className="text-gold">{formatSol(live.lastCrank.perTileSol, 4)} SOL</span> × 25 tiles
                    </>
                  ) : (
                    <span className="text-fog-dim">holding this round</span>
                  )}
                </p>
              ) : (
                <p className="mt-1.5 font-mono text-sm text-fog-muted">No move yet this session.</p>
              )}
            </div>
            <p className="mt-3 font-mono text-[11px] text-fog-muted">
              Per-round history (rounds played, tile-match and motherlode hits) is coming - the indexer
              that tracks every crank will feed it.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Big({ label, value, unit, sub, tone }: { label: string; value: string; unit?: string; sub?: string; tone?: "gold" }) {
  return (
    <div className="rounded-xl border border-[#9DB7D8]/25 bg-gradient-to-b from-[#9DB7D8]/[0.09] to-[#9DB7D8]/[0.02] px-4 py-4 shadow-[inset_0_1px_0_rgba(157,183,216,0.22),0_3px_10px_-3px_rgba(0,0,0,0.7)]">
      <div className="label">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={`num text-2xl ${tone === "gold" ? "gradient-text" : "text-white"}`}>{value}</span>
        {unit && <span className="font-mono text-xs text-fog-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1 font-mono text-[11px] text-fog-muted">{sub}</div>}
    </div>
  );
}

function Line({ k, v, unit, usd, strong }: { k: string; v: string; unit?: string; usd?: number | null; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 font-mono text-xs">
      <span className="min-w-0 text-fog-muted">{k}</span>
      <span className="flex shrink-0 flex-col items-end text-right leading-tight">
        <span className="whitespace-nowrap">
          <span className={`num ${strong ? "text-gold" : "text-gray-200"}`}>{v}</span>
          {unit && <span className="ml-1 text-[12px] text-fog-muted">{unit}</span>}
        </span>
        {usd != null && <span className="mt-0.5 text-[11px] text-fog-muted">≈ ${formatNum(usd, 2)}</span>}
      </span>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-ink-800/60 px-3 py-2.5">
      <div className="label">{label}</div>
      <div className="num mt-1 text-base text-white">{value}</div>
    </div>
  );
}
