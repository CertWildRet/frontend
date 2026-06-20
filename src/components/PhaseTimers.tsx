"use client";

import { usePhaseClock, fmtCountdown } from "@/hooks/usePhaseClock";
import type { VaultData } from "@/hooks/useVaultData";

export function PhaseTimers({ data }: { data: VaultData | null }) {
  const clock = usePhaseClock(data);

  if (!data?.initialized) {
    return (
      <div className="card">
        <p className="font-mono text-sm text-fog-muted">
          Pool isn&apos;t live on-chain yet. Timers start once the Simple bucket is initialized.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="label text-fog-dim">Pool cycle</h2>
        <span className={`chip ${clock.isOpen ? "border-gold/30 text-gold" : "border-amber/30 text-amber"}`}>
          <span className={`live-dot ${clock.isOpen ? "text-gold" : "text-amber"}`} />
          {clock.isOpen ? "deposit / claim open" : "mining live"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TimerTile
          title="Deposit & Claim"
          subtitle="mint CWR or claim rewards"
          active={clock.isOpen}
          remaining={clock.isOpen ? clock.remainingSecs : null}
          progress={clock.isOpen ? clock.progress : 0}
          accent="gold"
          idleNote="opens after the mining round"
        />
        <TimerTile
          title="Cranking"
          subtitle="capital working the 25 tiles"
          active={clock.isBetting}
          remaining={clock.isBetting ? clock.remainingSecs : null}
          progress={clock.isBetting ? clock.progress : 0}
          accent="amber"
          idleNote="runs after the window closes"
        />
      </div>
      {data.paused && (
        <p className="mt-4 font-mono text-xs text-red">Pool is paused by admin. Actions disabled.</p>
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
  accent: "gold" | "amber";
  idleNote: string;
}) {
  const text = accent === "gold" ? "text-gold" : "text-amber";
  const bar = accent === "gold" ? "bg-gold" : "bg-amber";
  const glow = "shadow-glow-gold";
  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
        active ? `border-line-bright bg-ink-800/60 ${glow}` : "border-line bg-ink-900/40 opacity-55"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-display text-sm font-semibold text-white">{title}</span>
        {active ? (
          <span className={`num text-2xl font-medium ${text} text-glow-gold`}>
            {remaining !== null ? fmtCountdown(remaining) : "··"}
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-widest text-fog-muted">idle</span>
        )}
      </div>
      <p className="mt-1 font-mono text-[11px] text-fog-muted">{active ? subtitle : idleNote}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full ${bar} transition-all duration-1000 ease-linear`}
          style={{ width: `${active ? Math.round(progress * 100) : 0}%` }}
        />
      </div>
    </div>
  );
}
