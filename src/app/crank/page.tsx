"use client";

import { useVaultData } from "@/hooks/useVaultData";
import { useUserPosition } from "@/hooks/useUserPosition";
import { PoolStats } from "@/components/PoolStats";
import { PhaseTimers } from "@/components/PhaseTimers";
import { MintCwrCard } from "@/components/MintCwrCard";
import { ClaimCard } from "@/components/ClaimCard";
import { PositionCard } from "@/components/PositionCard";
import { LiveCrankPanel } from "@/components/LiveCrankPanel";
import { StatusBadge } from "@/components/StatusBadge";

export default function CrankPage() {
  const { data, refresh } = useVaultData();
  const { pos, refresh: refreshPos } = useUserPosition(data?.totalShares ?? 0);

  const onDone = () => {
    refresh();
    refreshPos();
  };

  const phaseBadge = !data?.initialized
    ? { status: "warn" as const, label: "Not live" }
    : data.paused
      ? { status: "down" as const, label: "Paused" }
      : data.phase === 1
        ? { status: "ok" as const, label: "Deposit / Claim open" }
        : { status: "info" as const, label: "Mining" };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">Simple Pool</h1>
            <StatusBadge status={phaseBadge.status} label={phaseBadge.label} />
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-gray-400">
            Deposit SOL to mint CWR. A 24/7 crank mines the ORE board with it; claim your SOL +
            stORE whenever the window&apos;s open.
          </p>
        </div>
      </header>

      <PoolStats data={data} />

      <PhaseTimers data={data} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <MintCwrCard data={data} onDone={onDone} />
        <ClaimCard data={data} pos={pos} onDone={onDone} />
        <PositionCard pos={pos} />
      </div>

      <LiveCrankPanel />
    </div>
  );
}
