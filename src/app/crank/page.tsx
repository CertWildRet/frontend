"use client";

import { useVaultData } from "@/hooks/useVaultData";
import { useUserPosition } from "@/hooks/useUserPosition";
import { useStats } from "@/hooks/useStats";
import { PoolStats } from "@/components/PoolStats";
import { PoolEconomics } from "@/components/PoolEconomics";
import { PhaseTimers } from "@/components/PhaseTimers";
import { MintCwrCard } from "@/components/MintCwrCard";
import { ParkCard } from "@/components/ParkCard";
import { ClaimCard } from "@/components/ClaimCard";
import { SettlePrompt } from "@/components/SettlePrompt";
import { PositionCard } from "@/components/PositionCard";
import { LiveCrankPanel } from "@/components/LiveCrankPanel";

export default function CrankPage() {
  const { data, refresh } = useVaultData();
  const { pos, refresh: refreshPos } = useUserPosition(data?.totalShares ?? 0);
  const stats = useStats();

  const onDone = () => {
    refresh();
    refreshPos();
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Simple Pool</h1>
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
        {data?.phase === 0 ? (
          <ParkCard data={data} onDone={onDone} />
        ) : (
          <MintCwrCard data={data} onDone={onDone} />
        )}
        <ClaimCard data={data} pos={pos} onDone={onDone} />
        <PositionCard pos={pos} />
      </div>

      <LiveCrankPanel />
    </div>
  );
}
