"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchWalletPnl,
  fetchWalletCycles,
  type WalletPnl,
  type WalletCycle,
  type Provenance,
} from "@/lib/analytics";

export type WalletAnalytics = {
  pnl: WalletPnl | null;
  cycles: WalletCycle[];
  provenance: Provenance | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Pulls the connected wallet's full reconstructed history from the analytics
 * service: per-bucket PnL (exact cash legs + attributed + live owed) and the
 * per-cycle participation rows (which betting windows the wallet's capital was
 * part of, its share, SOL won, ORE/ZINC accrued). Null pubkey = idle.
 */
export function useWalletAnalytics(pubkey: string | null | undefined): WalletAnalytics {
  const [pnl, setPnl] = useState<WalletPnl | null>(null);
  const [cycles, setCycles] = useState<WalletCycle[]>([]);
  const [provenance, setProvenance] = useState<Provenance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!pubkey) {
      setPnl(null);
      setCycles([]);
      setProvenance(null);
      setError(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchWalletPnl(pubkey), fetchWalletCycles(pubkey)])
      .then(([p, c]) => {
        if (!alive) return;
        setPnl(p.data);
        // newest cycle first, grouped naturally by bucket then cycle id
        const sorted = [...c.data.cycles].sort(
          (a, b) => a.bucket_id - b.bucket_id || Number(b.cycle_id) - Number(a.cycle_id),
        );
        setCycles(sorted);
        setProvenance(c.provenance ?? p.provenance ?? null);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [pubkey, nonce]);

  return { pnl, cycles, provenance, loading, error, reload };
}
