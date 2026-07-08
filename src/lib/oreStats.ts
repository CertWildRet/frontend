/**
 * ORE-ecosystem Stats client: reads the analytics service's `/ore/*` + `/stats/*`
 * endpoints (the new `ore` schema — whole-ORE-game data, our dORE pool woven in).
 * Native units only; USD arrives ONLY via the ore.prices overlay and is labelled
 * off-chain/display-only. Every payload carries an ORE `provenance` envelope.
 *
 * Live layer: the same service exposes a WebSocket at /stream (see useOreLive).
 */
import { ANALYTICS_URL, lamportsToSol, oreGramsToOre } from "./analytics";

export { lamportsToSol, oreGramsToOre };

/** ws(s):// origin for the analytics WebSocket (derived from the REST origin). */
export const ORE_WS_URL = `${ANALYTICS_URL.replace(/^http/, "ws")}/stream`;

export type OreProvenance = {
  ore_max_round: string;
  ore_cumulative_through_round: string | null;
  reset_tail_last_round: string;
  census_snapshot_ts: string | null;
  ingest_enabled: boolean;
  caveats: string[];
};
export type OreEnvelope<T> = { ok: boolean; data: T; provenance: OreProvenance };

// ── row shapes (subset rendered; all native-unit strings) ────────────────────
export type OreRound = {
  round_id: number;
  ts: number | null;
  rng: string | null;
  total_deployed: string | null;
  total_miners: string | null;
  total_vaulted: string | null;
  total_winnings: string | null;
  total_minted: string | null;
  deployed_winning_square: string | null;
  num_winners: string | null;
  motherlode_paid: string | null;
  top_miner: string | null;
  top_miner_reward: string | null;
  is_split: number | null;
  motherlode_hit: number | null;
  source: string | null;
  admin_fee: string | null;
  losing_pool: string | null;
  net_to_winners: string | null;
  effective_rake_bps: string | null;
  motherlode_pool_at_start: string | null;
  cumulative_minted: string | null;
  cumulative_vaulted: string | null;
  cumulative_admin_fees: string | null;
  winning_tile: number | null;
};

export type MotherlodePool = { current_round: number; last_hit_round: number | null; pool_grams: string };

export type OreSummary = {
  latest_round: OreRound | null;
  cumulative: {
    cumulative_minted: string;
    cumulative_vaulted: string;
    cumulative_admin_fees: string;
    motherlode_pool_at_start: string;
  } | null;
  averages: { rounds: string; avg_deployed: string; avg_miners: string; avg_rake_bps: string } | null;
  cost: { vaulted: string; minted: string; rounds: number } | null;
  motherlode: MotherlodePool | null;
  prices: { ts: string; sol_usd: number; ore_usd: number } | null;
};

export type OreBands = {
  n: number;
  avg_all: number;
  top1: number;
  b05: number; b10: number; b15: number; b20: number; b30: number; b40: number; b50: number;
} | null;
export type OreLeaderRow = {
  authority: string;
  lifetime_deployed: string;
  lifetime_rewards_sol: string;
  lifetime_rewards_ore: string;
  net_sol: string;
  roi: number;
  is_ours: boolean;
};
export type OurPool = {
  rank: number;
  total: number;
  net_sol: string;
  lifetime_deployed: string;
  lifetime_rewards_sol: string;
  lifetime_rewards_ore: string;
} | null;
export type OreLeaderboard = {
  snapshot_ts: string | null;
  sort: string;
  min_deployed_sol: number;
  bands: OreBands;
  top: OreLeaderRow[];
  our_pool: OurPool;
  our_miner: string;
};

export type OreMiner = {
  authority: string;
  unclaimed_ore: string;
  refined_ore: string;
  lifetime_sol: string;
  lifetime_ore: string;
  deployed: string;
  net_sol: string;
  is_ours: boolean;
};
export type OreMiners = {
  snapshot_ts: string | null;
  total: number;
  miners: OreMiner[];
  limit: number;
  offset: number;
  sort: string;
  our_miner: string;
};

export type OreSeriesPoint = {
  bucket_ts: string;
  deployed: string;
  vaulted: string;
  winnings: string;
  minted: string;
  rounds: number;
  avg_miners: string;
  motherlode_hits: number;
  avg_rake_bps: number | null;
};
export type OreSeries = { range: string; bucket_secs: number; points: OreSeriesPoint[] };

export type OreRng = {
  total_rounds_with_tile: number;
  expected_per_tile: number;
  per_tile_wins: number[];
  chi_square: number;
  dof: number;
};

export type OreMotherlode = {
  recent_hits: { round_id: number; ts: number | null; motherlode_paid: string }[];
  current: MotherlodePool | null;
};

export type OreParticipant = {
  authority: string;
  deploys: number;
  total_sol: string;
  max_single: string;
  squares: number;
};
export type OreParticipants = { round_id: number; miner_count: number; miners: OreParticipant[] };

export type StatsOverview = {
  ore: {
    round_id: number;
    total_deployed: string;
    total_miners: string;
    effective_rake_bps: string;
    cumulative_minted: string;
    motherlode_pool_at_start: string;
  } | null;
  our_dore_pool: {
    cycles: number;
    sol_deployed_gross: string;
    sol_recovered: string;
    active_wallets: number;
  } | null;
  prices: { ts: string; sol_usd: number; ore_usd: number } | null;
};

const unreachable = () =>
  new Error(
    `Can't reach the ORE stats service (${ANALYTICS_URL}). It may be waking up (free tier) or the ORE ingest may be disabled — retry in a moment.`,
  );

async function get<T>(path: string): Promise<OreEnvelope<T>> {
  let res: Response;
  try {
    res = await fetch(`${ANALYTICS_URL}${path}`);
  } catch (e) {
    console.error("[oreStats] GET", path, e);
    throw unreachable();
  }
  if (!res.ok) throw new Error(`ORE stats request failed (${res.status}) on ${path}`);
  return res.json();
}

export const fetchOreSummary = () => get<OreSummary>("/ore/summary");
export const fetchOreRounds = (limit = 200, offset = 0) =>
  get<{ rounds: OreRound[]; limit: number; offset: number }>(`/ore/rounds?limit=${limit}&offset=${offset}`);
export const fetchOreLeaderboard = (sort = "net_sol", minDeployed = 0) =>
  get<OreLeaderboard>(`/ore/leaderboard?sort=${sort}&min_deployed=${minDeployed}`);
export const fetchOreMiners = (opts: { sort?: string; offset?: number; limit?: number; q?: string } = {}) => {
  const p = new URLSearchParams();
  if (opts.sort) p.set("sort", opts.sort);
  if (opts.offset) p.set("offset", String(opts.offset));
  if (opts.limit) p.set("limit", String(opts.limit));
  if (opts.q) p.set("q", opts.q);
  return get<OreMiners>(`/ore/miners?${p.toString()}`);
};
export const fetchOreSeries = (range = "30d") => get<OreSeries>(`/ore/series?range=${range}`);
export const fetchOreRng = () => get<OreRng>("/ore/rng");
export const fetchOreMotherlode = () => get<OreMotherlode>("/ore/motherlode");
export const fetchOreParticipants = (roundId: number) => get<OreParticipants>(`/ore/participants/${roundId}`);
export const fetchStatsOverview = () => get<StatsOverview>("/stats/overview");

/** Rake bps -> percent (10.5% ≈ 1050 bps). */
export const bpsToPct = (bps?: string | number | null): number =>
  bps == null ? 0 : Number(bps) / 100;
