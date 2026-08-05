/**
 * platformHealth — derive ingest/provenance health metrics and run the
 * on-demand live sample that compares analytics vs the on-chain Round PDA.
 *
 * Pure wrappers over existing fetchers (oreStats + oreRoundOnchain); no new
 * backend. See /platform-health.
 */
import type { Connection } from "@solana/web3.js";
import {
  fetchOreRound,
  fetchOreParticipants,
  lamportsToSol,
  roundTileDeployRange,
  ORE_TILE_COUNT,
  type OreProvenance,
  type OreRound,
  type OreRoundDetail,
} from "@/lib/oreStats";
import { fetchOnchainRoundTiles } from "@/lib/oreRoundOnchain";

export type HealthMetrics = {
  ingestEnabled: boolean;
  spineTip: number;
  cumulativeThrough: number | null;
  /** spineTip − cumulativeThrough: how far the cumulative pass trails the spine.
   *  NOT the deploy-event frontier — that is per-round (see the live sample). */
  cumulativeLag: number | null;
  resetTailLastRound: number | null;
  censusSnapshotTs: string | null;
  caveats: string[];
  /** Fill quality over the last N settled spine rows. */
  recentFill: {
    sampled: number;
    settled: number;
    withMiners: number;
    withTileSpread: number;
  } | null;
};

const num = (v: string | number | null | undefined): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function deriveHealthMetrics(
  provenance: OreProvenance,
  roundsPage: { rounds: OreRound[] } | null,
): HealthMetrics {
  const spineTip = num(provenance.ore_max_round) ?? 0;
  const cumulativeThrough = num(provenance.ore_cumulative_through_round);

  let recentFill: HealthMetrics["recentFill"] = null;
  const rows = roundsPage?.rounds ?? [];
  if (rows.length) {
    const settledRows = rows.filter((r) => r.winning_tile != null);
    recentFill = {
      sampled: rows.length,
      settled: settledRows.length,
      withMiners: settledRows.filter((r) => num(r.total_miners) != null && num(r.total_miners)! > 0).length,
      withTileSpread: settledRows.filter((r) => roundTileDeployRange(r) != null).length,
    };
  }

  return {
    ingestEnabled: provenance.ingest_enabled,
    spineTip,
    cumulativeThrough,
    cumulativeLag: cumulativeThrough != null ? spineTip - cumulativeThrough : null,
    resetTailLastRound: num(provenance.reset_tail_last_round),
    censusSnapshotTs: provenance.census_snapshot_ts,
    caveats: provenance.caveats ?? [],
    recentFill,
  };
}

export type LiveSampleResult = {
  roundId: number;
  tip: number;
  lagBehindTip: number;
  analytics: {
    roundPresent: boolean;
    tileColumns: number;
    totalDeployedSol: number | null;
    totalMiners: number | null;
    winningTile: number | null;
  };
  participants: {
    hasParticipants: boolean;
    reason?: string;
    participantsTotal: number | null;
    deployFrontier: number | null;
  };
  onchain: {
    missing: boolean;
    totalDeployedSol: number;
    totalMiners: number;
    winningTile: number | null;
  } | null;
  deltas: {
    deployedSol: number | null; // analytics − onchain
    miners: number | null;
  } | null;
  status: "ok" | "partial" | "missing" | "unreachable";
  errors: string[];
};

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export async function runLiveSample(
  connection: Connection,
  tip: number,
  roundId?: number,
): Promise<LiveSampleResult> {
  const id = Math.max(1, Math.floor(roundId ?? tip - 1));
  const errors: string[] = [];

  const [roundR, partsR, chainR] = await Promise.allSettled([
    fetchOreRound(id),
    fetchOreParticipants(id, "deployed", 1), // top=1 — participants_total is unaffected by the slice
    fetchOnchainRoundTiles(connection, id),
  ]);

  // Analytics round detail. A 404 is a real answer ("analytics has no row"),
  // not unreachability — only non-404 failures count as the service being down.
  let detail: OreRoundDetail | null = null;
  let analyticsDown = false;
  if (roundR.status === "fulfilled") {
    detail = roundR.value.data.round;
  } else if (/404/.test(msg(roundR.reason))) {
    errors.push(`analytics round: 404 (no row for #${id})`);
  } else {
    analyticsDown = true;
    errors.push(`analytics round: ${msg(roundR.reason)}`);
  }

  let tileColumns = 0;
  if (detail) {
    for (let i = 0; i < ORE_TILE_COUNT; i++) {
      if (detail[`deployed_${i}`] != null) tileColumns++;
    }
  }
  const analytics: LiveSampleResult["analytics"] = {
    roundPresent: detail != null,
    tileColumns,
    totalDeployedSol: detail?.total_deployed != null ? lamportsToSol(detail.total_deployed) : null,
    totalMiners: detail?.total_miners != null ? Number(detail.total_miners) : null,
    winningTile: detail?.winning_tile ?? null,
  };

  const participants: LiveSampleResult["participants"] =
    partsR.status === "fulfilled"
      ? {
          hasParticipants: partsR.value.data.has_participants,
          reason: partsR.value.data.reason,
          participantsTotal: partsR.value.data.participants_total ?? null,
          deployFrontier: partsR.value.data.deploy_frontier ?? null,
        }
      : { hasParticipants: false, reason: `fetch failed: ${msg(partsR.reason)}`, participantsTotal: null, deployFrontier: null };
  if (partsR.status === "rejected") errors.push(`participants: ${msg(partsR.reason)}`);

  // On-chain: fetchOnchainRoundTiles resolves {missing:true} for a reclaimed
  // account and only rejects on RPC/decode failure — so `null` here means "could
  // not look", while missing:true means "looked, the PDA is gone".
  const onchain = chainR.status === "fulfilled" ? chainR.value : null;
  if (chainR.status === "rejected") errors.push(`on-chain: ${msg(chainR.reason)}`);

  const deltas =
    onchain && !onchain.missing && analytics.roundPresent
      ? {
          deployedSol:
            analytics.totalDeployedSol != null ? analytics.totalDeployedSol - onchain.totalDeployedSol : null,
          miners: analytics.totalMiners != null ? analytics.totalMiners - onchain.totalMiners : null,
        }
      : null;

  let status: LiveSampleResult["status"];
  const chainHasData = onchain != null && !onchain.missing && onchain.totalDeployedSol > 0;
  if (analyticsDown) {
    status = "unreachable";
  } else if (!analytics.roundPresent) {
    status = "missing"; // analytics empty — whether or not the chain still has it
  } else if (
    participants.hasParticipants &&
    tileColumns >= 20 &&
    (chainHasData || onchain == null || onchain.missing)
  ) {
    // Chain missing/reclaimed (or unreadable) with complete analytics is still
    // OK — outliving the PDA is the entire point of indexing.
    status = "ok";
  } else {
    status = "partial";
  }

  return {
    roundId: id,
    tip,
    lagBehindTip: tip - id,
    analytics,
    participants,
    onchain,
    deltas,
    status,
    errors,
  };
}
