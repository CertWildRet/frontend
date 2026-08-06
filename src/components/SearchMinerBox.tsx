"use client";

import { useEffect, useRef } from "react";
import { ChartCard } from "@/components/stats/Charts";

export const SEARCH_MINER_PLACEHOLDER = "Paste Solana Wallet Address…";
export const ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// NB: never `border-line/50` — an alpha modifier on a color the theme already
// defines as rgba() doesn't compile, the class drops, and the border falls back
// to Tailwind's near-white default (the "ugly gray box"). Explicit surface blue.
const searchInputIdle =
  "border-[rgba(91,108,255,0.25)] bg-ink-900/40 text-fog-dim placeholder:text-fog-muted";
const searchInputActive =
  "focus:border-steel focus:bg-ink-800 focus:text-white focus:outline-none";
const searchInputShared =
  `min-w-0 flex-1 rounded-md border px-3 font-mono text-[13px] transition-colors ${searchInputIdle} ${searchInputActive}`;

export function SearchMinerBox({
  value,
  onChange,
  onClear,
  autoFocus = false,
  showingResults = false,
  inputClassName = `${searchInputShared} py-2 sm:max-w-md`,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  autoFocus?: boolean;
  /** Compact layout after a valid address search on /search. */
  showingResults?: boolean;
  inputClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = value.trim();
  const hasPartial = !showingResults && trimmed.length > 0 && !ADDRESS_RE.test(trimmed);
  const resultsInputClass = `${searchInputShared} py-1.5`;
  const controlsClass = showingResults
    ? "flex min-w-0 flex-1 items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted"
    : "flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted";

  useEffect(() => {
    if (!autoFocus || showingResults) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [autoFocus, showingResults]);

  const controls = (
    <div className={controlsClass}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={SEARCH_MINER_PLACEHOLDER}
        aria-label="Search miner address"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={showingResults ? resultsInputClass : inputClassName}
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
  );

  if (showingResults) {
    return (
      <ChartCard compact>
        <div className="flex items-center gap-3">
          <span className="subtext shrink-0 whitespace-nowrap">
            Showing results for:
          </span>
          {controls}
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Search Miner">
      {controls}
      {hasPartial && (
        <p className="mt-4 font-mono text-[13px] text-fog-muted">
          Enter a full Solana address (32–44 characters) to load the miner panel.
        </p>
      )}
    </ChartCard>
  );
}
