"use client";

import type { VaultData } from "@/hooks/useVaultData";
import { formatNum, formatSol } from "@/lib/format";

export function PoolStats({ data }: { data: VaultData | null }) {
  const feeBps = data?.pullFeeEnabled ? (data?.pullFeeBps ?? 0) : 0;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile label="TVL" value={data?.initialized ? `${formatSol(data.totalNavSol, 2)}` : "···"} unit="SOL" accent />
      <Tile
        label="CWR price"
        value={data?.initialized ? formatNum(data.navPerShare, 4) : "···"}
        unit="SOL"
        hint="value per share"
      />
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
      {hint && <div className="mt-0.5 font-mono text-[10px] text-fog-muted">{hint}</div>}
    </div>
  );
}
