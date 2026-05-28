// Thin fetch wrapper. Every call resolves against `NEXT_PUBLIC_BACKEND_URL`.
// When the env var is unset or the backend is offline, returns a typed
// "mock" payload so the UI is still navigable in local dev.

import type {
  BucketSummary,
  BrainStatus,
  OreRoundState,
  UserPosition,
  BucketKind,
} from "./types";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  if (!BASE) return fallback;
  try {
    const res = await fetch(`${BASE}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

// ── Buckets ──────────────────────────────────────────────────────────────

// V5 default: 100 bps entry + 100 bps exit, both enabled. Performance fee
// kept on each bucket for backwards-compat but expected to be 0 going forward.
const V5_DEFAULT_ENTRY_BPS = 100;
const V5_DEFAULT_EXIT_BPS = 100;

const MOCK_BUCKETS: BucketSummary[] = [
  {
    kind: "simple",
    label: "Simple",
    lockupDays: 0,
    performanceFeeBps: 0,
    entryFeeBps: V5_DEFAULT_ENTRY_BPS,
    exitFeeBps: V5_DEFAULT_EXIT_BPS,
    entryFeeEnabled: true,
    exitFeeEnabled: true,
    headlineApy: "~290% target / 19% realistic at 1k SOL TVL",
    maxDrawdownPct: 10,
    totalNavSol: 0,
    navPerShare: 1,
    totalShares: 0,
    acceptingDeposits: true,
    strategyBlurb:
      "Selective mining on the ORE table. Deploys only when our exact-EV math says the round is profitable. Withdraw anytime.",
  },
  {
    kind: "refined",
    label: "Refined",
    lockupDays: 7,
    performanceFeeBps: 0,
    entryFeeBps: V5_DEFAULT_ENTRY_BPS,
    exitFeeBps: V5_DEFAULT_EXIT_BPS,
    entryFeeEnabled: true,
    exitFeeEnabled: true,
    headlineApy: "~76% realistic at 1k SOL TVL",
    maxDrawdownPct: 9,
    totalNavSol: 0,
    navPerShare: 1,
    totalShares: 0,
    acceptingDeposits: true,
    strategyBlurb:
      "Same selective mining as Simple, plus a small motherlode-lottery quota and held-ORE refining bonus. 7-day lockup.",
  },
  {
    kind: "ultra",
    label: "Ultra",
    lockupDays: 30,
    performanceFeeBps: 0,
    entryFeeBps: V5_DEFAULT_ENTRY_BPS,
    exitFeeBps: V5_DEFAULT_EXIT_BPS,
    entryFeeEnabled: true,
    exitFeeEnabled: true,
    headlineApy: "~290% at 1k SOL pilot / ~32% at 10k SOL realistic",
    maxDrawdownPct: 14,
    totalNavSol: 0,
    navPerShare: 1,
    totalShares: 0,
    acceptingDeposits: true,
    strategyBlurb:
      "Full V3 stack: selective mining + 20%-budget motherlode lottery + SOL buffer policy + LST yield stack on idle capital. 30-day lockup.",
  },
];

export async function getBuckets(): Promise<BucketSummary[]> {
  return fetchJson<BucketSummary[]>("/api/buckets", MOCK_BUCKETS);
}

export async function getBucket(kind: BucketKind): Promise<BucketSummary | null> {
  const all = await getBuckets();
  return all.find((b) => b.kind === kind) ?? null;
}

// ── Brain health ─────────────────────────────────────────────────────────

const MOCK_STATUS: BrainStatus = {
  startedAt: 0,
  uptimeMs: 0,
  lastRound: null,
  lastNavReport: {},
  lastPush: {},
  bufferEvents: {},
  roundsSeen: 0,
};

export async function getBrainStatus(): Promise<BrainStatus> {
  return fetchJson<BrainStatus>("/status", MOCK_STATUS);
}

// ── ORE round state ──────────────────────────────────────────────────────

const MOCK_ROUND: OreRoundState = {
  roundId: "0",
  motherlodePoolOre: 0,
  totalDeployedSol: 0,
  totalMiners: 0,
  perTileSol: Array.from({ length: 25 }, () => 0),
  perTileCount: Array.from({ length: 25 }, () => 0),
};

export async function getRoundState(): Promise<OreRoundState> {
  return fetchJson<OreRoundState>("/api/round-state", MOCK_ROUND);
}

// ── User position (placeholder — wallet integration in v2) ───────────────

export async function getUserPosition(wallet: string): Promise<UserPosition | null> {
  if (!wallet) return null;
  const empty = {
    shares: 0,
    valueSol: 0,
    pendingWithdrawShares: 0,
    stOreBalance: 0,
    dcaStoreBaseline: 0,
    outperformanceMultiplier: 1,
  };
  return fetchJson<UserPosition | null>(
    `/api/user/${encodeURIComponent(wallet)}`,
    {
      wallet,
      perBucket: {
        simple: { ...empty },
        refined: { ...empty },
        ultra: { ...empty },
      },
    },
  );
}

// ── Health check ────────────────────────────────────────────────────────

export async function isBackendReachable(): Promise<boolean> {
  if (!BASE) return false;
  try {
    const res = await fetch(`${BASE}/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const BACKEND_BASE_URL = BASE;
