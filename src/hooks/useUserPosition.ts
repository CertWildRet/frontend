"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { makeVault, SIMPLE, sharesToNumber } from "@/lib/cwr";
import { MOCK, mockUserPos } from "@/lib/mock";

export type UserPos = {
  shares: number;
  poolSharePct: number;
};

export function useUserPosition(totalShares: number, pollMs = 12_000) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [pos, setPos] = useState<UserPos | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (MOCK) {
      setPos(mockUserPos);
      return;
    }
    if (!publicKey) {
      setPos(null);
      return;
    }
    setLoading(true);
    try {
      const vault = makeVault(connection);
      const sharesBn = await vault.read.userShares(SIMPLE, publicKey);
      const shares = sharesToNumber(sharesBn);
      // NOTE: no SOL VALUE here on purpose. previewWithdraw/navSnapshot read the
      // on-chain NAV, which is idle-SOL-only and ~0 mid-round (it drops won SOL,
      // in-flight, ORE + stORE) and would understate the position. The display
      // layer values the position from useVaultData's miner-derived recoverable
      // (see PositionCard / app/position) instead.
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
