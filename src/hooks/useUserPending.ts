"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { readPendingTicket, SIMPLE, lamportsToSol } from "@/lib/cwr";
import { MOCK } from "@/lib/mock";

export type PendingTicket = {
  amountSol: number;
  parkedAt: number;
};

/** Poll the connected wallet's open parked-deposit ticket (null if none). */
export function useUserPending(pollMs = 12_000) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [ticket, setTicket] = useState<PendingTicket | null>(null);

  const refresh = useCallback(async () => {
    if (MOCK || !publicKey) {
      setTicket(null);
      return;
    }
    try {
      const t = await readPendingTicket(connection, publicKey);
      setTicket(t ? { amountSol: lamportsToSol(t.amountLamports), parkedAt: t.parkedAt } : null);
    } catch {
      /* transient read errors: keep last value */
    }
  }, [connection, publicKey]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { ticket, refresh, connected: !!publicKey };
}
