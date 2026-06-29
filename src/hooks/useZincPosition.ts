"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { readZincUserShares } from "@/lib/cwr";

export type ZincPos = {
  shares: number;
  poolSharePct: number;
};

/** The connected wallet's dZINC share balance + pool fraction. Mirrors
 *  useUserPosition for the dORE pool. */
export function useZincPosition(totalShares: number, pollMs = 12_000) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [pos, setPos] = useState<ZincPos | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setPos(null);
      return;
    }
    setLoading(true);
    try {
      const shares = await readZincUserShares(connection, publicKey);
      setPos({
        shares,
        poolSharePct: totalShares > 0 ? (shares / totalShares) * 100 : 0,
      });
    } catch {
      /* ignore transient read errors */
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, totalShares]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { pos, loading, refresh, connected: !!publicKey };
}
