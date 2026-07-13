/**
 * ORE-ecosystem Stats client: reads the analytics service's `/ore/*` + `/stats/*`
 * endpoints (the new `ore` schema — whole-ORE-game data, our dORE pool woven in).
 * Native units only; USD arrives ONLY via the ore.prices overlay and is labelled
 * off-chain/display-only. Every payload carries an ORE `provenance` envelope.
 *
 * Live layer: the same service exposes a WebSocket at /stream (see useOreLive).
 */
import { ANALYTICS_URL, ANALYTICS_WS_URL, lamportsToSol, oreGramsToOre } from "./analytics";

export { lamportsToSol, oreGramsToOre };

/** ws(s):// origin for the analytics WebSocket (always upstream, not the REST proxy). */
export const ORE_WS_URL = ANALYTICS_WS_URL;

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
  /** Precomputed max−min tile deploy (lamports), when the API includes it. */
  max_spread?: string | null;
  /** Event-derived per-tile extremes (lamports) — exact for all covered rounds. */
  tile_max?: string | null;
  tile_min?: string | null;
};

/** Round detail — per-tile deploy + miner counts (from `/ore/round/:id`). */
export type OreRoundDetail = OreRound & {
  [key: `deployed_${number}`]: string | undefined;
  [key: `count_${number}`]: string | undefined;
};

export const ORE_TILE_COUNT = 25;

export type TileDeployRange = { min: bigint; max: bigint; spread: bigint };

/** Min/max/spread tile deploy (lamports). Uses `max_spread` when tiles are absent. */
export function roundTileDeployRange(r: OreRound | OreRoundDetail): TileDeployRange | null {
  let min: bigint | null = null;
  let max: bigint | null = null;
  for (let i = 0; i < ORE_TILE_COUNT; i++) {
    const raw = (r as OreRoundDetail)[`deployed_${i}`];
    if (raw == null || raw === "") continue;
    const v = BigInt(raw);
    if (min === null || v < min) min = v;
    if (max === null || v > max) max = v;
  }
  if (min != null && max != null) return { min, max, spread: max - min };
  if (r.tile_max != null && r.tile_min != null && r.tile_max !== "") {
    const tmax = BigInt(r.tile_max);
    const tmin = BigInt(r.tile_min);
    return { min: tmin, max: tmax, spread: tmax - tmin };
  }
  if (r.max_spread != null && r.max_spread !== "") {
    const spread = BigInt(r.max_spread);
    return { min: 0n, max: spread, spread };
  }
  return null;
}

/** Max−min SOL deployed across the 25 tiles (lamports). */
export function roundMaxSpreadLamports(r: OreRound | OreRoundDetail): bigint | null {
  return roundTileDeployRange(r)?.spread ?? null;
}

/** Spread as a fraction of the coldest tile deploy (for formatPct). */
export function roundMaxSpreadFrac(range: TileDeployRange): number | null {
  if (range.min === 0n) return null;
  return Number(range.spread) / Number(range.min);
}

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
  total: number;
  /** Share of miners (with a deploy) whose SOL net + ORE at today's ratio is positive. */
  net_positive_pct: number | null;
  ore_sol_ratio: number | null;
  limit: number;
  offset: number;
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
  avg_miners: string | null; // total_miners, live-PDA rounds only → NULL over history
  avg_winners: string | null; // num_winners, ~all rounds → use this for the miners chart
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
  recent_hits: { round_id: number; ts: number | null; motherlode_paid: string; gap: number | null }[];
  current: MotherlodePool | null;
  total: number;
  limit: number;
  offset: number;
};

export type OreParticipant = {
  authority: string;
  deploys: number;
  total_sol: string;
  max_single: string;
  squares: number;
};
export type OreParticipants = { round_id: number; miner_count: number; miners: OreParticipant[] };

export type OreCompetition = {
  window: { rounds_analyzed: number; from_round?: number; to_round?: number };
  thresholds: {
    rank: number;
    rounds_with_rank: number;
    median_sol: number | null;
    min_sol: number | null;
    max_sol: number | null;
    avg_sol: number | null;
  }[];
  /** via_pool = the managed-mining crank wallet signing this miner's deploys (null/absent = self-driven). */
  regulars: { authority: string; is_ours: boolean; rounds_active: number; avg_sol: number; max_sol: number; via_pool?: string | null }[];
  latest: {
    round_id: number;
    coverage: number | null;
    players: { rank: number; authority: string; is_ours: boolean; total_sol: string; deploys: number; tiles: number; max_single: string; via_pool?: string | null }[];
  } | null;
  threshold_series: { round_id: number; rank10_sol: number }[];
  our_miner: string;
};

// ── /ore/trends : the miner-actionable Trends page payload ───────────────────
export type OreTrendPoint = {
  day_ts: number;
  rounds: number;
  sol_usd: number | null;
  ore_usd: number | null;
  market_ratio_sol: number | null;
  prod_cost_sol: number | null;
  prod_cost_claimed_sol: number | null;
  ev_pct: number | null;
  ev_claimed_pct: number | null;
  avg_deployed_sol: number | null;
  total_deployed_sol: number;
  unique_miners: number | null;
  deploy_count: number | null;
};
export type OreTrends = {
  range: string;
  points: OreTrendPoint[];
  motherlode: {
    pops: { round_id: string; ts: number; pop_ore: number }[];
    current_pool_ore: number | null;
    as_of_round: string | null;
    expected_pop_ore: number;
    avg_pop_ore: number | null;
  };
};

// ── /ore/ecosystem : investor metrics ─────────────────────────────────────────
export type OreEcoPoint = {
  day_ts: number;
  minted_ore: number; burned_ore: number | null; shared_ore: number | null;
  net_ore: number; cum_net_ore: number;
  buyback_sol: number | null;
  claims_sol: number | null; claims_ore: number | null;
  unclaimed_ore: number | null;
  deployed_sol: number | null;
  pool_share_pct: number | null; top10_share_pct: number | null;
};
export type OreEcosystem = {
  range: string;
  points: OreEcoPoint[];
  summary: {
    circulating_ore: number | null; circulating_as_of: number | null;
    lifetime_burned_ore: number | null; lifetime_shared_ore: number | null;
    lifetime_buyback_sol: number | null; unclaimed_ore_now: number | null;
  };
};

// ── /ore/miner/:pubkey : wallet P&L detail ────────────────────────────────────
export type OreMinerDetail = {
  pubkey: string;
  census: {
    snapshot_ts: string; rewards_sol: string; rewards_ore: string; refined_live: string;
    lifetime_rewards_sol: string; lifetime_rewards_ore: string; lifetime_deployed: string;
    last_claim_ore_at: number; last_claim_sol_at: number;
  } | null;
  events: { deploys: number; rounds: number; deployed: string; first_ts: string | null; last_ts: string | null } | null;
  hit_stats: { rounds: number; hits: number; won_sol: string | null; dep_sol: string | null } | null;
  claims: { claim_type: number; amount: string; n: number }[];
  managed_by: { pubkey: string; n: number }[];
  history: {
    round_id: string; ts: string | null; deployed: string; mask_union: string; stake_w: string;
    winning_tile: number | null; total_winnings: string | null; deployed_winning_square: string | null;
    total_minted: string | null; is_split: number | null;
  }[];
};

export type OreYields = {
  points: { hour_ts: number; refining_apr: number | null; staking_apr: number | null; window_days: number | null }[];
  latest: { hour_ts: number; refining_apr: number | null; staking_apr: number | null; window_days: number | null } | null;
};

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
  get<{ rounds: OreRound[]; limit: number; offset: number; total: number }>(`/ore/rounds?limit=${limit}&offset=${offset}`);
export const fetchOreRound = (roundId: number | string) =>
  get<{ round: OreRoundDetail }>(`/ore/round/${roundId}`);
export const fetchOreLeaderboard = (sort = "net_sol", minDeployed = 0, offset = 0, limit = 50) =>
  get<OreLeaderboard>(`/ore/leaderboard?sort=${sort}&min_deployed=${minDeployed}&offset=${offset}&limit=${limit}`);
export const fetchOreMiners = (opts: { sort?: string; offset?: number; limit?: number; q?: string } = {}) => {
  const p = new URLSearchParams();
  if (opts.sort) p.set("sort", opts.sort);
  if (opts.offset) p.set("offset", String(opts.offset));
  if (opts.limit) p.set("limit", String(opts.limit));
  if (opts.q) p.set("q", opts.q);
  return get<OreMiners>(`/ore/miners?${p.toString()}`);
};
export const fetchOreSeries = (range = "30d") => get<OreSeries>(`/ore/series?range=${range}`);
export const fetchOreTrends = (range = "30d") => get<OreTrends>(`/ore/trends?range=${range}`);
export const fetchOreEcosystem = (range = "90d") => get<OreEcosystem>(`/ore/ecosystem?range=${range}`);
export const fetchOreYields = () => get<OreYields>(`/ore/yields`);
export const fetchOreMiner = (pubkey: string) => get<OreMinerDetail>(`/ore/miner/${pubkey}`);
export const fetchOreRng = () => get<OreRng>("/ore/rng");
export const fetchOreMotherlode = (limit = 50, offset = 0) =>
  get<OreMotherlode>(`/ore/motherlode?limit=${limit}&offset=${offset}`);
export const fetchOreParticipants = (roundId: number) => get<OreParticipants>(`/ore/participants/${roundId}`);
export const fetchOreCompetition = (rounds = 10) => get<OreCompetition>(`/ore/competition?rounds=${rounds}`);
export const fetchStatsOverview = () => get<StatsOverview>("/stats/overview");

/** Rake bps -> percent (10.5% ≈ 1050 bps). */
export const bpsToPct = (bps?: string | number | null): number =>
  bps == null ? 0 : Number(bps) / 100;
