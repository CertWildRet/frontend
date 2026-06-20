"use client";

import { useEffect, useState } from "react";

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

export function usePhaseClock(d: ClockInput): PhaseClock {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

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

export function fmtCountdown(secs: number): string {
  if (secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
