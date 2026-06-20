"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCwrActions } from "@/hooks/useCwrActions";
import { usePhaseClock, fmtCountdown } from "@/hooks/usePhaseClock";
import type { VaultData } from "@/hooks/useVaultData";
import { WalletButton } from "./WalletButton";
import { TxResult } from "./TxResult";
import { formatNum } from "@/lib/format";

const QUICK = [0.1, 0.5, 1, 5];

export function MintCwrCard({ data, onDone }: { data: VaultData | null; onDone: () => void }) {
  const { connected } = useWallet();
  const { deposit, busy } = useCwrActions();
  const clock = usePhaseClock(data);
  const [amount, setAmount] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sol = Number(amount);
  const valid = sol > 0 && Number.isFinite(sol);
  const navPerShare = data?.navPerShare && data.navPerShare > 0 ? data.navPerShare : 1;
  const estShares = valid ? sol / navPerShare : 0;

  const windowOpen = !!data?.initialized && data.phase === 1 && data.windowSettled && !data.paused;
  const actionable = connected && windowOpen && valid && !busy;

  async function onMint() {
    setErr(null);
    setSig(null);
    try {
      const s = await deposit(sol);
      setSig(s);
      setAmount("");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="card flex flex-col">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Mint CWR</h3>
        <span className="badge bg-accent-simple/15 text-accent-simple">deposit SOL</span>
      </div>
      <p className="mb-4 text-xs text-muted">
        Deposit SOL to mint CWR — your share of the pool. Withdraw anytime the claim window is open.
      </p>

      <label className="stat-label mb-1.5 block">Amount (SOL)</label>
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.0"
          className="w-full rounded-md border border-bg-border bg-bg px-3 py-2 font-mono text-white outline-none focus:border-accent-simple"
        />
      </div>
      <div className="mt-2 flex gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(String(q))}
            className="rounded-md border border-bg-border px-2.5 py-1 text-xs text-gray-300 hover:border-accent-simple hover:text-white"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted">You receive ≈</span>
        <span className="font-mono text-gray-200">{formatNum(estShares, 4)} CWR</span>
      </div>

      <div className="mt-4">
        {!connected ? (
          <WalletButton />
        ) : (
          <button
            disabled={!actionable}
            onClick={onMint}
            className="w-full rounded-md bg-accent-simple px-4 py-2.5 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:bg-bg-elevated disabled:text-muted"
          >
            {busy ? "Confirming…" : "Mint CWR"}
          </button>
        )}
      </div>

      {connected && !windowOpen && (
        <p className="mt-2 text-center text-xs text-muted">
          {data?.paused
            ? "Pool paused."
            : !data?.initialized
              ? "Pool not live yet."
              : data.phase !== 1
                ? `Deposits open in the claim window — opens in ${fmtCountdown(clock.remainingSecs)}.`
                : "Window settling — open in a moment."}
        </p>
      )}

      <TxResult sig={sig} err={err} successLabel="Minted CWR" />
    </div>
  );
}
