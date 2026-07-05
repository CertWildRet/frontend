"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useZincActions } from "@/hooks/useZincActions";
import { usePhaseClock, fmtCountdown } from "@/hooks/usePhaseClock";
import type { ZincPoolStats } from "@/lib/cwr";
import { ConnectHint } from "@/components/ConnectHint";
import { TxResult } from "@/components/TxResult";
import { formatNum } from "@/lib/format";
import { MIN_DEPOSIT_SOL } from "@/lib/cwr";

const QUICK = [0.1, 0.5, 1, 5, 10];

export function MintZincCard({ data, onDone }: { data: ZincPoolStats | null; onDone: () => void }) {
  const { connected } = useWallet();
  const { deposit, busy } = useZincActions();
  const clock = usePhaseClock(data);
  const [amount, setAmount] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sol = Number(amount);
  const valid = sol > 0 && Number.isFinite(sol);
  const belowMin = valid && sol < MIN_DEPOSIT_SOL;
  // Quote at the SOL leg the contract will actually price against: mid-cycle
  // the pool's won SOL sits unswept on the ZINC profile (wonClaimableSol) and
  // sol_in_vault alone under-reads — deposit_zinc executes only in the settled
  // OPEN window, AFTER settle_harvest_zinc swept that SOL in. Same fix as the
  // dORE mint quote (which read ~0 and quoted millions of shares for dust).
  const trueSolLeg = (data?.solInVaultSol ?? 0) + (data?.wonClaimableSol ?? 0);
  const navPerShare =
    data && data.totalShares > 0 && trueSolLeg > 0
      ? trueSolLeg / data.totalShares
      : 1; // empty pool: the contract mints 1:1
  const estShares = valid ? sol / navPerShare : 0;

  const windowOpen = !!data?.initialized && data.phase === 1 && data.windowSettled && !data.paused;
  const actionable = connected && windowOpen && valid && !belowMin && !busy;

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
    <div className="card card-hover flex flex-col">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Mint dZINC</h3>
        <span className="chip border-gold/30 text-gold">deposit SOL</span>
      </div>
      <p className="mb-4 font-mono text-[12px] leading-relaxed text-fog-muted">
        Deposit SOL to mint dZINC, your share of the pool. Withdraw any time the claim window is open.
      </p>

      <span className="label mb-1.5 block">Amount (SOL)</span>
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder="0.0"
        className="w-full rounded-lg border border-line bg-ink-800 px-3 py-2.5 font-mono text-lg text-white outline-none transition focus:border-gold"
      />
      <div className="mt-2 flex gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(String(q))}
            className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-fog-dim transition hover:border-gold hover:text-white"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-xs">
        <span className="text-fog-muted">you receive ≈</span>
        <span className="num text-gray-200">{formatNum(estShares, 4)} dZINC</span>
      </div>
      {belowMin && (
        <p className="mt-1.5 font-mono text-[12px] text-amber">
          Deposit at least {MIN_DEPOSIT_SOL} SOL.
        </p>
      )}

      <div className="mt-auto pt-4">
        {!connected ? (
          <ConnectHint />
        ) : (
          <button disabled={!actionable} onClick={onMint} className="btn-primary w-full py-2.5">
            {busy ? "Confirming…" : "Mint dZINC"}
          </button>
        )}
      </div>

      {connected && !windowOpen && (
        <p className="mt-2 text-center font-mono text-[12px] text-fog-muted">
          {data?.paused
            ? "Pool paused."
            : !data?.initialized
              ? "Pool not live yet."
              : data.phase !== 1
                ? `Deposits open in the claim window. Opens in ${fmtCountdown(clock.remainingSecs)}.`
                : "Waiting for the window to settle."}
        </p>
      )}

      <TxResult sig={sig} err={err} successLabel="Minted dZINC" />
    </div>
  );
}
