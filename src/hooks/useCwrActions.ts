"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  buildDepositIxs,
  buildWithdrawIxs,
  sendIxs,
  solToLamports,
  sharesToRaw,
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

  return { deposit, withdraw, busy, connected: MOCK || !!publicKey };
}
