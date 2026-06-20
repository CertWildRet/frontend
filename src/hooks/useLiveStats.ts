"use client";

import { useEffect, useState } from "react";

export type LastCrank = {
  ts: number;
  action: string;
  reason: string;
  perTileSol: number;
  perRoundSol: number;
  evUsd: number;
  roundId: string | null;
  sig: string | null;
};

/** Shape pushed by the brain SSE broadcaster (cwr-brains/simple/src/broadcaster.ts). */
export type LiveStats = {
  roundId: string;
  perTileSol: number[]; // 25 — GLOBAL ORE board deploys
  totalDeployedSol: number;
  totalMiners: number;
  motherlodePoolOre: number;
  bucketPhase: string | null;
  bucketPhaseStartedTs: number | null;
  lastCrank: LastCrank | null;
  updatedAt: number;
};

const BRAIN = (process.env.NEXT_PUBLIC_BRAIN_URL || "").replace(/\/$/, "");

export function useLiveStats() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!BRAIN || typeof window === "undefined") return;
    let es: EventSource | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource(`${BRAIN}/api/stream`);
      es.onopen = () => setConnected(true);
      es.onmessage = (e) => {
        try {
          setStats(JSON.parse(e.data) as LiveStats);
        } catch {
          /* ignore malformed frame */
        }
      };
      es.onerror = () => {
        setConnected(false);
        // EventSource auto-reconnects; nothing to do.
      };
    };
    connect();

    return () => {
      closed = true;
      es?.close();
    };
  }, []);

  return { stats, connected, enabled: !!BRAIN };
}
