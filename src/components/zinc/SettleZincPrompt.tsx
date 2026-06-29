"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useZincActions } from "@/hooks/useZincActions";
import type { ZincPoolStats } from "@/lib/cwr";
import { ConnectHint } from "@/components/ConnectHint";
import { TxResult } from "@/components/TxResult";

/**
 * Shown only when the dZINC claim window is OPEN but not yet settled
 * (window_settled=false). settle_harvest_zinc is a permissionless USER action -
 * the first visitor to run it claims the mined round's SOL and smelts the
 * accrued ZINC (-10%) into custody, then flips window_settled=true, unlocking
 * deposits + claims for everyone this window. Mirrors the dORE SettlePrompt.
 */
export function SettleZincPrompt({ data, onDone }: { data: ZincPoolStats | null; onDone: () => void }) {
  const { connected } = useWallet();
  const { settle, busy } = useZincActions();
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const needsSettle =
    !!data?.initialized && data.phase === 1 && !data.windowSettled && !data.paused;
  if (!needsSettle) return null;

  async function onSettle() {
    setErr(null);
    setSig(null);
    try {
      const s = await settle();
      setSig(s);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="card border-gold/40">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Open the claim window</h3>
        <span className="chip border-gold/30 text-gold">first action</span>
      </div>
      <p className="mb-4 font-mono text-[12px] leading-relaxed text-fog-muted">
        The window just opened. The first action settles the mined round (claiming its SOL and
        smelting the ZINC into custody), which unlocks deposits and claims for everyone. Anyone can
        run it; you only pay the network fee.
      </p>
      {!connected ? (
        <ConnectHint />
      ) : (
        <button disabled={busy} onClick={onSettle} className="btn-primary w-full py-2.5">
          {busy ? "Opening…" : "Open claim window"}
        </button>
      )}
      <TxResult sig={sig} err={err} successLabel="Claim window opened" />
    </div>
  );
}
