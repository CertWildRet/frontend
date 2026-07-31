"use client";

import { useEffect, useRef } from "react";
import { ChartCard } from "@/components/stats/Charts";

export const SEARCH_MINER_PLACEHOLDER = "Paste Solana Wallet Address…";
export const ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function SearchMinerBox({
  value,
  onChange,
  onClear,
  autoFocus = false,
  inputClassName = "min-w-0 flex-1 rounded-md border border-line bg-ink-800 px-3 py-2 font-mono text-[13px] text-white placeholder:text-fog-muted focus:border-steel focus:outline-none sm:max-w-md",
}: {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  autoFocus?: boolean;
  inputClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = value.trim();
  const hasPartial = trimmed.length > 0 && !ADDRESS_RE.test(trimmed);

  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  return (
    <ChartCard title="Search Miner">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={SEARCH_MINER_PLACEHOLDER}
          aria-label="Search miner address"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className={inputClassName}
        />
        {trimmed && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded border border-line px-2.5 py-1.5 text-[12px] transition-colors hover:border-steel hover:text-white"
          >
            clear
          </button>
        )}
      </div>
      {hasPartial && (
        <p className="mt-4 font-mono text-[13px] text-fog-muted">
          Enter a full Solana address (32–44 characters) to load the miner panel.
        </p>
      )}
    </ChartCard>
  );
}
