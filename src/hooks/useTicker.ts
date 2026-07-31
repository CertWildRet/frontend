"use client";

import { useEffect, useState } from "react";

export type TickerData = {
  sol_usd: number | null;
  ore_usd: number | null;
  ore_sol: number | null;
  uore_apr: number | null;
  store_apr: number | null;
  motherlode_pool_ore: number | null;
  motherlode_odds: number | null;
};

/** Live header ticker — cached /api/ticker, re-polls each minute. */
export function useTicker(): TickerData | null {
  const [data, setData] = useState<TickerData | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.hidden) return;
      fetch("/api/ticker")
        .then((r) => r.json())
        .then((j) => { if (alive && j?.data) setData(j.data); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60_000);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return data;
}
