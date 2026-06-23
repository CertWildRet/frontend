"use client";

import { useEffect, useState } from "react";
import { MOCK } from "@/lib/mock";

/** Shape returned by the brain's GET /api/stats (cwr-brains/simple/src/http.ts). */
export type PoolStatsData = {
  initialized: boolean;
  ts: number;
  phase: number;
  phaseLabel: string;
  windowSettled: boolean;
  prices: { solUsd: number | null; oreUsd: number | null };
  /** The transparency headline — TRUE recoverable value incl. unclaimed miner rewards. */
  value: {
    tvlSol: number;
    navPerShareTrue: number;
    recoverableSol: number;
    recoverableOre: number;
    oreAsSol: number;
    totalShares: number;
  };
  vault: {
    solInVault: number;
    storeInVaultOre: number;
    totalShares: number;
    totalNavOnchain: number;
    navPerShareOnchain: number;
  };
  miner: {
    rewardsSol: number;
    rewardsOre: number;
    inFlightSol: number;
    lifetimeDeployed: number;
    lifetimeRewardsSol: number;
    lifetimeRewardsOre: number;
  };
  keeper: {
    mode: string;
    minSolPerRound: number;
    lastDeployedRoundId: string | null;
  };
};

const BRAIN = (process.env.NEXT_PUBLIC_BRAIN_URL || "").replace(/\/$/, "");

/**
 * Polls the brain's /api/stats for the TRUE economic state — including the ORE
 * miner's unclaimed rewards, which the on-chain NAV omits during a BETTING
 * window (so the contract-derived TVL/NAV read 0 even while SOL+ORE is
 * recoverable). Read-only, cached server-side (8s), so a slow poll is fine.
 */
export function useStats(pollMs = 20_000): PoolStatsData | null {
  const [stats, setStats] = useState<PoolStatsData | null>(null);

  useEffect(() => {
    if (MOCK || !BRAIN || typeof window === "undefined") return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`${BRAIN}/api/stats`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!stop && d?.initialized) setStats(d as PoolStatsData);
      } catch {
        /* keep last good value; transient brain/network blip */
      }
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [pollMs]);

  return stats;
}
