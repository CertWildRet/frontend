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
      <p className="mt-3 break-words rounded-md border border-accent-ultra/40 bg-accent-ultra/10 px-3 py-2 text-xs text-accent-ultra">
        {err}
      </p>
    );
  }
  return (
    <p className="mt-3 rounded-md border border-accent-simple/40 bg-accent-simple/10 px-3 py-2 text-xs text-accent-simple">
      {successLabel} ·{" "}
      <a href={explorerTx(sig!)} target="_blank" rel="noreferrer" className="underline">
        view tx
      </a>
    </p>
  );
}
