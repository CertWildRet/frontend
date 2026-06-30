"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  buildDepositZincIxs,
  buildWithdrawZincIxs,
  buildSettleHarvestZincIxs,
  buildParkDepositZincIxs,
  buildCancelPendingZincIxs,
  sendIxs,
  solToLamports,
  sharesToRaw,
  MIN_DEPOSIT_SOL,
} from "@/lib/cwr";

/** Wallet-signed dZINC deposit (mint dZINC) + withdraw (burn dZINC -> SOL +
 *  in-kind smelted ZINC) actions. Mirrors useCwrActions for the dORE pool. */
export function useZincActions() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [busy, setBusy] = useState(false);

  const deposit = useCallback(
    async (sol: number): Promise<string> => {
      if (!(sol > 0)) throw new Error("Enter an amount greater than 0.");
      if (sol < MIN_DEPOSIT_SOL) throw new Error(`Minimum deposit is ${MIN_DEPOSIT_SOL} SOL.`);
      if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
      setBusy(true);
      try {
        const ixs = await buildDepositZincIxs(connection, publicKey, solToLamports(sol));
        return await sendIxs(connection, sendTransaction, ixs, publicKey);
      } finally {
        setBusy(false);
      }
    },
    [connection, publicKey, sendTransaction],
  );

  const withdraw = useCallback(
    async (shares: number): Promise<string> => {
      if (!(shares > 0)) throw new Error("Nothing to claim.");
      if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
      setBusy(true);
      try {
        const ixs = await buildWithdrawZincIxs(connection, publicKey, sharesToRaw(shares));
        return await sendIxs(connection, sendTransaction, ixs, publicKey);
      } finally {
        setBusy(false);
      }
    },
    [connection, publicKey, sendTransaction],
  );

  // Park SOL during the cranking window (when depositZinc is closed). Escrows
  // into the dZINC pending buffer; no shares minted. Converted later by the keeper
  // (finalize_pending_zinc) or reversible via cancelPark.
  const park = useCallback(
    async (sol: number): Promise<string> => {
      if (!(sol > 0)) throw new Error("Enter an amount greater than 0.");
      if (sol < MIN_DEPOSIT_SOL) throw new Error(`Minimum park is ${MIN_DEPOSIT_SOL} SOL.`);
      if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
      setBusy(true);
      try {
        const ixs = await buildParkDepositZincIxs(connection, publicKey, solToLamports(sol));
        return await sendIxs(connection, sendTransaction, ixs, publicKey);
      } finally {
        setBusy(false);
      }
    },
    [connection, publicKey, sendTransaction],
  );

  // Pull a parked dZINC ticket back out (full refund, any phase).
  const cancelPark = useCallback(async (): Promise<string> => {
    if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
    setBusy(true);
    try {
      const ixs = await buildCancelPendingZincIxs(connection, publicKey);
      return await sendIxs(connection, sendTransaction, ixs, publicKey);
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, sendTransaction]);

  // settle_harvest_zinc - the first action of a fresh OPEN window (window_settled
  // starts false; deposit/withdraw revert until this runs). Permissionless: any
  // connected wallet can open the window for everyone.
  const settle = useCallback(async (): Promise<string> => {
    if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
    setBusy(true);
    try {
      const ixs = await buildSettleHarvestZincIxs(connection, publicKey);
      return await sendIxs(connection, sendTransaction, ixs, publicKey);
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, sendTransaction]);

  return { deposit, withdraw, settle, park, cancelPark, busy, connected: !!publicKey };
}
