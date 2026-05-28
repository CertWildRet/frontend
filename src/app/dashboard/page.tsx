"use client";

import { useEffect, useState } from "react";
import { getUserPosition } from "@/lib/api";
import { Stat } from "@/components/Stat";
import { StatusBadge } from "@/components/StatusBadge";
import { BackendBanner } from "@/components/BackendBanner";
import { StorePerformance } from "@/components/StorePerformance";
import { formatSol, formatNum, formatTime } from "@/lib/format";
import type { UserPosition } from "@/lib/types";

const BUCKET_LABELS = {
  simple: { label: "🟢 Simple", lockup: "instant" },
  refined: { label: "🟡 Refined", lockup: "7d" },
  ultra: { label: "🔴 Ultra", lockup: "30d" },
} as const;

export default function DashboardPage() {
  const [wallet, setWallet] = useState("");
  const [pos, setPos] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    getUserPosition(wallet)
      .then(setPos)
      .finally(() => setLoading(false));
  }, [wallet]);

  return (
    <>
      <BackendBanner />

      <section className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Your position</h1>
        <p className="mt-2 text-sm text-muted">
          Connect a wallet (v2) or paste an address to view shares, NAV, and
          pending withdrawals across all three buckets.
        </p>
      </section>

      <section className="card mb-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value.trim())}
            placeholder="Paste a Solana wallet address…"
            className="flex-1 rounded-md border border-bg-border bg-bg-elevated px-4 py-2 font-mono text-sm text-white placeholder:text-muted focus:border-accent-info focus:outline-none"
          />
          <button
            disabled
            className="rounded-md bg-bg-elevated px-4 py-2 text-sm text-muted ring-1 ring-bg-border"
            title="Wallet adapter integration is v2"
          >
            Connect wallet (soon)
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          v1: paste-address read-only. v2: wallet-adapter connect + deposit /
          withdraw / claim instructions wired through the CWR SDK.
        </p>
      </section>

      {loading && (
        <p className="text-sm text-muted">Loading position…</p>
      )}

      {pos && (
        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {(Object.keys(pos.perBucket) as Array<keyof typeof BUCKET_LABELS>).map((kind) => {
              const slot = pos.perBucket[kind];
              const label = BUCKET_LABELS[kind];
              const isLocked = slot.canWithdrawAfter && slot.canWithdrawAfter * 1000 > Date.now();
              const hasShares = slot.shares > 0;
              return (
                <div key={kind} className="card space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white">
                      {label.label}
                    </h3>
                    {isLocked ? (
                      <StatusBadge status="warn" label="Locked" />
                    ) : hasShares ? (
                      <StatusBadge status="ok" label="Withdrawable" />
                    ) : (
                      <StatusBadge status="info" label="No position" />
                    )}
                  </div>
                  <div className="space-y-3">
                    <Stat label="Shares held" value={formatNum(slot.shares, 4)} />
                    <Stat
                      label="Value (SOL)"
                      value={`${formatSol(slot.valueSol)} SOL`}
                    />
                    {slot.pendingWithdrawShares > 0 && (
                      <Stat
                        label="Pending withdrawal"
                        value={`${formatNum(slot.pendingWithdrawShares, 4)} shares`}
                        hint={
                          slot.canWithdrawAfter
                            ? `claimable ${formatTime(slot.canWithdrawAfter * 1000)}`
                            : undefined
                        }
                      />
                    )}
                    <StorePerformance
                      stOreBalance={slot.stOreBalance}
                      dcaStoreBaseline={slot.dcaStoreBaseline}
                      outperformanceMultiplier={slot.outperformanceMultiplier}
                      shares={slot.shares}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      disabled
                      className="flex-1 rounded-md bg-bg-elevated px-3 py-2 text-sm text-muted ring-1 ring-bg-border disabled:cursor-not-allowed"
                    >
                      Deposit (v2)
                    </button>
                    <button
                      disabled={!hasShares}
                      className="flex-1 rounded-md bg-bg-elevated px-3 py-2 text-sm text-muted ring-1 ring-bg-border disabled:cursor-not-allowed"
                    >
                      Withdraw (v2)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!wallet && !loading && (
        <div className="card text-sm text-muted">
          Enter a wallet address above to view position details.
        </div>
      )}
    </>
  );
}
