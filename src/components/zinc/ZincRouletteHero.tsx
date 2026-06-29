"use client";

import { ZincRoulette } from "./ZincRoulette";
import { usePhaseClock, fmtCountdown } from "@/hooks/usePhaseClock";
import { formatNum } from "@/lib/format";
import type { ZincPoolStats } from "@/lib/cwr";

/**
 * The /zinc hero: the 30-tile roulette as the page centrepiece, wired to LIVE
 * dZINC data. Full 30-tile coverage (the strategy). The centre readout mirrors
 * the live phase (BETTING => "mining" + countdown; OPEN => "claim window" +
 * countdown), plus the pool's held smelted-ZINC and the dZINC SOL price.
 *
 * Handles the not-yet-live / null-data case gracefully: a static full-coverage
 * ring with a "pool live, mining gated" tone.
 */
export function ZincRouletteHero({
  data,
  notLive,
}: {
  data: ZincPoolStats | null;
  notLive: boolean;
}) {
  const clock = usePhaseClock(data);

  const live = !!data?.initialized;
  const halted = !!(data?.paused || data?.ddHalt);

  // Centre readout state, derived from the live phase.
  let phaseTitle = "pool live";
  let phaseSub = "mining gated";
  let countdown: string | null = null;

  if (live) {
    if (halted) {
      phaseTitle = data?.paused ? "paused" : "halted";
      phaseSub = data?.paused ? "admin pause" : "drawdown halt";
    } else if (clock.isOpen) {
      phaseTitle = "claim window";
      phaseSub = "deposit / claim open";
      countdown = fmtCountdown(clock.remainingSecs);
    } else if (clock.isBetting) {
      phaseTitle = "mining";
      phaseSub = "working 30 tiles";
      countdown = fmtCountdown(clock.remainingSecs);
    }
  } else if (notLive) {
    phaseTitle = "pool live";
    phaseSub = "mining gated";
  } else {
    phaseTitle = "···";
    phaseSub = "reading chain";
  }

  const smelted =
    data && data.smeltedZincHeld > 0 ? formatNum(data.smeltedZincHeld, 2) : null;
  const price = data ? formatNum(data.navPerShareSol, 4) : null;
  // Live + actively mining/claiming -> let the ring spin; halted/not-live ->
  // hold it static so the surface reads as "gated".
  const animated = live && !halted;

  return (
    <div className="panel relative overflow-hidden">
      {/* faint dZINC purple->pink bloom behind the ring */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(154,107,255,0.16), rgba(255,90,200,0.08) 45%, transparent 72%)",
        }}
      />

      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
        <div className="flex justify-center">
          <ZincRoulette
            size={340}
            litTiles="all"
            animated={animated}
            className="max-w-full"
            center={
              <div className="flex flex-col items-center px-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-fog-muted">
                  {phaseSub}
                </span>
                <span className="mt-1 font-display text-[22px] font-bold leading-none text-white">
                  {phaseTitle}
                </span>
                {countdown && (
                  <span className="mt-2 font-mono text-[26px] font-medium leading-none text-gold text-glow-gold">
                    {countdown}
                  </span>
                )}
                <span className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[#C7B3FF]">
                  30/30 tiles
                </span>
                {(smelted || price) && (
                  <div className="mt-3 flex flex-col items-center gap-1">
                    {smelted && (
                      <span className="font-mono text-[11px] text-fog-dim">
                        {smelted}{" "}
                        <span className="text-fog-muted">ZINC held</span>
                      </span>
                    )}
                    {price && (
                      <span className="font-mono text-[11px] text-fog-dim">
                        {price}{" "}
                        <span className="text-fog-muted">SOL / dZINC</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            }
          />
        </div>

        <div className="text-center md:text-left">
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <span
              className="h-2 w-2 rotate-45"
              style={{
                background: "linear-gradient(135deg,#9A6BFF,#FF5AC8)",
                boxShadow: "0 0 8px rgba(255,90,200,0.6)",
              }}
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-fog-muted">
              full coverage
            </span>
          </div>
          <h2 className="mt-3 font-display text-[clamp(1.4rem,3vw,2rem)] font-bold leading-tight text-white">
            The pool covers all{" "}
            <span className="bg-gradient-to-r from-[#9A6BFF] to-[#FF5AC8] bg-clip-text text-transparent">
              30 tiles
            </span>
            .
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-fog-dim md:max-w-lg">
            Every round, the keeper deploys across the whole board, claim when the
            window opens, or hold your dZINC and let it keep earning. Production-cost
            gated: it only mines when cost-to-mine is below the live ZINC price.
          </p>
          <ul className="mt-4 space-y-1.5 font-mono text-xs text-fog-muted">
            <li>› 30/30 tiles every eligible round, 0% ruin coverage</li>
            <li>› smelt the winnings, hold them, paid in kind on withdraw</li>
            <li>› deposit / claim only while the window is open</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ZincRouletteHero;
