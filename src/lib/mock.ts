// ── Local UI-design mock layer ───────────────────────────────────────────────
// When NEXT_PUBLIC_MOCK === "1", the data hooks return this static placeholder
// data and skip EVERY network call (RPC, wallet, SSE). This lets you design the
// UI with all screens rendered fully "lit up" - no backend, no wallet, no keys.
// Flip NEXT_PUBLIC_MOCK to 0 (or delete it) in .env.local to use the real chain
// backend again; no other code changes are needed.

import type { VaultData } from "@/hooks/useVaultData";
import type { UserPos } from "@/hooks/useUserPosition";
import type { LiveStats } from "@/hooks/useLiveStats";
import type { PoolStatsData } from "@/hooks/useStats";

export const MOCK = process.env.NEXT_PUBLIC_MOCK === "1";

// A believable "Simple pool, deposit/claim window OPEN" snapshot.
// `phaseStartedTs` is filled in by the hook (client-side) so the countdown is
// live and there is no SSR/CSR hydration mismatch.
export const mockVaultData: VaultData = {
  initialized: true,
  paused: false,
  phase: 1, // 1 = OPEN (deposit/claim window)
  phaseStartedTs: 0,
  openSecs: 300,
  bettingSecs: 600,
  windowSettled: true,
  bettingRoundId: "48213",
  totalNavSol: 1284.5,
  totalShares: 1192.37,
  navPerShare: 1.0772,
  solInVaultSol: 842.1,
  storeInVaultOre: 36.4,
  storeToOreRate: 1.07,
  unclaimedOre: 8.2,
  claimFeeOre: 0.35,
  rewardsSol: 120.4,
  inFlightSol: 0,
  recoverableSol: 962.5,
  recoverableOre: 44.6,
  claimsWindowNps: 1.0772,
  pullFeeBps: 100,
  pullFeeEnabled: true,
  entryFeeBps: 0,
  exitFeeBps: 0,
};

// Brain /api/stats mock so MOCK mode renders the fully PRICED UI (USD columns,
// PnL, true TVL) - the state real users see once the brain feed is live.
export const mockStats: PoolStatsData = {
  initialized: true,
  ts: 0,
  phase: 1,
  phaseLabel: "OPEN",
  windowSettled: true,
  prices: { solUsd: 152.4, oreUsd: 61.8 },
  value: {
    tvlSol: 980.34,
    navPerShareTrue: 0.8222,
    recoverableSol: 962.5,
    recoverableOre: 44.6,
    oreAsSol: 18.08,
    totalShares: 1192.37,
  },
  vault: {
    solInVault: 842.1,
    storeInVaultOre: 36.4,
    totalShares: 1192.37,
    totalNavOnchain: 842.1,
    navPerShareOnchain: 0.7062,
  },
  miner: {
    rewardsSol: 120.4,
    rewardsOre: 8.2,
    inFlightSol: 0,
    lifetimeDeployed: 5120.7,
    lifetimeRewardsSol: 3380.5,
    lifetimeRewardsOre: 9240.8,
  },
  keeper: { mode: "active", minSolPerRound: 0.05, lastDeployedRoundId: "48213" },
};

// A funded demo position so the Position / Claim cards show real numbers.
export const mockUserPos: UserPos = {
  shares: 84.21,
  poolSharePct: 7.06,
};

// 25 varied tile deploys for a nice heatmap, plus a recent keeper move.
export const mockLiveStats: LiveStats = {
  roundId: "48213",
  perTileSol: [
    0.42, 0.08, 0.91, 0.15, 0.33, 0.77, 0.05, 0.61, 0.22, 0.49, 0.13, 0.88, 0.04,
    0.55, 0.71, 0.29, 0.67, 0.18, 0.95, 0.07, 0.51, 0.36, 0.82, 0.11, 0.44,
  ],
  totalDeployedSol: 11.8,
  totalMiners: 1347,
  motherlodePoolOre: 218.6,
  bucketPhase: "OPEN",
  bucketPhaseStartedTs: null,
  lastCrank: {
    ts: 0, // filled in by the hook (client-side) for a live "Xs ago"
    action: "crank_mine",
    reason: "edge positive",
    perTileSol: 0.0472,
    perRoundSol: 1.18,
    evUsd: 3.27,
    roundId: "48213",
    sig: null,
  },
  updatedAt: 0, // filled in by the hook (client-side) so it stays a live "Xs ago"
};

// A fake, never-broadcast signature used by mocked deposit/withdraw actions.
export const MOCK_TX_SIG = "MockS1gnatureUIDesignNeverBroadcast11111111111";
