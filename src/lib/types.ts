// Shared types — all the data shapes the frontend renders.
// Matches what the cwr-slaves/brain HTTP server (see brain/src/http.ts and
// brain/src/state.ts) exposes, plus user-facing extensions stubbed for now.

export type BucketKind = "simple" | "refined" | "ultra";

export type BucketSummary = {
  kind: BucketKind;
  /** Friendly name shown in UI. */
  label: string;
  /** Days the position is locked after deposit. 0 for Simple. */
  lockupDays: number;
  /** Performance fee in basis points (10000 = 100%). */
  performanceFeeBps: number;
  /** Headline APY (gross, before fee) — string so the brain can return ranges. */
  headlineApy: string;
  /** Worst-case max drawdown observed in V3 backtest, as %. */
  maxDrawdownPct: number;
  /** Last reported total NAV (in SOL units). */
  totalNavSol: number;
  /** Last reported NAV per share. */
  navPerShare: number;
  /** Total shares outstanding. */
  totalShares: number;
  /** Is the bucket currently accepting deposits? */
  acceptingDeposits: boolean;
  /** One-liner shown in the UI to explain what this bucket does. */
  strategyBlurb: string;
};

export type RoundOutcome = {
  ts: number;
  roundId: string | null;
  perBucket: Record<string, {
    decision: {
      kind: "skip" | "deploy";
      reason?: string;
      engine?: "A" | "B-smart";
      totalDeployLamports?: string;
    };
    txSignatures: string[];
    errors: string[];
  }>;
};

export type BufferEvent = {
  ts: number;
  heldOre: number;
  wouldSellOre: number;
  solDeficitSol: number;
};

export type BrainStatus = {
  startedAt: number;
  uptimeMs: number;
  lastRound: RoundOutcome | null;
  lastNavReport: Record<string, { ts: number; externalLamports: string }>;
  lastPush: Record<string, { ts: number; lamports: string }>;
  bufferEvents: Record<string, BufferEvent[]>;
  roundsSeen: number;
};

export type OreRoundState = {
  roundId: string;
  motherlodePoolOre: number;
  totalDeployedSol: number;
  totalMiners: number;
  /** SOL deployed per tile (length 25). May be approximate if reconstructed. */
  perTileSol: number[];
  /** Number of unique miners per tile (length 25). */
  perTileCount: number[];
};

export type UserPosition = {
  wallet: string;
  perBucket: Record<BucketKind, {
    shares: number;
    valueSol: number;
    canWithdrawAfter?: number;     // unix ts; undefined if no pending withdraw
    pendingWithdrawShares: number;
  }>;
};
