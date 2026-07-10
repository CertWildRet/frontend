/**
 * Analytics client: reads the off-chain analytics service (CertWildRet/analytics),
 * which reconstructs the ENTIRE on-chain history of the vault from RPC alone.
 * Native units only (lamports / ORE+stORE+ZINC atomic "grams" / shares); USD is
 * never returned. Every payload carries a `provenance` envelope (finality +
 * backfill completeness + honesty caveats). Read-only.
 */
import { ZINC_DECIMALS, SHARE_DECIMALS } from "./cwr";

// Browser calls the analytics service directly; the service allowlists this
// site's origin via CORS. No same-origin proxy.
export const ANALYTICS_URL = (
  process.env.NEXT_PUBLIC_ANALYTICS_URL || "https://analytics-mwav.onrender.com"
).replace(/\/$/, "");

/** ws(s):// origin for the analytics WebSocket (derived from the REST origin). */
export const ANALYTICS_WS_URL = `${ANALYTICS_URL.replace(/^http/, "ws")}/stream`;

export const BUCKET = { dORE: 0, dZINC: 1 } as const;
const ORE_GRAMS_PER_ORE = 1e11; // ORE / stORE: 11 decimals

// ── native-unit converters (atomic string -> decimal number) ────────────────
export const lamportsToSol = (v?: string | number | null): number =>
  v == null ? 0 : Number(BigInt(v)) / 1e9;
export const oreGramsToOre = (v?: string | number | null): number =>
  v == null ? 0 : Number(BigInt(v)) / ORE_GRAMS_PER_ORE;
export const zincGramsToZinc = (v?: string | number | null): number =>
  v == null ? 0 : Number(BigInt(v)) / 10 ** ZINC_DECIMALS;
export const sharesToNum = (v?: string | number | null): number =>
  v == null ? 0 : Number(BigInt(v)) / 10 ** SHARE_DECIMALS;
export const fracToPct = (v?: string | null): number => (v == null ? 0 : Number(v));

// ── response shapes (subset of fields we render) ────────────────────────────
export type Provenance = {
  as_of_slot: string;
  finalized_through_slot: string;
  backfill_complete: boolean;
  backfill_note: string;
  caveats: string[];
};
type Envelope<T> = { ok: boolean; data: T; provenance: Provenance };

export type PnlBucket = {
  bucket_id: number;
  exact: {
    sol_in_net_lamports: string;
    sol_in_gross_lamports: string;
    sol_out_lamports: string;
    realized_sol_pnl_lamports: string;
    store_realized_grams: string;
    zinc_realized_grams: string;
  };
  attributed: {
    sol_worked_net_lamports: string;
    sol_worked_gross_lamports: string;
    sol_won_attr_lamports: string;
    uore_rewards_accrued_grams: string;
    uore_refined_accrued_grams: string;
    zinc_accrued_grams: string;
    store_accrued_grams: string;
  };
  current: Record<string, string | number | null>;
};
export type WalletPnl = { wallet: string; buckets: PnlBucket[] };

export type WalletCycle = {
  bucket_id: number;
  cycle_id: string;
  open_ts: string | null;
  close_ts: string | null;
  settled: boolean;
  ore_join_status: string;
  wallet_shares: string;
  total_shares: string;
  share_fraction: string;
  sol_attributed_net: string;
  sol_attributed_gross: string;
  sol_recovered_attr: string | null;
  sol_pnl_attr: string | null;
  uore_rewards_accrued_grams: string;
  uore_refined_accrued_grams: string;
  zinc_accrued_grams: string;
};

export type CrankRow = {
  sig: string;
  slot: string;
  block_time: string | null;
  round_id: string;
  amount_lamports: string;
  fee_lamports: string;
  net_amount_lamports: string;
  per_square_lamports: string;
  squares_selected: number;
};
export type CycleDetail = {
  cycle: Record<string, string | number | boolean | null | string[]>;
  cranks: CrankRow[];
  checkpoints: { round_id: string; rewards_ore: string; refined_ore: string; slot: string }[];
  uore_settle: {
    claimed_sol: string;
    rewards_growth: string;
    refined_growth: string;
  } | null;
  zinc_settle: { claimed_sol: string; smelted_zinc: string; credited: string } | null;
  replenishes: { wrapped_grams: string; net_before: string }[];
  participant_count: number;
};

// ── fetchers ────────────────────────────────────────────────────────────────
const unreachable = () =>
  new Error(
    `Can't reach the analytics service (${ANALYTICS_URL}). It may be waking up (free tier) or blocking this origin (CORS) - retry in a moment.`,
  );

async function get<T>(path: string): Promise<Envelope<T>> {
  const url = `${ANALYTICS_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    console.error("[analytics] GET", url, e);
    throw unreachable();
  }
  if (!res.ok) {
    console.error("[analytics] GET", url, res.status);
    throw new Error(`Analytics request failed (${res.status}) on ${path}`);
  }
  return res.json();
}

export const fetchWalletPnl = (pubkey: string) =>
  get<WalletPnl>(`/wallet/${pubkey}/pnl`);
export const fetchWalletCycles = (pubkey: string) =>
  get<{ wallet: string; cycles: WalletCycle[] }>(`/wallet/${pubkey}/cycles`);
export const fetchCycleDetail = (bucket: number, cycleId: string | number) =>
  get<CycleDetail>(`/cycle/${cycleId}?bucket=${bucket}`);
/**
 * Per-bucket pool aggregate. All SOL fields are atomic lamports (string or number)
 * summed from on-chain events: deployed from CrankMineZincEvent (dZINC) /
 * CrankMineEvent (dORE); recovered from SettleHarvestZincEvent.claimed_sol /
 * SettleUoreEvent.claimed_sol (the measured lamport delta on the actual claim CPI).
 * net_pnl = recovered - deployed_gross. Nothing here is hardcoded.
 */
export type PoolSummary = {
  bucket_id?: number;
  sol_deployed_gross: string | number | null;
  sol_deployed_net: string | number | null;
  sol_recovered: string | number | null;
  sol_net_pnl: string | number | null;
  /** SOL actually deposited by LPs (net of deposit fee) — the capital base / cost
      basis. Unlike sol_deployed_gross, this is NOT inflated by round-to-round
      recycling, so it is the correct denominator for a true ROI. */
  total_deposited_net: string | number | null;
  total_withdrawn_sol: string | number | null;
  volume_fees: string | number | null;
  total_zinc_realized: string | number | null;
  zinc_credited: string | number | null;
  cycles: number;
  settled_cycles: number;
  current_total_shares: string | number | null;
};
export const fetchPoolSummary = (bucket: number) =>
  get<PoolSummary>(`/pool/summary?bucket=${bucket}`);
