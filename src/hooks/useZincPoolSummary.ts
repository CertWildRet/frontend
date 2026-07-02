"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchPoolSummary,
  BUCKET,
  lamportsToSol,
  type Provenance,
} from "@/lib/analytics";

/**
 * Pool mining PnL for either bucket, reconstructed from on-chain events by the
 * analytics service (GET /pool/summary?bucket=N). Deployed = sum of the mine
 * crank events; recovered = sum of the settle events' claimed SOL. Nothing is
 * estimated or hardcoded. Polls slowly (analytics is finality-lagged + cached);
 * fails soft (returns null) so the on-chain economics still render.
 */
export type PoolPnl = {
  deployedGrossSol: number;
  deployedNetSol: number;
  /** SOL actually deposited by LPs (the capital base / cost basis). This is the
      correct denominator for a true ROI — sol_deployed_gross is inflated by
      round-to-round recycling and understates the loss when divided into. */
  depositedCapitalSol: number;
  recoveredSol: number;
  netPnlSol: number;
  /** SOL-only netPnl / depositedCapital, as a percent (true ROI on capital,
      0 when nothing deposited yet). The full PnL incl. the token leg is computed
      in the economics components against this same depositedCapital base. */
  pnlPct: number;
  cycles: number;
};
/** Back-compat alias for the original dZINC-only name. */
export type ZincPoolPnl = PoolPnl;

export function usePoolSummary(
  bucket: number = BUCKET.dZINC,
  pollMs = 60_000,
): {
  pnl: PoolPnl | null;
  provenance: Provenance | null;
  loading: boolean;
  error: string | null;
} {
  const [pnl, setPnl] = useState<PoolPnl | null>(null);
  const [provenance, setProvenance] = useState<Provenance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tick = useCallback(
    async (alive: () => boolean) => {
      try {
        const res = await fetchPoolSummary(bucket);
        if (!alive()) return;
        const d = res.data;
        const deployedGrossSol = lamportsToSol(d.sol_deployed_gross);
        const deployedNetSol = lamportsToSol(d.sol_deployed_net);
        const depositedCapitalSol = lamportsToSol(d.total_deposited_net);
        const recoveredSol = lamportsToSol(d.sol_recovered);
        const netPnlSol = lamportsToSol(d.sol_net_pnl);
        // True ROI base: SOL actually deposited, NOT gross deployed (which recycles
        // the same capital many times and would understate the loss).
        const pnlPct =
          depositedCapitalSol > 0 ? (netPnlSol / depositedCapitalSol) * 100 : 0;
        setPnl({
          deployedGrossSol,
          deployedNetSol,
          depositedCapitalSol,
          recoveredSol,
          netPnlSol,
          pnlPct,
          cycles: Number(d.cycles ?? 0),
        });
        setProvenance(res.provenance ?? null);
        setError(null);
      } catch (e) {
        if (!alive()) return;
        setError(e instanceof Error ? e.message : String(e));
        // keep the last good pnl on a transient analytics blip
      } finally {
        if (alive()) setLoading(false);
      }
    },
    [bucket],
  );

  useEffect(() => {
    let live = true;
    const alive = () => live;
    void tick(alive);
    const id = setInterval(() => void tick(alive), pollMs);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [tick, pollMs]);

  return { pnl, provenance, loading, error };
}

/** dZINC (bucket 1) convenience wrapper — unchanged call site for ZincEconomics. */
export function useZincPoolSummary(pollMs = 60_000) {
  return usePoolSummary(BUCKET.dZINC, pollMs);
}
