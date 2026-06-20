"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { makeVault, SIMPLE, lamportsToSol, sharesToNumber, navX18ToNumber } from "@/lib/cwr";

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
  storeInVaultOre: number;
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
    try {
      const vault = makeVault(connection);
      const b = await vault.read.bucket(SIMPLE);
      if (!b) {
        setData({ initialized: false } as VaultData);
        setError(null);
        return;
      }
      const nav = await vault.read.navSnapshot(SIMPLE);
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
        solInVaultSol: lamportsToSol(b.solInVault),
        storeInVaultOre: Number(b.storeInVault.toString()) / ORE_GRAMS_PER_ORE,
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
