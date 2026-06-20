"use client";

import { usePhaseClock, fmtCountdown } from "@/hooks/usePhaseClock";
import type { VaultData } from "@/hooks/useVaultData";

/**
 * The two phase clocks: the OPEN "deposit / claim" window and the BETTING
 * "cranking" window. Exactly one is active at a time (the contract alternates).
 */
export function PhaseTimers({ data }: { data: VaultData | null }) {
  const clock = usePhaseClock(data);

  if (!data?.initialized) {
    return (
      <div className="card">
        <p className="text-sm text-muted">
          Pool isn&apos;t live on-chain yet — timers start once the Simple bucket is initialized.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-300">Pool cycle</h2>
        <span
          className={`badge ${
            clock.isOpen ? "bg-accent-simple/15 text-accent-simple" : "bg-accent-info/15 text-accent-info"
          }`}
        >
          {clock.isOpen ? "● Deposit / Claim open" : "● Mining live"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TimerTile
          title="Deposit & Claim window"
          subtitle="Mint CWR or claim rewards"
          active={clock.isOpen}
          remaining={clock.isOpen ? clock.remainingSecs : null}
          progress={clock.isOpen ? clock.progress : 0}
          accent="simple"
          idleNote="Opens after the mining round"
        />
        <TimerTile
          title="Cranking (mining)"
          subtitle="Capital deployed across 25 ORE tiles"
          active={clock.isBetting}
          remaining={clock.isBetting ? clock.remainingSecs : null}
          progress={clock.isBetting ? clock.progress : 0}
          accent="info"
          idleNote="Runs after the window closes"
        />
      </div>
      {data.paused && (
        <p className="mt-4 text-xs text-accent-ultra">Pool is paused by admin — actions disabled.</p>
      )}
    </div>
  );
}

function TimerTile({
  title,
  subtitle,
  active,
  remaining,
  progress,
  accent,
  idleNote,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  remaining: number | null;
  progress: number;
  accent: "simple" | "info";
  idleNote: string;
}) {
  const accentText = accent === "simple" ? "text-accent-simple" : "text-accent-info";
  const accentBg = accent === "simple" ? "bg-accent-simple" : "bg-accent-info";
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        active ? "border-bg-elevated bg-bg-elevated/40" : "border-bg-border bg-bg/40 opacity-60"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-white">{title}</span>
        {active ? (
          <span className={`font-mono text-lg ${accentText}`}>
            {remaining !== null ? fmtCountdown(remaining) : "—"}
          </span>
        ) : (
          <span className="text-xs text-muted">idle</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted">{active ? subtitle : idleNote}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-border">
        <div
          className={`h-full ${accentBg} transition-all duration-1000 ease-linear`}
          style={{ width: `${active ? Math.round(progress * 100) : 0}%` }}
        />
      </div>
    </div>
  );
}
