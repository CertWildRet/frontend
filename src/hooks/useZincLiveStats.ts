"use client";

import { useEffect, useState } from "react";
import type { LiveStats } from "./useLiveStats";

/**
 * Live feed for the dZINC keeper (crank-simple deployed with protocol=zinc) at
 * NEXT_PUBLIC_ZINC_BRAIN_URL. Same SSE frame shape as the ORE feed, but on the
 * ZINC deployment the only ZINC-relevant field is `lastCrank` (the keeper's last
 * `crank_mine_zinc`: full 30-tile coverage, perTileSol = perRoundSol / 30). The
 * frame's perTileSol[25]/motherlode are the GLOBAL ORE board (the broadcaster is
 * ORE-hardcoded) and are ignored here. The dZINC board itself is an encrypted
 * full-coverage mask, so coverage is uniform across all 30 tiles when it mines.
 */
export function useZincLiveStats() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const BRAIN = (process.env.NEXT_PUBLIC_ZINC_BRAIN_URL || "").replace(/\/$/, "");
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
      es.onerror = () => setConnected(false); // EventSource auto-reconnects
    };
    connect();

    return () => {
      closed = true;
      es?.close();
    };
  }, []);

  const enabled = !!(process.env.NEXT_PUBLIC_ZINC_BRAIN_URL || "").trim();
  return { stats, connected, enabled };
}
