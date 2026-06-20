"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import type { UserPos } from "@/hooks/useUserPosition";
import { WalletButton } from "./WalletButton";
import { formatNum, formatSol } from "@/lib/format";

export function PositionCard({ pos }: { pos: UserPos | null }) {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="card flex flex-col items-start gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Your position</h3>
          <p className="mt-1 text-xs text-muted">Connect a wallet to see your CWR.</p>
        </div>
        <WalletButton />
      </div>
    );
  }

  const shares = pos?.shares ?? 0;
  return (
    <div className="card">
      <h3 className="mb-4 text-base font-semibold text-white">Your position</h3>
      <div className="grid grid-cols-3 gap-4">
        <Metric label="CWR held" value={formatNum(shares, 4)} />
        <Metric label="Value" value={`${formatSol(pos?.valueSol ?? 0, 4)} SOL`} />
        <Metric label="Pool share" value={`${formatNum(pos?.poolSharePct ?? 0, 2)}%`} />
      </div>
      {shares === 0 && (
        <p className="mt-4 text-xs text-muted">
          No CWR yet — mint some during the deposit window to start earning.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value mt-1">{value}</div>
    </div>
  );
}
