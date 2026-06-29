"use client";

import { ZincRoulette } from "./ZincRoulette";
import { PoolIntro } from "../PoolIntro";
import { PoolReadout } from "../PoolReadout";
import { usePhaseClock, fmtCountdown } from "@/hooks/usePhaseClock";
import { formatNum } from "@/lib/format";
import type { ZincPoolStats } from "@/lib/cwr";

/**
 * The /zinc hero: the 30-tile roulette as the page centrepiece, wired to LIVE
 * dZINC data. Full 30-tile coverage (the strategy). The centre readout mirrors
 * the live phase (BETTING => "mining" + countdown; OPEN => "claim window" +
 * countdown), plus the pool's held smelted-ZINC and the dZINC SOL price.
 *
 * Renders via the shared <PoolIntro> so it shares the exact layout/feel of the
 * ORE hero - the only deltas are the board (a 30-tile ring vs a 5x5 grid), the
 * purple->pink accent, and the ZINC wording. Carries the full ZINC mechanics
 * bullet list (the old standalone "How ZINC works" card folded in here).
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
  let countdown: string | null = null;

  if (live) {
    if (halted) {
      phaseTitle = data?.paused ? "paused" : "halted";
    } else if (clock.isOpen) {
      phaseTitle = "claim window";
      countdown = fmtCountdown(clock.remainingSecs);
    } else if (clock.isBetting) {
      phaseTitle = "mining";
      countdown = fmtCountdown(clock.remainingSecs);
    }
  } else if (notLive) {
    phaseTitle = "pool live";
  } else {
    phaseTitle = "···";
  }

  const price = data ? formatNum(data.navPerShareSol, 4) : null;
  // Live + actively mining/claiming -> let the ring spin; halted/not-live ->
  // hold it static so the surface reads as "gated".
  const animated = live && !halted;

  const center = (
    <PoolReadout
      title={phaseTitle}
      countdown={countdown}
      tilesLabel="30/30 tiles"
      tilesTint="#C7B3FF"
      price={price ? `${price} SOL / dZINC` : null}
    />
  );

  return (
    <PoolIntro
      board={
        <ZincRoulette
          size={340}
          litTiles="all"
          animated={animated}
          className="max-w-full"
          center={center}
        />
      }
      accentFrom="#9A6BFF"
      accentTo="#FF5AC8"
      bloom="radial-gradient(circle, rgba(154,107,255,0.16), rgba(255,90,200,0.08) 45%, transparent 72%)"
      dotGlow="rgba(255,90,200,0.6)"
      tilesLabel="30 tiles"
      blurb="On rounds it mines, the keeper deploys across the whole board; claim when the window opens, or hold your dZINC (held as smelted ZINC in kind, no yield in v1). Production-cost gated: it only mines when cost-to-mine is below the live ZINC price."
      bullets={[
        "30/30 tiles every eligible round, full-board coverage",
        "mine, smelt (-10% fee), hold; your dZINC is a pro-rata claim on it all",
        "production-cost gated: mines only when cost-to-mine is below the live ZINC price",
        "v1 holds smelted ZINC in kind (staking is a planned toggle; no liquid stZINC)",
        "withdraw burns dZINC for your SOL plus your pro-rata smelted ZINC, in kind",
      ]}
    />
  );
}

export default ZincRouletteHero;
