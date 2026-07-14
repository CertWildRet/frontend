"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  buildQueueWithdrawIxs,
  buildQueueWithdrawZincIxs,
  buildCancelQueuedWithdrawIxs,
  readQueuedTicketOre,
  readQueuedTicketZinc,
  sendIxs,
  sharesToRaw,
} from "@/lib/cwr";
import { MOCK, MOCK_TX_SIG } from "@/lib/mock";

export type QueuedExitTicket = {
  /** Queued shares in UI units. */
  shares: number;
  queuedAt: number;
};

const mockSend = async (): Promise<string> => {
  await new Promise((r) => setTimeout(r, 600));
  return MOCK_TX_SIG;
};

/**
 * Queued-exit state + actions for one pool (v1.5.0 "Claim Queued").
 *
 * queue() escrows shares in ANY phase; the keeper executes the exit in the
 * next settled OPEN window at that window's frozen NPS (identical economics
 * to a live claim there). cancel() returns the shares any time, even paused.
 */
export function useQueuedExit(zinc: boolean, pollMs = 12_000) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [ticket, setTicket] = useState<QueuedExitTicket | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (MOCK || !publicKey) {
      setTicket(null);
      return;
    }
    try {
      const t = zinc
        ? await readQueuedTicketZinc(connection, publicKey)
        : await readQueuedTicketOre(connection, publicKey);
      setTicket(
        t ? { shares: Number(t.shares.toString()) / 1e9, queuedAt: t.queuedAt } : null,
      );
    } catch {
      /* transient read errors: keep last value */
    }
  }, [connection, publicKey, zinc]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  const queue = useCallback(
    async (shares: number): Promise<string> => {
      if (!(shares > 0)) throw new Error("Enter an amount of shares to queue.");
      if (MOCK) return mockSend();
      if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
      setBusy(true);
      try {
        const raw = sharesToRaw(shares);
        const ixs = zinc
          ? await buildQueueWithdrawZincIxs(connection, publicKey, raw)
          : await buildQueueWithdrawIxs(connection, publicKey, raw);
        const sig = await sendIxs(connection, sendTransaction, ixs, publicKey);
        await refresh();
        return sig;
      } finally {
        setBusy(false);
      }
    },
    [connection, publicKey, sendTransaction, zinc, refresh],
  );

  const cancel = useCallback(async (): Promise<string> => {
    if (MOCK) return mockSend();
    if (!publicKey || !sendTransaction) throw new Error("Connect a wallet first.");
    setBusy(true);
    try {
      const ixs = await buildCancelQueuedWithdrawIxs(connection, publicKey, zinc);
      const sig = await sendIxs(connection, sendTransaction, ixs, publicKey);
      await refresh();
      return sig;
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, sendTransaction, zinc, refresh]);

  return { ticket, queue, cancel, refresh, busy };
}
