"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import type { UserPos } from "@/hooks/useUserPosition";
import type { VaultData } from "@/hooks/useVaultData";
import type { PoolStatsData } from "@/hooks/useStats";
import { ConnectHint } from "./ConnectHint";
import { formatNum, formatSol } from "@/lib/format";

/**
 * Your position, valued EXACTLY from on-chain (no priced estimation on the
 * amounts): your pro-rata slice of recoverable SOL + stORE (claimed ORE) +
 * unclaimed ORE. The only priced figure is the combined value headline (SOL/USD),
 * clearly labelled, since pricing ORE in SOL needs a market price.
 */
export function PositionCard({
  pos,
  data,
  stats,
}: {
  pos: UserPos | null;
  data: VaultData | null;
  stats: PoolStatsData | null;
}) {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="card flex flex-col">
        <div>
          <h3 className="font-display text-base font-semibold text-white">Your position</h3>
          <p className="mt-1 font-mono text-[12px] text-fog-muted">Connect a wallet to see your dORE.</p>
        </div>
        <div className="mt-auto pt-4">
          <ConnectHint />
        </div>
      </div>
    );
  }

  const shares = pos?.shares ?? 0;
  const fraction = data && data.totalShares > 0 ? shares / data.totalShares : 0;

  // Exact pro-rata slices (on-chain amounts, no price).
  const yourSol = data ? fraction * data.recoverableSol : 0;
  const yourStore = data ? fraction * data.storeInVaultOre : 0;
  // Net of the 10% claim fee, so this "your recoverable backing" figure matches
  // the /position page and the priced Value above (which use net recoverableOre).
  const yourUnclaimedOre = data ? fraction * Math.max(0, data.unclaimedOre - data.claimFeeOre) : 0;
  const yourOre = data ? fraction * data.recoverableOre : 0;

  // Priced headline (the only estimated figure): value = SOL + ORE x price.
  const solUsd = stats?.prices.solUsd ?? 0;
  const oreUsd = stats?.prices.oreUsd ?? 0;
  const oreToSol = solUsd > 0 && oreUsd > 0 ? oreUsd / solUsd : 0;
  const valueSol = yourSol + yourOre * oreToSol;
  const valueUsd = valueSol * solUsd;
  const priced = oreToSol > 0;

  return (
    <div className="card flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Your position</h3>
        {shares > 0 && (
          <span className="chip border-pos/40 text-white">
            <span className="live-dot text-pos" /> active
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <Metric label="dORE held" value={formatNum(shares, 4)} />
        <Metric
          label="Value"
          value={priced ? formatSol(valueSol, 4) : formatSol(yourSol, 4)}
          unit="SOL"
          sub={priced ? `≈ $${formatNum(valueUsd, 2)} (SOL + ORE)` : "SOL only (ORE price unavailable)"}
          accent
        />
        <Metric label="Pool share" value={`${formatNum((pos?.poolSharePct ?? 0), 2)}%`} />
      </div>

      {/* Exact backing breakdown (your pro-rata, straight from chain) */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="label mb-2">Backing (exact, your share)</div>
        <Row k="Recoverable SOL" v={formatSol(yourSol, 4)} unit="SOL" />
        <Row k="stORE held (claimed ORE)" v={formatNum(yourStore, 4)} unit="stORE" />
        <Row k="Unclaimed ORE" v={formatNum(yourUnclaimedOre, 4)} unit="ORE" />
      </div>

      {shares === 0 && (
        <p className="mt-4 font-mono text-[12px] text-fog-muted">
          No dORE yet. Mint some during the deposit window to start earning.
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-[#9DB7D8]/25 bg-gradient-to-b from-[#9DB7D8]/[0.09] to-[#9DB7D8]/[0.02] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(157,183,216,0.22),0_3px_10px_-3px_rgba(0,0,0,0.7)]">
      <div className="min-w-0">
        <span className="label">{label}</span>
        {sub && <div className="mt-0.5 font-mono text-[11px] text-fog-muted">{sub}</div>}
      </div>
      <span className="flex shrink-0 items-baseline gap-1 whitespace-nowrap">
        <span className={`num text-lg ${accent ? "gradient-text" : "text-white"}`}>{value}</span>
        {unit && <span className="font-mono text-[12px] text-fog-muted">{unit}</span>}
      </span>
    </div>
  );
}

function Row({ k, v, unit }: { k: string; v: string; unit?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5 font-mono text-xs">
      <span className="min-w-0 text-fog-muted">{k}</span>
      <span className="shrink-0 whitespace-nowrap text-right">
        <span className="num text-gray-200">{v}</span>
        {unit && <span className="ml-1 text-[12px] text-fog-muted">{unit}</span>}
      </span>
    </div>
  );
}
