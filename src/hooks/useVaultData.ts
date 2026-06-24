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

// ORE mining program (declare_id! in ore/api/src/lib.rs).
const ORE_PROGRAM = new PublicKey("oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv");

// The ORE protocol's claim fee, modelled EXACTLY from chain (not estimated). At
// claim, claim_ore (ore/api/src/state/miner.rs) charges 10% of the rewards_ore
// leg ONLY (never refined_ore), and ONLY while other miners still hold unclaimed
// rewards (`treasury.total_unclaimed > 0` after subtracting ours). The fee is
// redistributed to those miners. We read the live treasury and replicate it so
// recoverable value never overstates what the pool nets at harvest. Returns ORE.
async function readOreClaimFee(
  connection: import("@solana/web3.js").Connection,
  rewardsOreRaw: bigint,
): Promise<number> {
  if (rewardsOreRaw <= 0n) return 0;
  const feeIfApplied = Number(rewardsOreRaw / 10n) / ORE_GRAMS_PER_ORE;
  try {
    const treasury = PublicKey.findProgramAddressSync([Buffer.from("treasury")], ORE_PROGRAM)[0];
    const acc = await connection.getAccountInfo(treasury);
    if (acc && acc.data.length >= 96) {
      // total_unclaimed @ disc(8) + 80 = 88, u64 LE (ore/api/src/state/treasury.rs).
      let totalUnclaimed = 0n;
      for (let i = 0; i < 8; i++) totalUnclaimed |= BigInt(acc.data[88 + i]) << BigInt(8 * i);
      // claim_ore subtracts ours first, then fees only if others remain unclaimed.
      if (totalUnclaimed <= rewardsOreRaw) return 0;
    }
  } catch {
    /* treasury unreadable -> assume the fee applies (never overstate) */
  }
  return feeIfApplied;
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
      // Decoded from the documented 544-byte ORE Miner layout (constants.rs offsets:
      //   deployed[25]@40, checkpoint_id@448, rewards_sol@488, rewards_ore@496,
      //   refined_ore@504, round_id@512). u64 LE; ORE/stORE 11-decimal, SOL 9-decimal.
      const solInVaultSol = lamportsToSol(b.solInVault);
      const storeInVaultOre = Number(b.storeInVault.toString()) / ORE_GRAMS_PER_ORE;
      let unclaimedOre = 0;
      let rewardsOreRaw = 0n;
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
          // Both unclaimed ORE legs: directly-mined (rewards_ore@496) AND the
          // refining yield the Simple strategy deliberately accumulates by never
          // claiming mid-betting (refined_ore@504). Both settle to stORE next harvest.
          // (Only the rewards_ore leg is later docked the 10% claim fee, below.)
          rewardsOreRaw = u64(496);
          unclaimedOre = (Number(rewardsOreRaw) + Number(u64(504))) / ORE_GRAMS_PER_ORE;
          inFlightSol = u64(448) !== u64(512) ? Number(deployed) / LAMPORTS_PER_SOL : 0;
        }
      } catch {
        // miner not created yet (pre-first-crank) -> SOL/ORE rewards stay 0.
      }
      const storeToOreRate = await readStoreToOreRate(connection);
      // 10% claim fee the pool pays on the rewards_ore leg at harvest (exact, from
      // the live treasury). Subtracted from recoverable so value never overstates.
      const claimFeeOre = await readOreClaimFee(connection, rewardsOreRaw);
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
