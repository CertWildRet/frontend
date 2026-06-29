"use client";

import type { ZincPoolStats } from "@/lib/cwr";
import { formatNum, formatSol } from "@/lib/format";
import { StatTile } from "@/components/primitives/Stat";

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
  // 5 distinct legs (ZINC has no stORE/unclaimed-ORE split that ORE shows, and
  // its smelted ZINC is held AND paid in kind, so it is one tile, not two).
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="TVL" value={tvl} unit="SOL" tone="gold" hint="SOL custody (ZINC not priced)" />
      <StatTile label="dZINC price" value={price} unit="SOL" hint="SOL per share" />
      <StatTile label="dZINC supply" value={supply} hint="pool share token" />
      <StatTile label="Smelted ZINC" value={smelted} unit="ZINC" hint="claimed (-10%), held + paid in kind" />
      <StatTile label="Fee" value={`${(feeBps / 100).toFixed(1)}%`} hint="on deploy volume" />
    </div>
  );
}
