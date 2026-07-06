"use client";

import { useEffect, useState } from "react";

/** Shape returned by a crank-simple instance's GET /api/ath (src/ath.ts). */
export type AthData = {
  token: "ore" | "zinc";
  athUsd: number | null;
  windowDays: number;
  asOf: number | null;
};

/**
 * Trailing 1-year-high (USD) for a token, from its keeper's /api/ath. The value
 * changes at most once a day, so this polls slowly (hourly) and keeps the last
 * good value across blips. Pass the brain URL for the page's token: the ORE page
 * uses NEXT_PUBLIC_BRAIN_URL, the ZINC page NEXT_PUBLIC_ZINC_BRAIN_URL.
 */
export function useAth(brainUrl: string | undefined, pollMs = 60 * 60 * 1000): AthData | null {
  const [ath, setAth] = useState<AthData | null>(null);

  useEffect(() => {
    const base = (brainUrl || "").replace(/\/$/, "");
    if (!base || typeof window === "undefined") return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`${base}/api/ath`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!stop && typeof d?.athUsd === "number") setAth(d as AthData);
      } catch {
        /* keep last good value; transient brain/network blip */
      }
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [brainUrl, pollMs]);

  return ath;
}
