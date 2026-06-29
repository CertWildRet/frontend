"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getMint, getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { makeVault, SIMPLE, lamportsToSol, sharesToNumber, navX18ToNumber, LAMPORTS_PER_SOL } from "@/lib/cwr";
import { MOCK, mockVaultData } from "@/lib/mock";

const ORE_GRAMS_PER_ORE = 1e11;
// ore-lst / ore-stake (for the stORE -> ORE redemption rate). Stable on-chain ids.
const ORE_MINT = new PublicKey("oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp");
const STORE_MINT = new PublicKey("sTorERYB6xAZ1SSbwpK3zoK2EEwbBrc7TZAzg1uCGiH");
const ORE_LST_PROGRAM = new PublicKey("LStwN2E5Uw6MCtuxHRLhy8RY9hxqW2XRpLzettb696y");
const ORE_STAKE_PROGRAM = new PublicKey("STkEAu2cEyQp5ktgUauRVq8es6mEP2w6ixw4NEd5tDJ");

// stORE -> ORE redemption rate = staked ORE backing / stORE supply (>= 1; the
// premium is accrued refining yield). Global, slow-moving; read straight from
// chain. Falls back to 1.0 (par) if the read fails.
async function readStoreToOreRate(connection: import("@solana/web3.js").Connection): Promise<number> {
  try {
    const vault = PublicKey.findProgramAddressSync([Buffer.from("vault")], ORE_LST_PROGRAM)[0];
    const stake = PublicKey.findProgramAddressSync([Buffer.from("stake"), vault.toBuffer()], ORE_STAKE_PROGRAM)[0];
    const stakeOreAta = getAssociatedTokenAddressSync(ORE_MINT, stake, true);
    const [supply, stakeAcc] = await Promise.all([
      getMint(connection, STORE_MINT),
      getAccount(connection, stakeOreAta),
    ]);
    if (supply.supply > 0n) return Number(stakeAcc.amount) / Number(supply.supply);
  } catch {
    /* fall back to par */
  }
  return 1;
}

// The ORE protocol's claim fee: at claim, ORE charges 10% of the rewards_ore leg
// ONLY (never refined_ore) while other miners are still unclaimed (in practice
// always). ORE's V4 treasury restructure removed the field we used to gate this
// exactly, so apply it conservatively so recoverable value never overstates what
// the pool nets at harvest. Returns ORE.
function oreClaimFee(rewardsOreRaw: bigint): number {
  return rewardsOreRaw > 0n ? Number(rewardsOreRaw / 10n) / ORE_GRAMS_PER_ORE : 0;
}

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
  /** stORE held by the vault, in stORE token units (= bucket.store_in_vault). */
  storeInVaultOre: number;
  /** stORE -> ORE redemption rate (staked ORE backing / stORE supply, on-chain).
   *  >= 1; the premium is accrued refining yield. Used to value stORE in ORE. */
  storeToOreRate: number;
  /** Unclaimed ORE = miner.rewards_ore + miner.refined_ore (gross balance sitting
   *  in the miner; both settle to stORE at the next harvest). Exact. */
  unclaimedOre: number;
  /** 10% ORE-protocol claim fee the pool pays on the rewards_ore leg at harvest
   *  (0 if no other miners are unclaimed). Modelled exactly from the live treasury;
   *  net recoverable unclaimed = unclaimedOre - claimFeeOre. */
  claimFeeOre: number;
  /** Won SOL not yet swept into the treasury = miner.rewards_sol (exact). */
  rewardsSol: number;
  /** SOL deployed this round, not yet checkpointed (exact). */
  inFlightSol: number;
  /** Exact recoverable SOL = sol_in_vault + rewards_sol + in-flight. */
  recoverableSol: number;
  /** Exact recoverable ORE (ORE-equiv) = unclaimed ORE + stORE held x redemption rate. */
  recoverableOre: number;
  /** Frozen NAV-per-share the contract pays withdrawals at during the OPEN window
   *  (bucket.claims_window_nps, x18-scaled); 0 outside an open window. Exact. */
  claimsWindowNps: number;
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
      //   ORE = (miner.rewards_ore + miner.refined_ore) UNCLAIMED + bucket.store_in_vault
      //         (stORE held, valued at its redemption rate). Both miner legs settle
      //         to stORE at the next harvest; the contract watermark sums both
      //         (lib.rs: last_seen_rewards_ore = rewards_ore + refined_ore).
      // Decoded from the MinerV1 544-byte layout (constants.rs offsets:
      //   deployed[25]@40, checkpoint_id@448, rewards_sol@488, rewards_ore@496,
      //   refined_ore@504, round_id@512). u64 LE; ORE/stORE 11-decimal, SOL 9-decimal.
      // ORE migrated the dORE miner V1 (544B) -> V4 (752B) on 2026-06-25 16:28 UTC.
      // V4 keeps the same field SEMANTICS but moves every offset (and swaps the
      // refined/rewards order). Decode whichever layout is on-chain; any other size
      // degrades to 0 (understate) rather than reading garbage money. The on-chain
      // contract freeze (V1-only read_miner) is a SEPARATE contract upgrade.
      const solInVaultSol = lamportsToSol(b.solInVault);
      const storeInVaultOre = Number(b.storeInVault.toString()) / ORE_GRAMS_PER_ORE;
      let unclaimedOre = 0;
      let rewardsOreRaw = 0n;
      let rewardsSol = 0;
      let inFlightSol = 0;
      try {
        const mi = await vault.read.oreMiner(SIMPLE);
        if (mi && (mi.data.length === 544 || mi.data.length === 752)) {
          const d = mi.data;
          const u64 = (o: number) => {
            let v = 0n;
            for (let i = 0; i < 8; i++) v |= BigInt(d[o + i]) << BigInt(8 * i);
            return v;
          };
          // Per-version offsets. V1: constants.rs. V4: verified vs the live migrated
          // miner + ORE master ff4e73e (deployed sum@64, checkpoint_id@48,
          // rewards_sol@688, refined_ore@696, rewards_ore@704, round_id@664).
          const OFF =
            d.length === 752
              ? { deployed: 64, checkpointId: 48, rewardsSol: 688, refinedOre: 696, rewardsOre: 704, roundId: 664 }
              : { deployed: 40, checkpointId: 448, rewardsSol: 488, refinedOre: 504, rewardsOre: 496, roundId: 512 };
          let deployed = 0n;
          for (let i = 0; i < 25; i++) deployed += u64(OFF.deployed + i * 8);
          rewardsSol = Number(u64(OFF.rewardsSol)) / LAMPORTS_PER_SOL;
          // Both unclaimed ORE legs: directly-mined (rewards_ore) AND the refining
          // yield the Simple strategy accumulates by never claiming mid-betting
          // (refined_ore). Both settle to stORE next harvest. (Only the rewards_ore
          // leg is later docked the 10% claim fee, below.)
          rewardsOreRaw = u64(OFF.rewardsOre);
          unclaimedOre = (Number(rewardsOreRaw) + Number(u64(OFF.refinedOre))) / ORE_GRAMS_PER_ORE;
          inFlightSol = u64(OFF.checkpointId) !== u64(OFF.roundId) ? Number(deployed) / LAMPORTS_PER_SOL : 0;
        }
      } catch {
        // miner not created yet (pre-first-crank) -> SOL/ORE rewards stay 0.
      }
      const storeToOreRate = await readStoreToOreRate(connection);
      // 10% claim fee the pool pays on the rewards_ore leg at harvest. Subtracted
      // from recoverable so value never overstates (conservative; see oreClaimFee).
      const claimFeeOre = oreClaimFee(rewardsOreRaw);
      const recoverableSol = solInVaultSol + rewardsSol + inFlightSol;
      // ORE-equivalent: net-of-claim-fee unclaimed + stORE at its redemption rate.
      const recoverableOre = unclaimedOre - claimFeeOre + storeInVaultOre * storeToOreRate;

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
        storeToOreRate,
        unclaimedOre,
        claimFeeOre,
        rewardsSol,
        inFlightSol,
        recoverableSol,
        recoverableOre,
        // Frozen withdraw price for the OPEN window (0 when closed). The contract
        // pays SOL at this, not the live navPerShare (lib.rs withdraw).
        claimsWindowNps: b.claimsWindowNps ? navX18ToNumber(b.claimsWindowNps) : 0,
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
