"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  buildDepositIxs,
  buildWithdrawIxs,
  buildSettleHarvestIxs,
  buildParkDepositIxs,
  buildCancelPendingIxs,
  sendIxs,
  solToLamports,
  sharesToRaw,
  MIN_DEPOSIT_SOL,
} from "@/lib/cwr";
import { MOCK, MOCK_TX_SIG } from "@/lib/mock";

const mockSend = async (): Promise<string> => {
  await new Promise((r) => setTimeout(r, 600)); // fake "Confirming…"
  return MOCK_TX_SIG;
};

/** Wallet-signed deposit (mint CWR) + withdraw (claim) actions. */
export function useCwrActions() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [busy, setBusy] = useState(false);

  const deposit = useCallback(
    async (sol: number): Promise<string> => {
      if (!(sol > 0)) throw new Error("Enter an amount greater than 0.");
      if (sol < MIN_DEPOSIT_SOL) throw new Error(`Minimum deposit is ${MIN_DEPOSIT_SOL} SOL.`);
      if (MOCK) {
        setBusy(true);
        try {
          return await mockSend();
        } finally {
          setBusy(false);
        }
      }
      if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
      setBusy(true);
      try {
        const ixs = await buildDepositIxs(connection, publicKey, solToLamports(sol));
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
      if (MOCK) {
        setBusy(true);
        try {
          return await mockSend();
        } finally {
          setBusy(false);
        }
      }
      if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
      setBusy(true);
      try {
        const ixs = await buildWithdrawIxs(connection, publicKey, sharesToRaw(shares));
        return await sendIxs(connection, sendTransaction, ixs, publicKey);
      } finally {
        setBusy(false);
      }
    },
    [connection, publicKey, sendTransaction],
  );

  // settle_harvest - the first action of a fresh OPEN window (window_settled
  // starts false; deposit/withdraw revert WindowNotSettled until this runs).
  // Permissionless: any connected wallet can open the window for everyone.
  const settle = useCallback(async (): Promise<string> => {
    if (MOCK) {
      setBusy(true);
      try {
        return await mockSend();
      } finally {
        setBusy(false);
      }
    }
    if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
    setBusy(true);
    try {
      const ixs = await buildSettleHarvestIxs(connection, publicKey);
      return await sendIxs(connection, sendTransaction, ixs, publicKey);
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, sendTransaction]);

  // park_deposit - commit SOL during the BETTING window (deposit closed). No
  // shares yet; the keeper converts it to CWR automatically at the next settled
  // OPEN window. Reversible via cancelPark.
  const park = useCallback(
    async (sol: number): Promise<string> => {
      if (!(sol > 0)) throw new Error("Enter an amount greater than 0.");
      if (sol < MIN_DEPOSIT_SOL) throw new Error(`Minimum is ${MIN_DEPOSIT_SOL} SOL.`);
      if (MOCK) {
        setBusy(true);
        try { return await mockSend(); } finally { setBusy(false); }
      }
      if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
      setBusy(true);
      try {
        const ixs = await buildParkDepositIxs(connection, publicKey, solToLamports(sol));
        return await sendIxs(connection, sendTransaction, ixs, publicKey);
      } finally {
        setBusy(false);
      }
    },
    [connection, publicKey, sendTransaction],
  );

  // cancel_pending - pull a parked (not-yet-converted) deposit back out. Always
  // available (any phase, even paused): the no-stuck-capital escape.
  const cancelPark = useCallback(async (): Promise<string> => {
    if (MOCK) {
      setBusy(true);
      try { return await mockSend(); } finally { setBusy(false); }
    }
    if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
    setBusy(true);
    try {
      const ixs = await buildCancelPendingIxs(connection, publicKey);
      return await sendIxs(connection, sendTransaction, ixs, publicKey);
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, sendTransaction]);

  return { deposit, withdraw, settle, park, cancelPark, busy, connected: MOCK || !!publicKey };
}
