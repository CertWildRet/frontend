"use client";

import type { VaultData } from "@/hooks/useVaultData";
import type { PoolStatsData } from "@/hooks/useStats";
import { formatNum, formatSol } from "@/lib/format";

export function PoolStats({ data, stats }: { data: VaultData | null; stats?: PoolStatsData | null }) {
  const feeBps = data?.pullFeeEnabled ? (data?.pullFeeBps ?? 0) : 0;
  // Prefer the brain's TRUE value (incl. unclaimed miner rewards) - the on-chain
  // NAV reads ~0 mid-round. Fall back to on-chain when the brain isn't reachable.
  const tvl = stats ? formatSol(stats.value.tvlSol, 2) : data?.initialized ? formatSol(data.totalNavSol, 2) : "···";
  const price = stats
    ? formatNum(stats.value.navPerShareTrue, 4)
    : data?.initialized
      ? formatNum(data.navPerShare, 4)
      : "···";
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile label="TVL" value={tvl} unit="SOL" accent hint={stats ? "true recoverable value" : undefined} />
      <Tile label="CWR price" value={price} unit="SOL" hint="value per share" />
      <Tile label="CWR supply" value={data?.initialized ? formatNum(data.totalShares, 2) : "···"} />
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
  label: string;
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
