"use client";

import { useZincData } from "@/hooks/useZincData";
import { useZincPosition } from "@/hooks/useZincPosition";
import { ZincStats } from "@/components/zinc/ZincStats";
import { ZincPhaseTimers } from "@/components/zinc/ZincPhaseTimers";
import { ZincEconomics } from "@/components/zinc/ZincEconomics";
import { SettleZincPrompt } from "@/components/zinc/SettleZincPrompt";
import { MintZincCard } from "@/components/zinc/MintZincCard";
import { ParkZincCard } from "@/components/zinc/ParkZincCard";
import { ClaimZincCard } from "@/components/zinc/ClaimZincCard";
import { QueueExitCard } from "@/components/QueueExitCard";
import { ZincPositionCard } from "@/components/zinc/ZincPositionCard";
import { ZincRouletteHero } from "@/components/zinc/ZincRouletteHero";
import { ZincLiveCrankPanel } from "@/components/zinc/ZincLiveCrankPanel";

/**
 * dZINC pool (bucket 1) - LIVE deposit / withdraw + read UI, mirroring the dORE
 * pool page (/ore). The value model is intentionally simpler than dORE: NO
 * miner, NO stORE oracle - recoverable value = pro-rata SOL (sol_in_vault) +
 * pro-rata in-kind smelted ZINC (zinc_in_vault), the ZINC shown as a raw amount.
 *
 * Verified ZINC mechanics (kept in the copy below):
 *   - dZINC = the pool SHARE token (minted on deposit, like dORE).
 *   - ZINC  = the mined asset (parimutuel 30-tile game).
 *   - Smelted ZINC = claimed (-10% smelt fee) ZINC the pool STAKES as stZINC and
 *                    pays pro-rata IN-KIND on withdraw (unstaked at exit). There is
 *                    no liquid stZINC token; the vault stakes it custodially.
 *   - Protocol min deploy = 0.05 SOL/round; the pool's adapter deploys full
 *                    30-tile coverage (~1.5 SOL/round, admin-tunable) for 0% ruin,
 *                    production-cost gated (mine iff cost-to-mine < ZINC price).
 *
 * If bucket 1 isn't deployed yet, readZincPoolStats returns null and `notLive`
 * is set, so the page renders a "not live yet" panel instead of crashing.
 */
export default function ZincPage() {
  const { data, notLive, refresh } = useZincData();
  const { pos, refresh: refreshPos } = useZincPosition(data?.totalShares ?? 0);

  const onDone = () => {
    refresh();
    refreshPos();
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* live status now lives in the top ZincStatTicker (crank online), so
              the header is just the title, matching the /ore header. The
              not-live case is still handled by the NotLivePanel body. */}
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">ZINC</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-fog-dim">
            Deposit SOL to mint dZINC. A keeper mines the ZINC board around the clock, smelts the
            winnings, and holds them for you - the same non-custodial, on-chain model as the ORE pool.
          </p>
        </div>
      </header>

      <ZincRouletteHero data={data} notLive={notLive} />

      {notLive ? (
        <NotLivePanel />
      ) : (
        <>
          <ZincStats data={data} />
          <ZincPhaseTimers data={data} />

          <ZincEconomics data={data} />

          <SettleZincPrompt data={data} onDone={onDone} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {data?.phase === 0 ? (
              <ParkZincCard data={data} onDone={onDone} />
            ) : (
              <MintZincCard data={data} onDone={onDone} />
            )}
            <ClaimZincCard data={data} pos={pos} onDone={onDone} />
            <QueueExitCard zinc onDone={onDone} />
            <ZincPositionCard pos={pos} data={data} />
          </div>
        </>
      )}

      <ZincLiveCrankPanel data={data} />
    </div>
  );
}

function NotLivePanel() {
  return (
    <>
      {/* Placeholder stat surface until the dZINC pool (bucket 1) is initialized. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "TVL", unit: "SOL", hint: "SOL custody", accent: true },
          { label: "dZINC price", unit: "SOL", hint: "SOL per share" },
          { label: "dZINC supply", hint: "pool share token" },
          { label: "Smelted ZINC", unit: "ZINC", hint: "claimed (-10%), pool-held" },
          { label: "In-kind ZINC", unit: "ZINC", hint: "paid pro-rata on withdraw" },
          { label: "Fee", hint: "on deploy volume" },
        ].map((t) => (
          <div key={t.label} className="card px-4 py-3.5">
            <div className="label">{t.label}</div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className={`num text-xl ${t.accent ? "gradient-text" : "text-white"}`}>···</span>
              {t.unit && <span className="font-mono text-xs text-fog-muted">{t.unit}</span>}
            </div>
            {t.hint && <div className="mt-0.5 font-mono text-[12px] text-fog-muted">{t.hint}</div>}
          </div>
        ))}
      </div>

      <div className="card border-amber/30">
        <h3 className="font-display text-base font-semibold text-white">dZINC isn&apos;t live yet</h3>
        <p className="mt-2 max-w-2xl font-mono text-[12px] leading-relaxed text-fog-muted">
          The dZINC pool (bucket 1) hasn&apos;t been initialized on-chain. Once it&apos;s deployed this page
          turns into a live deposit / claim surface automatically - no redeploy needed. The mechanics
          below are final.
        </p>
      </div>
    </>
  );
}

