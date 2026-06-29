"use client";

import type { ReactNode } from "react";
import type { ZincPoolStats } from "@/lib/cwr";
import { formatNum, formatSol } from "@/lib/format";

/**
 * dZINC pool stat surface. The value model is intentionally simpler than dORE:
 * NO miner, NO stORE oracle. The SOL leg (sol_in_vault) and the in-kind smelted
 * ZINC held (zinc_in_vault) are both EXACT on-chain; ZINC is shown as a raw
 * amount (no ZINC price feed -> not folded into the SOL price or TVL).
 */
export function ZincStats({ data }: { data: ZincPoolStats | null }) {
  const feeBps = data?.pullFeeEnabled ? (data?.pullFeeBps ?? 0) : 0;
  const tvl = data ? formatSol(data.solInVaultSol, 2) : "···";
  const price = data ? formatNum(data.navPerShareSol, 4) : "···";
  const supply = data ? formatNum(data.totalShares, 2) : "···";
  const smelted = data ? formatNum(data.smeltedZincHeld, 4) : "···";
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <Tile label="TVL" value={tvl} unit="SOL" accent hint="SOL custody (ZINC not priced)" />
      <Tile label="dZINC price" value={price} unit="SOL" hint="SOL per share" />
      <Tile label="dZINC supply" value={supply} hint="pool share token" />
      <Tile label="Smelted ZINC" value={smelted} unit="ZINC" hint="claimed (-10%), pool-held" />
      <Tile label="In-kind ZINC" value={smelted} unit="ZINC" hint="paid pro-rata on withdraw" />
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
