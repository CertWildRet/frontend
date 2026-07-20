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

export type OreMotherlodeHit = {
  round_id: number;
  ts: number | null;
  motherlode_paid: string;
  gap: number | null;
  total_deployed: string | null;
  total_winnings: string | null;
  winning_tile: number | null;
  is_split: number | null;
  top_miner: string | null;
  sol_usd: number | null;
  ore_usd: number | null;
};

export type OreMotherlode = {
  recent_hits: OreMotherlodeHit[];
  current: MotherlodePool | null;
  total: number;
  biggest_paid: string | null;
  avg_paid: string | null;
  underwater: number;
  priced: number;
  limit: number;
  offset: number;
};

export type OreMotherlodeSharer = {
  pubkey: string;
  tile_stake: string;
  deploys: number;
  share: number; // fraction of the pool 0..1
  is_solo_winner: boolean;
  cost_sol: number; // full round spend, all tiles
  tiles_covered: number; // distinct tiles they deployed on
  ml_ore: number; // ORE taken from the pool
  sol_return: number; // SOL from the winners' pot
  roi: number | null; // gross return / cost (USD), null if unpriced
};

export type OreMotherlodePop = {
  round: {
    round_id: number; ts: number; winning_tile: number | null; is_split: number | null;
    top_miner: string | null; motherlode_paid: string; total_deployed: string;
    total_winnings?: string; sol_usd: number | null; ore_usd: number | null;
  };
  has_distribution: boolean;
  reason?: string;
  sort?: "stake" | "roi";
  sharers_total?: number;
  avg_roi?: number | null;
  solo_winner_share?: number | null;
  solo_winner_roi?: number | null;
  sharers: OreMotherlodeSharer[];
};

export type OreRoundParticipant = {
  pubkey: string;
  deployed_sol: number;
  tiles_covered: number;
  deploys: number;
  share: number;        // fraction of the round's total deployed SOL
  won: boolean;         // staked on the winning tile
  sol_return: number;   // pro-rata SOL from the winners' pot
  ml_ore: number;       // pro-rata motherlode ORE (0 unless the round popped)
  ore_won: number;      // total ORE won: ml_ore + the ~1 ORE base emission if solo winner
  roi: number | null;   // gross multiple (return / cost), USD-based; null if unpriced
  is_solo_winner: boolean;
};

export type OreParticipants = {
  round: {
    round_id: number; ts: number; winning_tile: number | null; is_split: number | null;
    top_miner: string | null; total_deployed: string; total_winnings: string;
    motherlode_paid: string; total_miners: string | null; sol_usd: number | null; ore_usd: number | null;
  };
  has_participants: boolean;
  reason?: string;
  sort?: "deployed" | "roi" | "won";
  participants_total: number;
  winners_count?: number;
  deploy_frontier: number;
  participants: OreRoundParticipant[];
};

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
  /** Motherlode pool at the end of the bucket (sawtooth; resets on pop). */
  ml_pool_ore: number | null;
};
export type OreTrends = {
  range: string;
  /** Live signal: trailing ~30 settled rounds × latest spot — refreshes every poll. */
  now: { prod_cost_sol: number; market_ratio_sol: number; ev_pct: number; rounds_window: number; miners_today: number | null } | null;
  points: OreTrendPoint[];
  motherlode: {
    pops: { round_id: string; ts: number; pop_ore: number; expected_pop_ore?: number }[];
    current_pool_ore: number | null;
    as_of_round: string | null;
    /** The CURRENT era's expected pop (0.2 x odds): 125 pre-335k, 100 after. */
    expected_pop_ore: number;
    /** Motherlode odds for the live round: 625 pre-335k, 500 after. */
    odds_per_round?: number;
    /** Round at which the on-chain odds changed (335,000). */
    odds_change_round?: number;
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
  /** Per-tile deploy counts (25) across every deploy in the event window. */
  tiles: number[] | null;
  /** Per-round P/L, oldest -> newest. Windows past 5k rounds arrive bucketed:
   *  each point then sums `n` consecutive rounds (`hits` of them wins). */
  series: { round_id: number; ts: number; net_sol: number; cum_sol: number; hit: boolean; hits: number; n: number; ore_won: number; net_usd: number | null }[];
  derived: {
    rounds: number; avg_bet_sol: number;
    best_win_sol: number | null; worst_loss_sol: number | null;
    /** Best/worst by BOTH legs in USD at round-time prices (spot fallback). */
    best_round: { round_id: number; ts: number; net_sol: number; ore_won: number; net_usd: number | null } | null;
    worst_round: { round_id: number; ts: number; net_sol: number; ore_won: number; net_usd: number | null } | null;
    longest_hit_streak: number; longest_miss_streak: number; current_streak: number;
    ev_sol: number; ev_ore: number;
    ore_won_expected: number;
    /** Realized: solo wins counted in full to the sampled winner. */
    ore_won_realized: number;
    ore_cost_sol: number | null;
  } | null;
  /** Latest spot prices — lets the P/L trend re-mark the ORE leg at today's value. */
  prices_now: { sol_usd: number; ore_usd: number } | null;
  /** Global event-history floor (how far back the backfill currently reaches). */
  coverage: { min_round: string | null; min_ts: number | null } | null;
};

export type OreYields = {
  points: { hour_ts: number; refining_apr: number | null; staking_apr: number | null; window_days: number | null }[];
  latest: { hour_ts: number; refining_apr: number | null; staking_apr: number | null; window_days: number | null } | null;
};

export type OreDominancePoint = {
  hour_ts: number;
  unclaimed_ore: number | null; refined_ore: number | null; supply_ore: number | null;
  /** Unrefined treasury ORE / total supply, in percent. */
  dominance_pct: number | null;
};
export type OreDominance = { points: OreDominancePoint[]; latest: OreDominancePoint | null };

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
    `Can't reach the ORE stats service (${ANALYTICS_URL}). It may be waking up (free tier) or the ORE ingest may be disabled. Retry in a moment.`,
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
/**
 * Motherlode odds are ROUND-GATED on-chain (ore/api/src/state/round.rs
 * did_hit_motherlode): 1-in-625 below round 335,000, 1-in-500 from 335,000 on.
 * Accrual stays 0.2 ORE/round, so the long-run average pop moves 125 -> 100 ORE.
 * Never apply the new odds retroactively — every pre-335k pop really was a
 * 1-in-625 draw against a 125 ORE expectation.
 */
export const MTL_ODDS_CHANGE_ROUND = 335_000;
export const motherlodeOdds = (roundId: number): number => (roundId >= MTL_ODDS_CHANGE_ROUND ? 500 : 625);
export const expectedPopOre = (roundId: number): number => 0.2 * motherlodeOdds(roundId);

export const fetchOreYields = () => get<OreYields>(`/ore/yields`);
export const fetchOreDominance = () => get<OreDominance>(`/ore/dominance`);

// ── /ore/cohorts : ORE holder-size distribution + cohort balance changes ──────
// v1 is MINER-SIDE ORE only (unclaimed + live refined) — not a true token-holder
// distribution. cohort 1..5 = Plankton/Shrimp/Fish/Shark/Whale.
export type OreCohortRow = { cohort: number; holders: number; ore: number; supply_ore: number | null };
export type OreCohortChange = { snapshot_ts: string; cohort: number; delta_ore: number; ore: number; holders: number };
export type OreCohortSource = "miner" | "holder";
export type OreCohortVaulted = { owners: number; ore: number };
export type OreCohortStats = {
  real_holders: number; real_ore: number; vaulted_ore: number; vaulted_owners: number;
  largest_ore: number | null; top10_ore: number | null; top100_ore: number | null;
};
export type OreCohorts = {
  source: OreCohortSource;
  updated_at: string | null;
  distribution: OreCohortRow[];
  changes: OreCohortChange[];
  supply_ore: number | null;
  held_ore: number;
  miner_held_ore: number; // alias of held_ore (backward compat)
  total_holders: number;
  miner_side: boolean;
  vaulted: OreCohortVaulted | null; // holder source only: excluded protocol/vault ORE
  stats: OreCohortStats | null; // holder source only: concentration metrics
  note?: string;
};
export const fetchOreCohorts = (source: OreCohortSource = "holder", days = 30) =>
  get<OreCohorts>(`/ore/cohorts?source=${source}&days=${days}`);
export const fetchOreMiner = (pubkey: string, rounds: number | "all" = 1000) => get<OreMinerDetail>(`/ore/miner/${pubkey}?rounds=${rounds}`);
export const fetchOreRng = () => get<OreRng>("/ore/rng");
export const fetchOreMotherlode = (limit = 50, offset = 0) =>
  get<OreMotherlode>(`/ore/motherlode?limit=${limit}&offset=${offset}`);
// ── Per-round drill-down cache ───────────────────────────────────────────────
// A SETTLED, fully-ingested round's participant split / motherlode pop is
// IMMUTABLE — it can never change once on-chain. So cache those responses in
// localStorage and serve them without a network round-trip on re-open. Only the
// FINAL form is cached (has_participants / has_distribution true); the transient
// "still ingesting" state is never cached, so it keeps refetching until data
// lands. Bump the version tag when a response shape changes to invalidate old
// entries. Fails soft: quota / private-mode errors just skip the cache.
const ROUND_CACHE_V = "ore:rd:v2:";
function readRoundCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage.getItem(ROUND_CACHE_V + key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
function writeRoundCache<T>(key: string, val: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ROUND_CACHE_V + key, JSON.stringify(val));
  } catch {
    // Over quota: drop our own cached rounds and retry once, else give up.
    try {
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(ROUND_CACHE_V)) window.localStorage.removeItem(k);
      }
      window.localStorage.setItem(ROUND_CACHE_V + key, JSON.stringify(val));
    } catch {
      /* private mode / still full — run uncached */
    }
  }
}

export const fetchOreMotherlodePop = async (roundId: number, sort: "stake" | "roi" = "stake", top = 20) => {
  const key = `ml:${roundId}:${sort}`;
  const cached = readRoundCache<OreEnvelope<OreMotherlodePop>>(key);
  if (cached) return cached;
  const env = await get<OreMotherlodePop>(`/ore/motherlode/${roundId}?sort=${sort}&top=${top}`);
  if (env.data?.has_distribution) writeRoundCache(key, env); // only the immutable split
  return env;
};
export const fetchOreParticipants = async (roundId: number, sort: "deployed" | "roi" | "won" = "deployed", top = 20) => {
  const key = `pt:${roundId}:${sort}`;
  const cached = readRoundCache<OreEnvelope<OreParticipants>>(key);
  if (cached) return cached;
  const env = await get<OreParticipants>(`/ore/participants/${roundId}?sort=${sort}&top=${top}`);
  if (env.data?.has_participants) writeRoundCache(key, env); // only once fully ingested
  return env;
};
export const fetchOreCompetition = (rounds = 10) => get<OreCompetition>(`/ore/competition?rounds=${rounds}`);
export const fetchStatsOverview = () => get<StatsOverview>("/stats/overview");

/** Rake bps -> percent (10.5% ≈ 1050 bps). */
export const bpsToPct = (bps?: string | number | null): number =>
  bps == null ? 0 : Number(bps) / 100;
