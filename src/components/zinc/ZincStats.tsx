"use client";

import type { ZincPoolStats } from "@/lib/cwr";
import { useStats } from "@/hooks/useStats";
import { formatNum, formatSol } from "@/lib/format";
import { StatTile } from "@/components/primitives/Stat";

/**
 * dZINC pool stat strip. Structurally mirrors <PoolStats> (dORE) one-to-one:
 * the SAME 6 tiles + SAME responsive grid, so the two pages read identically -
 * TVL, price, supply, staked token, unclaimed/unsmelted token, fee. Uses the
 * TRUE recoverable position (idle + claimable SOL, smelted + unsmelted ZINC valued
 * live at the Meteora price), not the mid-round custody, so the numbers never read
 * ~0 while capital is deployed in rounds.
 */
export function ZincStats({ data }: { data: ZincPoolStats | null }) {
  const feeBps = data?.pullFeeEnabled ? (data?.pullFeeBps ?? 0) : 0;
  const zincPrice = data?.zincPriceSol ?? 0;
  const solUsd = useStats()?.prices.solUsd ?? null; // ORE-side global price feed (SOL/USD)
  const solIn = data?.solInVaultSol ?? 0;
  const wonClaimable = data?.wonClaimableSol ?? 0;
  const smelted = data?.smeltedZincHeld ?? 0; // smelted + staked (stZINC)
  const unsmelted = data?.wonClaimableZinc ?? 0; // won, not yet smelted (uZINC)
  const supplyN = data?.totalShares ?? 0;

  // True recoverable: idle + won-claimable SOL, plus all ZINC (smelted + unsmelted)
  // valued live. So TVL/value never read ~0 just because capital is mid-round.
  const recoverableSol = solIn + wonClaimable;
  const totalZinc = smelted + unsmelted;
  const recoverableValue = recoverableSol + totalZinc * zincPrice;
  const valuePerShare = supplyN > 0 ? recoverableValue / supplyN : 0;

  const s2 = (n: number) => (data ? formatSol(n, 2) : "···");
  const z = (n: number) => (data ? formatNum(n, 4) : "···");
  const n4 = (n: number) => (data ? formatNum(n, 4) : "···");
  // $ value of the whole dZINC supply (mirrors dORE's supply sub-line).
  const supplyHint =
    zincPrice > 0 && solUsd && valuePerShare > 0
      ? `≈ $${formatNum(supplyN * valuePerShare * solUsd, 2)}`
      : undefined;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <StatTile
        label="TVL"
        value={zincPrice > 0 ? `≈ ${s2(recoverableValue)}` : s2(recoverableSol)}
        unit="SOL"
        tone="gold"
        hint={zincPrice > 0 ? "true recoverable value" : "idle + claimable SOL"}
      />
      <StatTile
        label="dZINC price"
        value={zincPrice > 0 ? `≈ ${n4(valuePerShare)}` : "···"}
        unit="SOL"
        hint="value per share"
      />
      <StatTile label="dZINC supply" value={data ? formatNum(supplyN, 2) : "···"} hint={supplyHint} />
      <StatTile
        label={
          <>
            <span className="normal-case">stZINC</span> held
          </>
        }
        value={z(smelted)}
        unit="stZINC"
        hint="smelted + staked"
      />
      <StatTile label="Unsmelted ZINC" value={z(unsmelted)} unit="ZINC" hint="won, not yet smelted" />
      <StatTile label="Fee" value={`${(feeBps / 100).toFixed(1)}%`} hint="on deploy volume" />
    </div>
  );
}
