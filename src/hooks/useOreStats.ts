"use client";

/**
 * usePolled — generic mount-fetch + interval-poll for the ORE stats REST layer
 * (historical / fallback; the live layer is useOreLive). Modeled on the app's
 * existing poll hooks: fetch on mount, re-fetch on an interval, expose a manual
 * refresh, and never leave a stale error masking fresh data.
 *
 * Background intervals also pause while the document is hidden.
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
  const running = useRef(false); // in-flight guard: a slow request must not stack
  // A dependency change while the previous request is still running must not be
  // dropped. Remember one latest rerun; fetchRef always points it at the newest
  // query/sort/range rather than replaying the stale request.
  const rerunRequested = useRef(false);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  // `run` re-identifies when `deps` change (e.g. a new sort/range/query), which
  // re-triggers the effect below and re-fetches. Empty deps = mount + interval only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    if (running.current) {
      rerunRequested.current = true;
      return;
    }
    running.current = true;
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
      running.current = false;
      if (rerunRequested.current) {
        rerunRequested.current = false;
        // Start immediately so no interval/visibility event is required to
        // recover a query change that arrived during the previous request.
        void run();
      } else {
        setFetching(false);
      }
    }
  }, deps);

  const active = useContext(PolledActiveContext);
  const lastRunAt = useRef(0);
  const lastRunFn = useRef<unknown>(null);

  useEffect(() => {
    if (!active) return; // paused: hidden tab. Data stays; resume refetches.
    let alive = true;
    const doRun = () => {
      if (!alive) return;
      lastRunAt.current = Date.now();
      lastRunFn.current = run;
      run();
    };
    // Interval ticks skip while a request is still in flight. Without this a
    // slow endpoint (e.g. a heavy miner's lifetime P&L) piles up one query per
    // tick until the DB is saturated with duplicate in-flight copies — the
    // measured cause of the /ore/miner hangs. Deps-change/mount runs bypass it.
    // Also skip while the browser tab is hidden; resume refetches when visible.
    const guardedTick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (!running.current) doRun();
    };
    // Fetch now unless THIS run identity (same deps) fired recently enough
    // that the interval wouldn't have — deps changes always refetch, resuming
    // a tab only refetches when the data is actually stale.
    const fresh = lastRunFn.current === run && intervalMs > 0 && Date.now() - lastRunAt.current < intervalMs;
    // Dependency changes and first mount call `run` even if another request is
    // active; `run` queues exactly one latest rerun. Interval ticks remain
    // guarded below so routine polling never stacks duplicate requests.
    if (!fresh) doRun();
    if (intervalMs <= 0) {
      const onVis = () => {
        if (document.visibilityState === "visible") guardedTick();
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        alive = false;
        document.removeEventListener("visibilitychange", onVis);
      };
    }
    const id = setInterval(guardedTick, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") guardedTick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [run, intervalMs, active]);

  return { data, provenance, error, loading, fetching, refresh: run };
}
