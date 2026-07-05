"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useZincActions } from "@/hooks/useZincActions";
import { usePhaseClock, fmtCountdown } from "@/hooks/usePhaseClock";
import type { ZincPoolStats } from "@/lib/cwr";
import type { ZincPos } from "@/hooks/useZincPosition";
import { ConnectHint } from "@/components/ConnectHint";
import { TxResult } from "@/components/TxResult";
import { formatNum, formatSol } from "@/lib/format";

export function ClaimZincCard({
  data,
  pos,
  onDone,
}: {
  data: ZincPoolStats | null;
  pos: ZincPos | null;
  onDone: () => void;
}) {
  const { connected } = useWallet();
  const { withdraw, busy } = useZincActions();
  const clock = usePhaseClock(data);
  const [pct, setPct] = useState(100);
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const shares = pos?.shares ?? 0;
  const claimShares = (shares * pct) / 100;
  // The contract pays the SOL leg at the FROZEN claims_window_nps snapshotted when
  // the window opened; fall back to the live SOL/share before the snapshot exists.
  const frozenNps = data?.claimsWindowNps && data.claimsWindowNps > 0 ? data.claimsWindowNps : 0;
  // Live fallback = the SOL leg the next open_window will snapshot
  // (sol_in_vault + unswept won SOL) — sol_in_vault alone under-reads mid-cycle.
  const liveTrueSolLeg = (data?.solInVaultSol ?? 0) + (data?.wonClaimableSol ?? 0);
  const liveNps =
    data && data.totalShares > 0 && liveTrueSolLeg > 0
      ? liveTrueSolLeg / data.totalShares
      : 1;
  const estSol = claimShares * (frozenNps > 0 ? frozenNps : liveNps);
  // Pro-rata in-kind smelted ZINC paid alongside the SOL.
  const fraction = data && data.totalShares > 0 ? claimShares / data.totalShares : 0;
  const estZinc = data ? fraction * data.smeltedZincHeld : 0;

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
    <div className="card card-hover flex flex-col">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Claim rewards</h3>
        <span className="chip border-gold/30 text-gold">burn dZINC</span>
      </div>
      <p className="mb-4 font-mono text-[12px] leading-relaxed text-fog-muted">
        Burn dZINC to take your SOL at the frozen window price, plus your pro rata smelted ZINC in-kind.
      </p>

      <div className="flex items-center justify-between gap-3 font-mono text-xs">
        <span className="min-w-0 text-fog-muted">your dZINC</span>
        <span className="num shrink-0 text-gray-200">{formatNum(shares, 4)}</span>
      </div>

      <div className="mt-3 flex gap-1.5">
        {[25, 50, 100].map((p) => (
          <button
            key={p}
            onClick={() => setPct(p)}
            className={`flex-1 rounded-md border px-2 py-1.5 font-mono text-xs transition ${
              pct === p ? "border-gold text-white" : "border-line text-fog-dim hover:border-gold"
            }`}
          >
            {p === 100 ? "Max" : `${p}%`}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 font-mono text-xs">
        <span className="min-w-0 text-fog-muted">you receive ≈</span>
        <span className="num shrink-0 whitespace-nowrap text-right text-gray-200">
          {formatSol(estSol, 4)} SOL + {formatNum(estZinc, 4)} ZINC
        </span>
      </div>

      <div className="mt-auto pt-4">
        {!connected ? (
          <ConnectHint />
        ) : (
          <button
            disabled={!actionable}
            onClick={onClaim}
            className="btn-claim py-2.5"
          >
            {busy ? "Confirming…" : "Claim"}
          </button>
        )}
      </div>

      {connected && shares > 0 && !windowOpen && (
        <p className="mt-2 text-center font-mono text-[12px] text-fog-muted">
          {data?.phase !== 1
            ? `Claims open in the window. Opens in ${fmtCountdown(clock.remainingSecs)}.`
            : "Waiting for the window to settle."}
        </p>
      )}
      {connected && shares === 0 && (
        <p className="mt-2 text-center font-mono text-[12px] text-fog-muted">No dZINC to claim yet.</p>
      )}

      <TxResult sig={sig} err={err} successLabel="Claimed" />
    </div>
  );
}
