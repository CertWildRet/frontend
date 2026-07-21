"use client";

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";

export type PhaseClock = {
  phaseLabel: "OPEN" | "BETTING" | "··";
  isOpen: boolean;
  isBetting: boolean;
  /** seconds until this window is eligible to flip (0 = ready). */
  remainingSecs: number;
  totalSecs: number;
  elapsedSecs: number;
  /** progress 0..1 through the current window. */
  progress: number;
  /** human label for what comes next. */
  nextLabel: string;
};

type ClockInput = {
  initialized?: boolean;
  phase?: number;
  phaseStartedTs?: number;
  openSecs?: number;
  bettingSecs?: number;
} | null;

const EMPTY: PhaseClock = {
  phaseLabel: "··",
  isOpen: false,
  isBetting: false,
  remainingSecs: 0,
  totalSecs: 0,
  elapsedSecs: 0,
  progress: 0,
  nextLabel: "",
};

const PhaseClockNowContext = createContext<number | null>(null);

/** One 1s tick for the whole /ore surface instead of one per card/hero. */
export function PhaseClockProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return createElement(PhaseClockNowContext.Provider, { value: now }, children);
}

function computePhaseClock(d: ClockInput, now: number): PhaseClock {
  if (!d || !d.initialized || d.phase === undefined) return EMPTY;

  const isOpen = d.phase === 1;
  const total = (isOpen ? d.openSecs : d.bettingSecs) ?? 0;
  const elapsed = Math.max(0, now - (d.phaseStartedTs ?? now));
  const remaining = Math.max(0, total - elapsed);
  return {
    phaseLabel: isOpen ? "OPEN" : "BETTING",
    isOpen,
    isBetting: !isOpen,
    remainingSecs: remaining,
    totalSecs: total,
    elapsedSecs: elapsed,
    progress: total > 0 ? Math.min(1, elapsed / total) : 0,
    nextLabel: isOpen ? "Mining round begins" : "Deposit / claim window opens",
  };
}

export function usePhaseClock(d: ClockInput): PhaseClock {
  const sharedNow = useContext(PhaseClockNowContext);
  const [localNow, setLocalNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (sharedNow != null) return;
    const id = setInterval(() => setLocalNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [sharedNow]);

  return computePhaseClock(d, sharedNow ?? localNow);
}

export function fmtCountdown(secs: number): string {
  if (secs <= 0) return "00:00";
  // One consistent colon style everywhere (heroes + phase timers): MM:SS under
  // an hour, H:MM:SS at/above it. Always ticks seconds; never mixes "3h 59m"
  // letter-format with "28:36" colon-format on otherwise-identical readouts.
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
