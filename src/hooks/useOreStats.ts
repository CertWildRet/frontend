"use client";

/**
 * usePolled — generic mount-fetch + interval-poll for the ORE stats REST layer
 * (historical / fallback; the live layer is useOreLive). Modeled on the app's
 * existing poll hooks: fetch on mount, re-fetch on an interval, expose a manual
 * refresh, and never leave a stale error masking fresh data.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { OreEnvelope } from "@/lib/oreStats";

export type Polled<T> = {
  data: T | null;
  provenance: OreEnvelope<T>["provenance"] | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

export function usePolled<T>(fetcher: () => Promise<OreEnvelope<T>>, intervalMs = 0): Polled<T> {
  const [data, setData] = useState<T | null>(null);
  const [provenance, setProvenance] = useState<OreEnvelope<T>["provenance"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const run = useCallback(async () => {
    try {
      const env = await fetchRef.current();
      setData(env.data);
      setProvenance(env.provenance);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => { if (alive) run(); };
    tick();
    if (intervalMs > 0) {
      const id = setInterval(tick, intervalMs);
      return () => { alive = false; clearInterval(id); };
    }
    return () => { alive = false; };
  }, [run, intervalMs]);

  return { data, provenance, error, loading, refresh: run };
}
