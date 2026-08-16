/**
 * ORE #167 removed parimutuel SOL. Hits keep ~0.99× own stake (1% admin).
 * Misses keep ~0.891× (1% admin, then 10% of the remainder). Mixed coverage
 * is the sum of both. Missing/bad RNG refunds the full deploy.
 *
 * Round.total_returned_sol sits at the old total_winnings u64 offset — do not
 * treat that field as a loser-pool share. Figures here are display estimates,
 * not on-chain rounding (upstream square-proportional fix).
 */

/** PR #167 merge: 2026-08-12 20:46 UTC. */
export const ORE_167_CUTOVER_MS = Date.UTC(2026, 7, 12, 20, 46, 0);

/** Fill when orestack-landing#493 confirms the first mainnet round on the new math. */
export const ORE_167_FIRST_ROUND: number | null = null;

/** Keep rate after 1% admin. */
export const WIN_KEEP = 0.99;

/** Keep rate after 1% admin then 10% protocol on the rest: 0.99 × 0.90. */
export const LOSE_KEEP = 0.891;

export function isPostParimutuel(opts: {
  roundId?: number | string | null;
  ts?: number | string | null;
}): boolean {
  const roundId =
    opts.roundId == null || opts.roundId === "" ? null : Number(opts.roundId);
  if (ORE_167_FIRST_ROUND != null && roundId != null && Number.isFinite(roundId)) {
    return roundId >= ORE_167_FIRST_ROUND;
  }
  if (opts.ts != null && opts.ts !== "") {
    const n = Number(opts.ts);
    if (Number.isFinite(n) && n > 0) {
      const ms = n < 1e12 ? n * 1000 : n;
      return ms >= ORE_167_CUTOVER_MS;
    }
  }
  // Unknown era: never feed total_winnings into a pot-share formula (that
  // field is now board-wide returned SOL). Treat as post-#167.
  return true;
}

export type MinerHistorySettlementRow = {
  round_id: string;
  ts?: string | null;
  deployed: string;
  stake_w?: string | null;
  winning_tile?: number | null;
  total_winnings?: string | null;
  deployed_winning_square?: string | null;
};

/** Returned SOL for one miner-history row. */
export function returnedSolFromHistory(row: MinerHistorySettlementRow): number {
  const deployedLamports = Number(row.deployed ?? "0");
  if (!Number.isFinite(deployedLamports) || deployedLamports <= 0) return 0;
  const deployedSol = deployedLamports / 1e9;

  if (row.winning_tile == null) return deployedSol;

  const stakeW = Number(row.stake_w ?? "0");
  const winLamports = Number.isFinite(stakeW) && stakeW > 0 ? stakeW : 0;

  if (isPostParimutuel({ roundId: row.round_id, ts: row.ts })) {
    const losing = Math.max(0, deployedLamports - winLamports);
    return (winLamports * WIN_KEEP + losing * LOSE_KEEP) / 1e9;
  }

  // Pre-#167 parimutuel: miss returns 0; hit gets 0.99× + share of loser pot.
  if (winLamports <= 0) return 0;
  const dws = Number(row.deployed_winning_square ?? "0");
  if (!(dws > 0)) return 0;
  return (winLamports * WIN_KEEP + Number(row.total_winnings ?? "0") * (winLamports / dws)) / 1e9;
}

/** When analytics still reports 0 SOL on a post-#167 miss, estimate own-stake return. */
export function estimatedMissReturnSol(deployedSol: number): number {
  if (!Number.isFinite(deployedSol) || deployedSol <= 0) return 0;
  return deployedSol * LOSE_KEEP;
}

/** Display SOL back for a round participant. Do not rewrite hits (no stake_w). */
export function participantDisplayReturnSol(opts: {
  won: boolean;
  solReturn: number;
  deployedSol: number;
  roundId?: number | string | null;
  ts?: number | string | null;
}): number {
  const api = Number.isFinite(opts.solReturn) ? opts.solReturn : 0;
  if (api > 0 || opts.won) return api;
  if (!isPostParimutuel({ roundId: opts.roundId, ts: opts.ts })) return api;
  return estimatedMissReturnSol(opts.deployedSol);
}
