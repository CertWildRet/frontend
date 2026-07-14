"use client";

/**
 * usePolled — generic mount-fetch + interval-poll for the ORE stats REST layer
 * (historical / fallback; the live layer is useOreLive). Modeled on the app's
 * existing poll hooks: fetch on mount, re-fetch on an interval, expose a manual
 * refresh, and never leave a stale error masking fresh data.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { OreEnvelope } from "@/lib/oreStats";

/**
 * Visibility gate for pollers. The stats page keeps visited tabs MOUNTED (so
 * switching back is instant), which used to leave every tab's pollers firing
 * behind the hidden div — a dozen concurrent fetch+render cycles that made
 * mobile unusable. Each hidden tab provides `false`; every usePolled inside
 * pauses (no interval, no deps refetch) and resumes with a fresh fetch when
 * the tab is shown again.
 */
export const PolledActiveContext = createContext(true);

export type Polled<T> = {
  data: T | null;
  provenance: OreEnvelope<T>["provenance"] | null;
  error: string | null;
  /** TRUE only until the FIRST successful load — drive skeletons off this.
   *  Background polls / deps refetches keep it false (stale data stays up). */
  loading: boolean;
  /** TRUE while ANY fetch is in flight — drive "refreshing…" hints off this. */
  fetching: boolean;
  refresh: () => void;
};

export function usePolled<T>(
  fetcher: () => Promise<OreEnvelope<T>>,
  intervalMs = 0,
  deps: unknown[] = [],
): Polled<T> {
  const [data, setData] = useState<T | null>(null);
  const [provenance, setProvenance] = useState<OreEnvelope<T>["provenance"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(true);
  const hasData = useRef(false);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  // `run` re-identifies when `deps` change (e.g. a new sort/range/query), which
  // re-triggers the effect below and re-fetches. Empty deps = mount + interval only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    setFetching(true);
    if (!hasData.current) setLoading(true);
    try {
      const env = await fetchRef.current();
      setData(env.data);
      setProvenance(env.provenance);
      setError(null);
      hasData.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, deps);

  const active = useContext(PolledActiveContext);
  const lastRunAt = useRef(0);
  const lastRunFn = useRef<unknown>(null);

  useEffect(() => {
    if (!active) return; // paused: hidden tab. Data stays; resume refetches.
    let alive = true;
    const tick = () => {
      if (!alive) return;
      lastRunAt.current = Date.now();
      lastRunFn.current = run;
      run();
    };
    // Fetch now unless THIS run identity (same deps) fired recently enough
    // that the interval wouldn't have — deps changes always refetch, resuming
    // a tab only refetches when the data is actually stale.
    const fresh = lastRunFn.current === run && intervalMs > 0 && Date.now() - lastRunAt.current < intervalMs;
    if (!fresh) tick();
    if (intervalMs > 0) {
      const id = setInterval(tick, intervalMs);
      return () => { alive = false; clearInterval(id); };
    }
    return () => { alive = false; };
  }, [run, intervalMs, active]);

  return { data, provenance, error, loading, fetching, refresh: run };
}
