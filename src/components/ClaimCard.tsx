"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCwrActions } from "@/hooks/useCwrActions";
import { usePhaseClock, fmtCountdown } from "@/hooks/usePhaseClock";
import type { VaultData } from "@/hooks/useVaultData";
import type { UserPos } from "@/hooks/useUserPosition";
import { ConnectHint } from "./ConnectHint";
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
  // The contract pays withdrawals at the FROZEN claims_window_nps snapshotted when
  // the window opened (not the live NAV/share). Use it when set (>0, i.e. an open
  // window); fall back to the live value only before the window snapshot exists.
  const frozenNps = data?.claimsWindowNps && data.claimsWindowNps > 0 ? data.claimsWindowNps : 0;
  const liveNps = data?.navPerShare && data.navPerShare > 0 ? data.navPerShare : 1;
  const estSol = claimShares * (frozenNps > 0 ? frozenNps : liveNps);

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
        <span className="chip border-gold/30 text-gold">burn dORE</span>
      </div>
      <p className="mb-4 font-mono text-[12px] leading-relaxed text-fog-muted">
        Burn dORE to take your SOL at the frozen window price, plus your pro rata stORE.
      </p>

      <div className="flex items-center justify-between gap-3 font-mono text-xs">
        <span className="min-w-0 text-fog-muted">your dORE</span>
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
        <span className="num shrink-0 whitespace-nowrap text-right text-gray-200">{formatSol(estSol, 4)} SOL + stORE</span>
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
            : "Open the claim window above to claim."}
        </p>
      )}
      {connected && shares === 0 && (
        <p className="mt-2 text-center font-mono text-[12px] text-fog-muted">No dORE to claim yet.</p>
      )}

      <TxResult sig={sig} err={err} successLabel="Claimed" />
    </div>
  );
}
