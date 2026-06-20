"use client";

import type { VaultData } from "@/hooks/useVaultData";
import { formatNum, formatSol } from "@/lib/format";

export function PoolStats({ data }: { data: VaultData | null }) {
  const feeBps = data?.pullFeeEnabled ? (data?.pullFeeBps ?? 0) : 0;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Tile label="TVL" value={data?.initialized ? `${formatSol(data.totalNavSol, 2)} SOL` : "—"} />
      <Tile
        label="CWR price"
        value={data?.initialized ? `${formatNum(data.navPerShare, 4)} SOL` : "—"}
        hint="NAV per share"
      />
      <Tile label="CWR supply" value={data?.initialized ? formatNum(data.totalShares, 2) : "—"} />
      <Tile label="Fee" value={`${(feeBps / 100).toFixed(2)}%`} hint="per deploy, on volume" />
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="mt-1 font-mono text-lg text-white">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted">{hint}</div>}
    </div>
  );
}
