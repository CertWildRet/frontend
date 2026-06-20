"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { makeVault, SIMPLE, sharesToNumber, lamportsToSol } from "@/lib/cwr";

export type UserPos = {
  shares: number;
  /** est. SOL redeemable now (gross of exit fee, which is 0 at launch). */
  valueSol: number;
  poolSharePct: number;
};

export function useUserPosition(totalShares: number, pollMs = 12_000) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [pos, setPos] = useState<UserPos | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setPos(null);
      return;
    }
    setLoading(true);
    try {
      const vault = makeVault(connection);
      const sharesBn = await vault.read.userShares(SIMPLE, publicKey);
      const shares = sharesToNumber(sharesBn);
      let valueSol = 0;
      if (shares > 0) {
        try {
          valueSol = lamportsToSol(await vault.read.previewWithdraw(SIMPLE, sharesBn));
        } catch {
          /* preview throws if bucket uninitialized; leave 0 */
        }
      }
      setPos({
        shares,
        valueSol,
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
