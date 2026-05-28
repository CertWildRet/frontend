import { formatNum } from "@/lib/format";

/**
 * V5 — "Buy vs Mine" stORE comparison.
 *
 * Customer prop, in numbers:
 *   - You deposited X SOL → CWR shares
 *   - At the time, X SOL bought Y stORE on the open market (DCA baseline)
 *   - Right now your shares give you a claim on Z stORE from the vault
 *   - Z / Y is your mining alpha
 *
 * Renders nothing when the user has no position (shares === 0).
 */
export function StorePerformance({
  stOreBalance,
  dcaStoreBaseline,
  outperformanceMultiplier,
  shares,
}: {
  stOreBalance: number;
  dcaStoreBaseline: number;
  outperformanceMultiplier: number;
  shares: number;
}) {
  if (shares <= 0) return null;
  const positive = outperformanceMultiplier >= 1.0;
  const multiplierStr = `${formatNum(outperformanceMultiplier, 3)}×`;
  return (
    <div className="rounded-md border border-bg-border bg-bg-elevated/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted">
          stORE performance
        </span>
        <span
          className={`font-mono text-xs ${
            positive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {positive ? "+" : ""}
          {multiplierStr}
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Buy & hold (DCA)</span>
          <span className="font-mono text-gray-300">
            {formatNum(dcaStoreBaseline, 6)} stORE
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">With CWR mining</span>
          <span
            className={`font-mono ${positive ? "text-emerald-300" : "text-rose-300"}`}
          >
            {formatNum(stOreBalance, 6)} stORE
          </span>
        </div>
      </div>
    </div>
  );
}
