"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCwrActions } from "@/hooks/useCwrActions";
import { useUserPending } from "@/hooks/useUserPending";
import type { VaultData } from "@/hooks/useVaultData";
import { ConnectHint } from "./ConnectHint";
import { TxResult } from "./TxResult";
import { formatNum } from "@/lib/format";
import { MIN_DEPOSIT_SOL } from "@/lib/cwr";

const QUICK = [0.1, 0.5, 1, 5, 10];

/**
 * Park card. Shown while the pool is cranking (BETTING), when normal deposits
 * are closed. Lets a user commit SOL now; it converts to dORE automatically when
 * the next claim window opens. A parked ticket can be pulled back any time.
 */
export function ParkCard({ data, onDone }: { data: VaultData | null; onDone: () => void }) {
  const { connected } = useWallet();
  const { park, cancelPark, busy } = useCwrActions();
  const { ticket, refresh } = useUserPending();
  const [amount, setAmount] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sol = Number(amount);
  const valid = sol > 0 && Number.isFinite(sol);
  const belowMin = valid && sol < MIN_DEPOSIT_SOL;

  // Park is a BETTING-phase action (phase 0). OPEN (phase 1) uses the deposit card.
  const cranking = !!data?.initialized && data.phase === 0 && !data.paused;
  const actionable = connected && cranking && valid && !belowMin && !busy;

  async function onPark() {
    setErr(null);
    setSig(null);
    try {
      const s = await park(sol);
      setSig(s);
      setAmount("");
      await refresh();
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function onCancel() {
    setErr(null);
    setSig(null);
    try {
      const s = await cancelPark();
      setSig(s);
      await refresh();
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="card card-hover flex flex-col">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Park SOL</h3>
        <span className="chip border-pos/40 text-white">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-pos align-middle" />
          while cranking
        </span>
      </div>
      <p className="mb-4 font-mono text-[12px] leading-relaxed text-fog-muted">
        Deposits are closed while the pool is mining. Park SOL now and it converts to dORE
        automatically the moment the deposit/claim window opens. Pull it back any time before then.
      </p>

      {ticket && (
        <div className="mb-4 rounded-lg border border-pos/40 bg-ink-800 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[12px] text-fog-dim">your parked SOL</span>
            <span className="num text-pos">{formatNum(ticket.amountSol, 4)} SOL</span>
          </div>
          <p className="mt-1.5 font-mono text-[12px] text-fog-muted">
            Converts to dORE at the next deposit/claim window. Or pull it back now.
          </p>
          <button
            disabled={busy}
            onClick={onCancel}
            className="mt-2.5 w-full rounded-md border border-line py-1.5 font-mono text-xs text-fog-dim transition hover:border-pos hover:text-white"
          >
            {busy ? "Confirming…" : "Cancel and withdraw parked SOL"}
          </button>
        </div>
      )}

      <span className="label mb-1.5 block">Amount (SOL)</span>
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder="0.0"
        className="w-full rounded-lg border border-line bg-ink-800 px-3 py-2.5 font-mono text-lg text-white outline-none transition focus:border-pos"
      />
      <div className="mt-2 flex gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(String(q))}
            className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-fog-dim transition hover:border-pos hover:text-white"
          >
            {q}
          </button>
        ))}
      </div>

      {belowMin && (
        <p className="mt-2 font-mono text-[12px] text-amber-400/80">Minimum is {MIN_DEPOSIT_SOL} SOL.</p>
      )}

      <div className="mt-auto pt-4">
        {!connected ? (
          <ConnectHint />
        ) : (
          <button disabled={!actionable} onClick={onPark} className="btn-primary w-full py-2.5">
            {busy ? "Confirming…" : "Park SOL"}
          </button>
        )}
      </div>

      {connected && !cranking && (
        <p className="mt-2 text-center font-mono text-[12px] text-fog-muted">
          {data?.paused
            ? "Pool paused."
            : !data?.initialized
              ? "Pool not live yet."
              : "The deposit/claim window is open. Use Mint dORE to deposit directly."}
        </p>
      )}

      <TxResult sig={sig} err={err} successLabel="Parked SOL" />
    </div>
  );
}
