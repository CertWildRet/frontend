"use client";

import type { ReactNode } from "react";
import type { VaultData } from "@/hooks/useVaultData";
import type { PoolStatsData } from "@/hooks/useStats";
import { formatNum, formatSol } from "@/lib/format";

export function PoolStats({ data, stats }: { data: VaultData | null; stats?: PoolStatsData | null }) {
  const feeBps = data?.pullFeeEnabled ? (data?.pullFeeBps ?? 0) : 0;
  // TVL / value-per-share are built from the SAME exact on-chain recoverable that
  // useVaultData computes (sol_in_vault + won SOL + in-flight + unclaimed ORE +
  // stORE x redemption rate) - NEVER the on-chain navSnapshot, which is idle-SOL
  // only and reads ~0 mid-round. The brain is used ONLY for the ORE->SOL price.
  // This keeps PoolStats identical to PoolEconomics on the same page.
  const solUsd = stats?.prices.solUsd ?? null;
  const oreUsd = stats?.prices.oreUsd ?? null;
  const oreToSol = solUsd && oreUsd && solUsd > 0 ? oreUsd / solUsd : 0;
  const priced = oreToSol > 0;
  const totalShares = data?.initialized ? data.totalShares : null;

  // SOL legs are always exact on-chain; the ORE leg is added only when priced.
  const recSol = data?.initialized ? data.recoverableSol : null;
  const recOre = data?.initialized ? data.recoverableOre : null;
  const tvlSol = recSol != null ? (priced && recOre != null ? recSol + recOre * oreToSol : recSol) : null;
  const cwrSol = tvlSol != null && totalShares ? tvlSol / totalShares : null;

  const tvl = tvlSol != null ? formatSol(tvlSol, 2) : "···";
  const price = cwrSol != null ? formatNum(cwrSol, 4) : "···";
  const tvlHint = priced ? "true recoverable value" : "SOL only (ORE not priced)";
  // Sub-line: the dollar value of the whole dORE supply (supply x value/share x SOL/USD).
  const supplyHint =
    totalShares != null && cwrSol != null && solUsd
      ? `≈ $${formatNum(totalShares * cwrSol * solUsd, 2)}`
      : undefined;
  const store = data?.initialized ? formatNum(data.storeInVaultOre, 4) : "···";
  const unclaimed = data?.initialized ? formatNum(data.unclaimedOre, 4) : "···";
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <Tile label="TVL" value={tvl} unit="SOL" accent hint={tvlHint} />
      <Tile label="dORE price" value={price} unit="SOL" hint="value per share" />
      <Tile label="dORE supply" value={data?.initialized ? formatNum(data.totalShares, 2) : "···"} hint={supplyHint} />
      <Tile
        label={<><span className="normal-case">stORE</span> held</>}
        value={store}
        unit="stORE"
        hint="claimed ORE in pool"
      />
      <Tile label="Unclaimed ORE" value={unclaimed} unit="ORE" hint="in the miner" />
      <Tile label="Fee" value={`${(feeBps / 100).toFixed(1)}%`} hint="on deploy volume" />
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  hint,
  accent,
}: {
  label: ReactNode;
  value: string;
  unit?: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card px-4 py-3.5">
      <div className="label">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={`num text-xl ${accent ? "gradient-text" : "text-white"}`}>{value}</span>
        {unit && <span className="font-mono text-xs text-fog-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 font-mono text-[12px] text-fog-muted">{hint}</div>}
    </div>
  );
}
