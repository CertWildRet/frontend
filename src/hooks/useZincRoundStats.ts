"use client";

import { useEffect, useState } from "react";

/** Mirrors readZincRoundStats in cwr-brains/simple/src/zinc/round_stats.ts. */
export type ZincRoundStats = {
  initialized: boolean;
  roundId: string;
  status: number;
  statusLabel: string;
  totalDeployedSol: number;
  players: number;
  tiles: number;
  updatedAt: number;
};

/**
 * Polls the dZINC keeper's /api/zinc-round-state (the round-level aggregates:
 * round id / status / pot / players). Plain fetch on an interval, not SSE — the
 * round account changes slowly. Degrades to null when the keeper hasn't shipped
 * the endpoint yet (404) or NEXT_PUBLIC_ZINC_BRAIN_URL is unset.
 */
export function useZincRoundStats(pollMs = 12_000) {
  const [stats, setStats] = useState<ZincRoundStats | null>(null);

  useEffect(() => {
    const BRAIN = (process.env.NEXT_PUBLIC_ZINC_BRAIN_URL || "").replace(/\/$/, "");
    if (!BRAIN || typeof window === "undefined") return;
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch(`${BRAIN}/api/zinc-round-state`);
        if (!r.ok) return;
        const j = (await r.json()) as ZincRoundStats;
        if (alive) setStats(j);
      } catch {
        /* keeper offline / endpoint not deployed yet — keep last good frame */
      }
    };

    load();
    const id = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);

  const enabled = !!(process.env.NEXT_PUBLIC_ZINC_BRAIN_URL || "").trim();
  return { stats, enabled };
}
