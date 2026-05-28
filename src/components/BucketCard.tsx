import type { BucketSummary } from "@/lib/types";
import { formatNum, formatSol } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

const KIND_STYLES = {
  simple: {
    accent: "border-l-accent-simple",
    pill: "bg-accent-simple/10 text-accent-simple ring-accent-simple/30",
    title: "🟢 Simple",
  },
  refined: {
    accent: "border-l-accent-refined",
    pill: "bg-accent-refined/10 text-accent-refined ring-accent-refined/30",
    title: "🟡 Refined",
  },
  ultra: {
    accent: "border-l-accent-ultra",
    pill: "bg-accent-ultra/10 text-accent-ultra ring-accent-ultra/30",
    title: "🔴 Ultra",
  },
} as const;

export function BucketCard({ bucket }: { bucket: BucketSummary }) {
  const style = KIND_STYLES[bucket.kind];
  return (
    <div className={`card card-hover border-l-4 ${style.accent} space-y-5`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">{style.title}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted">
            {bucket.lockupDays === 0
              ? "Withdraw anytime"
              : `${bucket.lockupDays}-day lockup`}
          </div>
        </div>
        {bucket.acceptingDeposits ? (
          <StatusBadge status="ok" label="Open" />
        ) : (
          <StatusBadge status="warn" label="Paused" />
        )}
      </div>

      <p className="text-sm text-gray-300 leading-relaxed">
        {bucket.strategyBlurb}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="stat-label">Target APY</div>
          <div className="mt-1 font-mono text-sm text-white">
            {bucket.headlineApy}
          </div>
        </div>
        <div>
          <div className="stat-label">Max DD (backtest)</div>
          <div className="mt-1 font-mono text-sm text-white">
            {bucket.maxDrawdownPct}%
          </div>
        </div>
        <div>
          <div className="stat-label">Vault NAV</div>
          <div className="mt-1 font-mono text-sm text-white">
            {formatSol(bucket.totalNavSol)} SOL
          </div>
        </div>
        <div>
          <div className="stat-label">Entry / exit fee</div>
          <div className="mt-1 font-mono text-sm text-white">
            {bucket.entryFeeEnabled
              ? `${(bucket.entryFeeBps / 100).toFixed(2)}%`
              : "—"}
            {" / "}
            {bucket.exitFeeEnabled
              ? `${(bucket.exitFeeBps / 100).toFixed(2)}%`
              : "—"}
          </div>
        </div>
        <div>
          <div className="stat-label">Performance fee</div>
          <div className="mt-1 font-mono text-sm text-white">
            {bucket.performanceFeeBps > 0
              ? `${(bucket.performanceFeeBps / 100).toFixed(0)}%`
              : "—"}
          </div>
        </div>
        <div>
          <div className="stat-label">NAV / share</div>
          <div className="mt-1 font-mono text-sm text-white">
            {bucket.navPerShare.toFixed(6)}
          </div>
        </div>
        <div>
          <div className="stat-label">Shares outstanding</div>
          <div className="mt-1 font-mono text-sm text-white">
            {formatNum(bucket.totalShares)}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          disabled={!bucket.acceptingDeposits}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ring-1 ring-inset ${style.pill} transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Deposit
        </button>
        <button className="rounded-md bg-bg-elevated px-3 py-2 text-sm text-gray-200 ring-1 ring-inset ring-bg-border hover:bg-bg-border">
          Details
        </button>
      </div>
    </div>
  );
}
