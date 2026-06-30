"use client";

import type { ZincPoolStats } from "@/lib/cwr";
import { formatNum, formatSol } from "@/lib/format";
import { StatTile } from "@/components/primitives/Stat";

/**
 * dZINC pool stat strip. Mirrors the recoverable-position model of the Pool
 * economics card so the top-level numbers do not read low mid-round: the SOL is
 * deployed in rounds during BETTING, and the won SOL + ZINC sit claimable (won
 * but not yet smelted) until each settle. So TVL / value-per-share / ZINC use the
 * TRUE recoverable position (idle + claimable SOL, smelted + unsmelted ZINC valued
 * at the live Meteora price), not just the settled custody.
 */
export function ZincStats({ data }: { data: ZincPoolStats | null }) {
  const feeBps = data?.pullFeeEnabled ? (data?.pullFeeBps ?? 0) : 0;
  const zincPrice = data?.zincPriceSol ?? 0;
  const solIn = data?.solInVaultSol ?? 0;
  const wonClaimable = data?.wonClaimableSol ?? 0;
  const smelted = data?.smeltedZincHeld ?? 0; // claimed + smelted, in custody
  const unsmelted = data?.wonClaimableZinc ?? 0; // won, not yet smelted (claimable)
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

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile
        label="TVL"
        value={zincPrice > 0 ? `≈ ${s2(recoverableValue)}` : s2(recoverableSol)}
        unit="SOL"
        tone="gold"
        hint={zincPrice > 0 ? "SOL + ZINC, incl. claimable" : "idle + claimable SOL"}
      />
      <StatTile
        label="dZINC value"
        value={zincPrice > 0 ? `≈ ${n4(valuePerShare)}` : "···"}
        unit="SOL"
        hint="SOL + ZINC per share"
      />
      <StatTile label="dZINC supply" value={data ? formatNum(supplyN, 2) : "···"} hint="pool share token" />
      <StatTile
        label="ZINC won"
        value={z(totalZinc)}
        unit="ZINC"
        hint={`${z(smelted)} smelted + ${z(unsmelted)} unsmelted (claimable)`}
      />
      <StatTile label="Fee" value={`${(feeBps / 100).toFixed(1)}%`} hint="on deploy volume" />
    </div>
  );
}
