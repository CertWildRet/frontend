"use client";

import type { ReactNode } from "react";
import { PoolIntro } from "./PoolIntro";
import { usePhaseClock, fmtCountdown } from "@/hooks/usePhaseClock";
import { formatNum } from "@/lib/format";
import type { VaultData } from "@/hooks/useVaultData";

/**
 * The /ore hero: the 25-tile ORE board as the page centrepiece, wired to LIVE
 * dORE data - the cyan twin of the /zinc roulette hero. Full 25-tile coverage
 * (the strategy). The centre readout mirrors the live phase (BETTING => "mining"
 * + countdown; OPEN => "claim window" + countdown), plus the pool's held stORE
 * and the dORE SOL price. Renders via the shared <PoolIntro>, so it shares the
 * exact layout/feel of the ZINC hero - the only deltas are the board (a 5x5
 * grid vs a 30-tile ring), the cyan accent, and the ORE wording.
 */
export function OreBoardHero({ data }: { data: VaultData | null }) {
  const clock = usePhaseClock(data);

  const live = !!data?.initialized;
  const halted = !!data?.paused;

  let phaseTitle = "pool live";
  let phaseSub = "reading chain";
  let countdown: string | null = null;

  if (live) {
    if (halted) {
      phaseTitle = "paused";
      phaseSub = "admin pause";
    } else if (clock.isOpen) {
      phaseTitle = "claim window";
      phaseSub = "deposit / claim open";
      countdown = fmtCountdown(clock.remainingSecs);
    } else if (clock.isBetting) {
      phaseTitle = "mining";
      phaseSub = "working 25 tiles";
      countdown = fmtCountdown(clock.remainingSecs);
    }
  } else {
    phaseTitle = "···";
    phaseSub = "reading chain";
  }

  const store = data && data.storeInVaultOre > 0 ? formatNum(data.storeInVaultOre, 2) : null;
  const price = data ? formatNum(data.navPerShare, 4) : null;
  const lit = live && !halted;

  const center = (
    <div className="flex flex-col items-center px-2 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-fog-muted">{phaseSub}</span>
      <span className="mt-1 font-display text-[22px] font-bold leading-none text-white">{phaseTitle}</span>
      {countdown && (
        <span className="mt-2 font-mono text-[26px] font-medium leading-none text-gold text-glow-gold">
          {countdown}
        </span>
      )}
      <span className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[#8FD8FF]">25/25 tiles</span>
      {(store || price) && (
        <div className="mt-3 flex flex-col items-center gap-1">
          {store && (
            <span className="font-mono text-[11px] text-fog-dim">
              {store} <span className="text-fog-muted">stORE held</span>
            </span>
          )}
          {price && (
            <span className="font-mono text-[11px] text-fog-dim">
              {price} <span className="text-fog-muted">SOL / dORE</span>
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <PoolIntro
      board={<OreHeroBoard size={340} center={center} lit={lit} />}
      accentFrom="#22E0E6"
      accentTo="#5B6CFF"
      bloom="radial-gradient(circle, rgba(34,224,230,0.18), rgba(91,108,255,0.08) 45%, transparent 72%)"
      dotGlow="rgba(34,224,230,0.6)"
      tilesLabel="25 tiles"
      blurb="Every round, the keeper mines the whole 25-tile board, claim when the window opens, or hold your dORE and let it keep compounding into stORE. Disciplined: it only commits on rounds it likes."
      bullets={[
        "25/25 tiles every eligible round, full board coverage",
        "mine, claim, wrap to stORE; your dORE is a pro-rata claim on it all",
        "deposit / claim only while the window is open",
        "withdraw burns dORE for your SOL plus your pro-rata stORE",
      ]}
    />
  );
}

/**
 * The 25-tile ORE board centrepiece: a full-coverage 5x5 grid (cyan -> blue)
 * with the live phase readout floating over a circular scrim in the middle -
 * the grid analog of the ZINC roulette's ring-with-centre-readout.
 */
function OreHeroBoard({ size, center, lit }: { size: number; center: ReactNode; lit: boolean }) {
  return (
    <div className="relative max-w-full" style={{ width: size, height: size }}>
      <div className="grid h-full w-full grid-cols-5 grid-rows-5 gap-[4.5%]">
        {Array.from({ length: 25 }).map((_, i) => (
          <span
            key={i}
            className="rounded-[22%]"
            style={{
              background: lit
                ? "linear-gradient(150deg, rgba(34,224,230,0.9), rgba(91,108,255,0.85))"
                : "linear-gradient(150deg, rgba(34,224,230,0.26), rgba(91,108,255,0.22))",
              boxShadow: lit
                ? "0 0 10px rgba(34,224,230,0.28), inset 0 0 0 1px rgba(255,255,255,0.22)"
                : "inset 0 0 0 1px rgba(255,255,255,0.08)",
            }}
            aria-hidden
          />
        ))}
      </div>
      {/* centre readout on a circular dark scrim, echoing the roulette centre. */}
      <div
        className="absolute left-1/2 top-1/2 flex h-[54%] w-[54%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(7,9,18,0.97) 55%, rgba(7,9,18,0.72) 78%, transparent 100%)",
        }}
      >
        {center}
      </div>
    </div>
  );
}

export default OreBoardHero;
