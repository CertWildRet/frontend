"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCwrActions } from "@/hooks/useCwrActions";
import { usePhaseClock, fmtCountdown } from "@/hooks/usePhaseClock";
import type { VaultData } from "@/hooks/useVaultData";
import type { UserPos } from "@/hooks/useUserPosition";
import { WalletButton } from "./WalletButton";
import { TxResult } from "./TxResult";
import { formatNum, formatSol } from "@/lib/format";

export function ClaimCard({
  data,
  pos,
  onDone,
}: {
  data: VaultData | null;
  pos: UserPos | null;
  onDone: () => void;
}) {
  const { connected } = useWallet();
  const { withdraw, busy } = useCwrActions();
  const clock = usePhaseClock(data);
  const [pct, setPct] = useState(100);
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const shares = pos?.shares ?? 0;
  const claimShares = (shares * pct) / 100;
  const navPerShare = data?.navPerShare && data.navPerShare > 0 ? data.navPerShare : 1;
  const estSol = claimShares * navPerShare;

  const windowOpen = !!data?.initialized && data.phase === 1 && data.windowSettled && !data.paused;
  const actionable = connected && windowOpen && claimShares > 0 && !busy;

  async function onClaim() {
    setErr(null);
    setSig(null);
    try {
      const s = await withdraw(claimShares);
      setSig(s);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="card flex flex-col">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Claim rewards</h3>
        <span className="badge bg-accent-info/15 text-accent-info">burn CWR</span>
      </div>
      <p className="mb-4 text-xs text-muted">
        Burn CWR to withdraw your SOL at the frozen window price, plus your pro-rata stORE.
      </p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Your CWR</span>
        <span className="font-mono text-gray-200">{formatNum(shares, 4)}</span>
      </div>

      <div className="mt-3 flex gap-1.5">
        {[25, 50, 100].map((p) => (
          <button
            key={p}
            onClick={() => setPct(p)}
            className={`flex-1 rounded-md border px-2 py-1 text-xs ${
              pct === p
                ? "border-accent-info text-white"
                : "border-bg-border text-gray-300 hover:border-accent-info"
            }`}
          >
            {p === 100 ? "Max" : `${p}%`}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted">You receive ≈</span>
        <span className="font-mono text-gray-200">{formatSol(estSol, 4)} SOL + stORE</span>
      </div>

      <div className="mt-4">
        {!connected ? (
          <WalletButton />
        ) : (
          <button
            disabled={!actionable}
            onClick={onClaim}
            className="w-full rounded-md border border-accent-info px-4 py-2.5 text-sm font-semibold text-accent-info transition hover:bg-accent-info/10 disabled:cursor-not-allowed disabled:border-bg-border disabled:text-muted disabled:hover:bg-transparent"
          >
            {busy ? "Confirming…" : "Claim"}
          </button>
        )}
      </div>

      {connected && shares > 0 && !windowOpen && (
        <p className="mt-2 text-center text-xs text-muted">
          {data?.phase !== 1
            ? `Claims open in the window — opens in ${fmtCountdown(clock.remainingSecs)}.`
            : "Window settling — open in a moment."}
        </p>
      )}
      {connected && shares === 0 && (
        <p className="mt-2 text-center text-xs text-muted">No CWR to claim yet.</p>
      )}

      <TxResult sig={sig} err={err} successLabel="Claimed" />
    </div>
  );
}
