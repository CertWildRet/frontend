"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { readZincPoolStats, type ZincPoolStats } from "@/lib/cwr";

/**
 * Live dZINC pool (bucket 1) state, read straight from chain (SOL leg + in-kind
 * smelted ZINC; NO miner, NO stORE oracle). `data` is null until the first read
 * resolves; `notLive` is true once a read completes but the pool isn't deployed
 * yet (readZincPoolStats -> null), so the UI can render "not live yet" instead
 * of crashing.
 */
export function useZincData(pollMs = 12_000) {
  const { connection } = useConnection();
  const [data, setData] = useState<ZincPoolStats | null>(null);
  const [notLive, setNotLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const stats = await readZincPoolStats(connection);
      if (stats) {
        setData(stats);
        setNotLive(false);
      } else {
        setData(null);
        setNotLive(true);
      }
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

  return { data, notLive, loading, error, refresh };
}
