/**
 * Opt-in Ore stats fixtures for NEXT_PUBLIC_MOCK=1.
 * Keeps provider chips + Miners by Provider / Deployed SOL by Provider charts
 * renderable without live analytics.
 * Not loaded unless MOCK is explicitly enabled — never the default path.
 */
import type { OreCompetition, OreEnvelope, OreLeaderboard, OreProvenance } from "@/lib/oreStats";
import { toServiceTag, providerById } from "@/lib/oreProviders";

const provenance: OreProvenance = {
  ore_max_round: "100",
  ore_cumulative_through_round: "99",
  reset_tail_last_round: "99",
  census_snapshot_ts: "2026-08-28T00:00:00.000Z",
  ingest_enabled: true,
  caveats: ["Mock ORE stats fixture (NEXT_PUBLIC_MOCK=1)."],
};

const tag = (id: "orecom" | "orestack" | "minemore" | "refinore" | "accumulana") =>
  toServiceTag(providerById(id)!);

const MINEMORE = "3sj1M66WBUnGTjf9CNZnh5nd5LA1grBG4hSY4YcViTPh";
const REFINORE = "HMAYjHeogmdm5J1EuBhhbbSvMrWARsEt38SsGZTrB7Mm";
const ACCUMULANA = "32eM5hdEZVgSBrdzF79U4BspCD6RMn4cttBmrTXbwhH9";
const ORECOM_CRANK = "HaWGEatzkfVVCkfdD1nTbQ1qQ18sACQMnrqvkj3t3Pt";

function envelope<T>(data: T): OreEnvelope<T> {
  return { ok: true, data, provenance };
}

/** Competition fixture: one miner per provider + one overlap (Many) + independents. */
export function mockOreCompetition(rounds = 10): OreEnvelope<OreCompetition> {
  return envelope({
    window: { rounds_analyzed: rounds, from_round: 100 - rounds, to_round: 100 },
    thresholds: [
      { rank: 1, rounds_with_rank: rounds, median_sol: 1.2, min_sol: 0.9, max_sol: 1.5, avg_sol: 1.1 },
      { rank: 3, rounds_with_rank: rounds, median_sol: 0.6, min_sol: 0.4, max_sol: 0.8, avg_sol: 0.55 },
      { rank: 5, rounds_with_rank: rounds, median_sol: 0.35, min_sol: 0.3, max_sol: 0.4, avg_sol: 0.34 },
      { rank: 10, rounds_with_rank: rounds, median_sol: 0.15, min_sol: 0.1, max_sol: 0.2, avg_sol: 0.14 },
      { rank: 20, rounds_with_rank: rounds, median_sol: 0.05, min_sol: 0.04, max_sol: 0.06, avg_sol: 0.05 },
    ],
    regulars: [
      { authority: "MockOrecom1111111111111111111111111111111", is_ours: false, rounds_active: rounds, avg_sol: 0.45, max_sol: 0.5, via_pool: ORECOM_CRANK, service: tag("orecom") },
      { authority: "MockOrestack11111111111111111111111111111", is_ours: false, rounds_active: rounds, avg_sol: 0.4, max_sol: 0.45, via_pool: null, service: tag("orestack") },
      { authority: "MockMinemore1111111111111111111111111111", is_ours: false, rounds_active: rounds - 1, avg_sol: 0.3, max_sol: 0.35, via_pool: MINEMORE, service: null },
      { authority: "MockRefinore1111111111111111111111111111", is_ours: false, rounds_active: rounds - 2, avg_sol: 0.25, max_sol: 0.3, via_pool: REFINORE, service: null },
      { authority: "MockAccumulana1111111111111111111111111", is_ours: false, rounds_active: rounds - 1, avg_sol: 0.22, max_sol: 0.28, via_pool: ACCUMULANA, service: null },
      // Overlap: analytics Ore.com + Minemore fee wallet → Many in the histogram.
      { authority: "MockManyProviders111111111111111111111", is_ours: false, rounds_active: rounds, avg_sol: 0.5, max_sol: 0.6, via_pool: MINEMORE, service: tag("orecom") },
      { authority: "MockIndependent11111111111111111111111", is_ours: false, rounds_active: rounds, avg_sol: 0.9, max_sol: 1.1, via_pool: null, service: null },
    ],
    latest: {
      round_id: 100,
      coverage: 1,
      // total_sol is lamports. Includes every provider + Many so SOL-share chart exercises overlaps.
      players: [
        { rank: 1, authority: "MockIndependent11111111111111111111111", is_ours: false, total_sol: "1100000000", deploys: 5, tiles: 25, max_single: "300000000", via_pool: null, service: null },
        { rank: 2, authority: "MockManyProviders111111111111111111111", is_ours: false, total_sol: "600000000", deploys: 4, tiles: 22, max_single: "300000000", via_pool: MINEMORE, service: tag("orecom") },
        { rank: 3, authority: "MockOrecom1111111111111111111111111111111", is_ours: false, total_sol: "500000000", deploys: 3, tiles: 18, max_single: "500000000", via_pool: ORECOM_CRANK, service: tag("orecom") },
        { rank: 4, authority: "MockOrestack11111111111111111111111111111", is_ours: false, total_sol: "400000000", deploys: 4, tiles: 20, max_single: "200000000", via_pool: null, service: tag("orestack") },
        { rank: 5, authority: "MockMinemore1111111111111111111111111111", is_ours: false, total_sol: "300000000", deploys: 2, tiles: 12, max_single: "200000000", via_pool: MINEMORE, service: null },
        { rank: 6, authority: "MockRefinore1111111111111111111111111111", is_ours: false, total_sol: "250000000", deploys: 2, tiles: 10, max_single: "150000000", via_pool: REFINORE, service: null },
        { rank: 7, authority: "MockAccumulana1111111111111111111111111", is_ours: false, total_sol: "220000000", deploys: 3, tiles: 14, max_single: "120000000", via_pool: ACCUMULANA, service: null },
      ],
    },
    threshold_series: [{ round_id: 100, rank10_sol: 0.15 }],
    our_miner: "",
  });
}

export function mockOreLeaderboard(): OreEnvelope<OreLeaderboard> {
  return envelope({
    snapshot_ts: provenance.census_snapshot_ts,
    sort: "net_sol",
    min_deployed_sol: 0,
    bands: {
      n: 7,
      avg_all: 1.1,
      top1: 2.0,
      b05: 1.8,
      b10: 1.5,
      b15: 1.4,
      b20: 1.3,
      b30: 1.2,
      b40: 1.15,
      b50: 1.1,
    },
    top: [
      { authority: "MockOrecom1111111111111111111111111111111", lifetime_deployed: "1000000000000", lifetime_rewards_sol: "1200000000000", lifetime_rewards_ore: "100000000000", net_sol: "200000000000", roi: 1.2, is_ours: false, service: tag("orecom") },
      { authority: "MockOrestack11111111111111111111111111111", lifetime_deployed: "800000000000", lifetime_rewards_sol: "900000000000", lifetime_rewards_ore: "80000000000", net_sol: "100000000000", roi: 1.125, is_ours: false, service: tag("orestack") },
      { authority: "MockIndependent11111111111111111111111", lifetime_deployed: "500000000000", lifetime_rewards_sol: "550000000000", lifetime_rewards_ore: "50000000000", net_sol: "50000000000", roi: 1.1, is_ours: false, service: null },
    ],
    our_pool: null,
    our_miner: "",
    total: 3,
    net_positive_pct: 1,
    ore_sol_ratio: 0.8,
    limit: 50,
    offset: 0,
  });
}
