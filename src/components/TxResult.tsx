"use client";

import { explorerTx } from "@/lib/cwr";

export function TxResult({
  sig,
  err,
  successLabel = "Confirmed",
}: {
  sig: string | null;
  err: string | null;
  successLabel?: string;
}) {
  if (!sig && !err) return null;
  if (err) {
    return (
      <p className="mt-3 break-words rounded-lg border border-red/40 bg-red/10 px-3 py-2 font-mono text-xs text-red">
        {err}
      </p>
    );
  }
  return (
    <p className="mt-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 font-mono text-xs text-gold">
      {successLabel} ·{" "}
      <a href={explorerTx(sig!)} target="_blank" rel="noreferrer" className="underline">
        view tx
      </a>
    </p>
  );
}
