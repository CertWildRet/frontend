"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { makeVault, SIMPLE, lamportsToSol, sharesToNumber, navX18ToNumber, LAMPORTS_PER_SOL } from "@/lib/cwr";
import { MOCK, mockVaultData } from "@/lib/mock";

const ORE_GRAMS_PER_ORE = 1e11;

export type VaultData = {
  initialized: boolean;
  paused: boolean;
  /** 0 = BETTING (mining), 1 = OPEN (deposit/claim). */
  phase: number;
  phaseStartedTs: number;
  openSecs: number;
  bettingSecs: number;
  windowSettled: boolean;
  bettingRoundId: string;
  totalNavSol: number;
  totalShares: number;
  navPerShare: number;
  solInVaultSol: number;
  /** stORE held by the vault = claimed-and-wrapped ORE (exact, on-chain). */
  storeInVaultOre: number;
  /** Unclaimed ORE = miner.rewards_ore, becomes stORE at next settle (exact). */
  unclaimedOre: number;
  /** Won SOL not yet swept into the treasury = miner.rewards_sol (exact). */
  rewardsSol: number;
  /** SOL deployed this round, not yet checkpointed (exact). */
  inFlightSol: number;
  /** Exact recoverable SOL = sol_in_vault + rewards_sol + in-flight. */
  recoverableSol: number;
  /** Exact recoverable ORE (ORE-equiv) = unclaimed ORE + stORE held. */
  recoverableOre: number;
  pullFeeBps: number;
  pullFeeEnabled: boolean;
  entryFeeBps: number;
  exitFeeBps: number;
};

export function useVaultData(pollMs = 12_000) {
  const { connection } = useConnection();
  const [data, setData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (MOCK) {
      // Static placeholder; fresh phaseStartedTs (client-side) keeps the
      // countdown live without an SSR/CSR hydration mismatch.
      setData({ ...mockVaultData, phaseStartedTs: Math.floor(Date.now() / 1000) - 90 });
      setError(null);
      setLoading(false);
      return;
    }
    try {
      const vault = makeVault(connection);
      const b = await vault.read.bucket(SIMPLE);
      if (!b) {
        setData({ initialized: false } as VaultData);
        setError(null);
        return;
      }
      const nav = await vault.read.navSnapshot(SIMPLE);

      // Exact recoverable, read straight from chain (no price, no brain):
      //   SOL = sol_in_vault + miner.rewards_sol + in-flight deployed (if the
      //         current round is unsettled, i.e. checkpoint_id != round_id).
      //   ORE = miner.rewards_ore (UNCLAIMED) + bucket.store_in_vault (stORE held,
      //         i.e. CLAIMED-and-wrapped ORE).
      // Decoded from the documented 544-byte ORE Miner layout (ore_cpi.rs offsets:
      //   deployed[25]@40, checkpoint_id@448, rewards_sol@488, rewards_ore@496,
      //   round_id@512). u64 LE; ORE/stORE are 11-decimal, SOL 9-decimal.
      const solInVaultSol = lamportsToSol(b.solInVault);
      const storeInVaultOre = Number(b.storeInVault.toString()) / ORE_GRAMS_PER_ORE;
      let unclaimedOre = 0;
      let rewardsSol = 0;
      let inFlightSol = 0;
      try {
        const mi = await vault.read.oreMiner(SIMPLE);
        if (mi && mi.data.length >= 544) {
          const d = mi.data;
          const u64 = (o: number) => {
            let v = 0n;
            for (let i = 0; i < 8; i++) v |= BigInt(d[o + i]) << BigInt(8 * i);
            return v;
          };
          let deployed = 0n;
          for (let i = 0; i < 25; i++) deployed += u64(40 + i * 8);
          rewardsSol = Number(u64(488)) / LAMPORTS_PER_SOL;
          unclaimedOre = Number(u64(496)) / ORE_GRAMS_PER_ORE;
          inFlightSol = u64(448) !== u64(512) ? Number(deployed) / LAMPORTS_PER_SOL : 0;
        }
      } catch {
        // miner not created yet (pre-first-crank) -> SOL/ORE rewards stay 0.
      }
      const recoverableSol = solInVaultSol + rewardsSol + inFlightSol;
      const recoverableOre = unclaimedOre + storeInVaultOre;

      setData({
        initialized: true,
        paused: b.paused,
        phase: Number(b.phase),
        phaseStartedTs: Number(b.phaseStartedTs.toString()),
        openSecs: Number(b.openSecs.toString()),
        bettingSecs: Number(b.bettingSecs.toString()),
        windowSettled: b.windowSettled,
        bettingRoundId: b.bettingRoundId.toString(),
        totalNavSol: nav ? lamportsToSol(nav.totalNav) : 0,
        totalShares: nav ? sharesToNumber(nav.totalShares) : 0,
        navPerShare: nav ? navX18ToNumber(nav.navPerShareX18) : 1,
        solInVaultSol,
        storeInVaultOre,
        unclaimedOre,
        rewardsSol,
        inFlightSol,
        recoverableSol,
        recoverableOre,
        pullFeeBps: b.params.pullFeeBps,
        pullFeeEnabled: b.params.pullFeeEnabled,
        entryFeeBps: b.params.entryFeeBps,
        exitFeeBps: b.params.exitFeeBps,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { data, loading, error, refresh };
}
