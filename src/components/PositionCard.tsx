"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import type { UserPos } from "@/hooks/useUserPosition";
import { ConnectHint } from "./ConnectHint";
import { formatNum, formatSol } from "@/lib/format";

export function PositionCard({ pos }: { pos: UserPos | null }) {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="card flex flex-col">
        <div>
          <h3 className="font-display text-base font-semibold text-white">Your position</h3>
          <p className="mt-1 font-mono text-[12px] text-fog-muted">Connect a wallet to see your CWR.</p>
        </div>
        <div className="mt-auto pt-4">
          <ConnectHint />
        </div>
      </div>
    );
  }

  const shares = pos?.shares ?? 0;
  return (
    <div className="card">
      <h3 className="mb-4 font-display text-base font-semibold text-white">Your position</h3>
      <div className="flex flex-col gap-3">
        <Metric label="CWR held" value={formatNum(shares, 4)} />
        <Metric label="Value" value={`${formatSol(pos?.valueSol ?? 0, 4)}`} unit="SOL" />
        <Metric label="Pool share" value={`${formatNum(pos?.poolSharePct ?? 0, 2)}%`} />
      </div>
      {shares === 0 && (
        <p className="mt-4 font-mono text-[12px] text-fog-muted">
          No CWR yet. Mint some during the deposit window to start earning.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#9DB7D8]/25 bg-gradient-to-b from-[#9DB7D8]/[0.09] to-[#9DB7D8]/[0.02] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(157,183,216,0.22),0_3px_10px_-3px_rgba(0,0,0,0.7)]">
      <span className="label">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="num text-lg text-white">{value}</span>
        {unit && <span className="font-mono text-[12px] text-fog-muted">{unit}</span>}
      </span>
    </div>
  );
}
