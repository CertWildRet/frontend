"use client";

import { useVaultData } from "@/hooks/useVaultData";
import { useUserPosition } from "@/hooks/useUserPosition";
import { useStats } from "@/hooks/useStats";
import { PoolStats } from "@/components/PoolStats";
import { PoolEconomics } from "@/components/PoolEconomics";
import { PhaseTimers } from "@/components/PhaseTimers";
import { MintCwrCard } from "@/components/MintCwrCard";
import { ClaimCard } from "@/components/ClaimCard";
import { SettlePrompt } from "@/components/SettlePrompt";
import { PositionCard } from "@/components/PositionCard";
import { LiveCrankPanel } from "@/components/LiveCrankPanel";
import { StatusBadge } from "@/components/StatusBadge";

export default function CrankPage() {
  const { data, refresh } = useVaultData();
  const { pos, refresh: refreshPos } = useUserPosition(data?.totalShares ?? 0);
  const stats = useStats();

  const onDone = () => {
    refresh();
    refreshPos();
  };

  const phaseBadge = !data?.initialized
    ? { status: "warn" as const, label: "not live" }
    : data.paused
      ? { status: "down" as const, label: "paused" }
      : data.phase === 1
        ? { status: "ok" as const, label: "deposit / claim open" }
        : { status: "info" as const, label: "mining" };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">Simple Pool</h1>
            <StatusBadge status={phaseBadge.status} label={phaseBadge.label} />
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-fog-dim">
            Deposit SOL to mint CWR. A keeper mines the ORE board with it around the clock. Claim your
            SOL plus stORE whenever the window is open.
          </p>
        </div>
      </header>

      <PoolStats data={data} stats={stats} />
      <PhaseTimers data={data} />

      <PoolEconomics stats={stats} />

      <SettlePrompt data={data} onDone={onDone} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <MintCwrCard data={data} onDone={onDone} />
        <ClaimCard data={data} pos={pos} onDone={onDone} />
        <PositionCard pos={pos} />
      </div>

      <LiveCrankPanel />
    </div>
  );
}
