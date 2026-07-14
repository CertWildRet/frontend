"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQueuedExit } from "@/hooks/useQueuedExit";
import { ConnectHint } from "./ConnectHint";
import { TxResult } from "./TxResult";
import { formatNum } from "@/lib/format";

/**
 * Queue-exit card (v1.5.0). Works in ANY phase: shares are escrowed now (they
 * keep earning) and the exit executes automatically in the next claim window
 * at that window's frozen price - identical to claiming live there, without
 * racing the 30-second window. A queued exit shows as "Claim Queued" and can
 * be cancelled any time before it executes.
 */
export function QueueExitCard({
  zinc = false,
  onDone,
}: {
  zinc?: boolean;
  onDone?: () => void;
}) {
  const { connected } = useWallet();
  const { ticket, queue, cancel, busy } = useQueuedExit(zinc);
  const [amount, setAmount] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const shares = Number(amount);
  const valid = shares > 0 && Number.isFinite(shares);
  const token = zinc ? "dZINC" : "dORE";

  async function onQueue() {
    setErr(null);
    setSig(null);
    try {
      const s = await queue(shares);
      setSig(s);
      setAmount("");
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function onCancel() {
    setErr(null);
    setSig(null);
    try {
      const s = await cancel();
      setSig(s);
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className="card">
      <header className="card-head">
        <h3>Queue exit</h3>
        <p className="hint">
          Exit without racing the claim window: queue now (any phase), it
          executes automatically at the next claim window&apos;s price. Shares
          keep earning until then. Cancel any time.
        </p>
      </header>

      {ticket ? (
        <div className="queued-state">
          <div className="badge badge-live" title={`queued at ${new Date(ticket.queuedAt * 1000).toLocaleString()}`}>
            Claim Queued — {formatNum(ticket.shares)} {token}
          </div>
          <p className="hint">
            Executes automatically in the next claim window. You can top up by
            queueing more, or cancel to get the shares back.
          </p>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy || !connected}>
            {busy ? "Confirming…" : "Cancel queued exit"}
          </button>
        </div>
      ) : (
        <p className="hint">No exit queued.</p>
      )}

      <div className="field-row">
        <input
          type="number"
          min="0"
          step="any"
          placeholder={`${token} shares to queue`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
        <button className="btn btn-primary" onClick={onQueue} disabled={!connected || !valid || busy}>
          {busy ? "Confirming…" : ticket ? "Queue more" : "Queue exit"}
        </button>
      </div>

      {!connected && <ConnectHint />}
      <TxResult sig={sig} err={err} />
    </section>
  );
}
