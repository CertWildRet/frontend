"use client";

import type { PoolStatsData } from "@/hooks/useStats";
import type { VaultData } from "@/hooks/useVaultData";
import { formatNum, formatSol } from "@/lib/format";
import { StatTile, StatRow, StatSection } from "@/components/primitives/Stat";

/**
 * Full economic transparency. SOL + ORE + stORE amounts are read EXACTLY from
 * chain (the bucket + the ORE miner via useVaultData) - no priced estimation on
 * the amounts. The only priced figures are the $/combined-SOL blends, which need
 * a market price (from the brain feed) and are labelled as such.
 *
 * ORE lifecycle (kept distinct on purpose):
 *   - UNCLAIMED ORE = miner.rewards_ore, accrued but not yet settled.
 *   - stORE held    = bucket.store_in_vault, i.e. CLAIMED-and-wrapped ORE still
 *                     in the pool (yield-bearing).
 *   - recoverable ORE now = unclaimed + stORE held.
 */
export function PoolEconomics({
  stats,
  data,
}: {
  stats: PoolStatsData | null;
  data: VaultData | null;
}) {
  const ready = !!data && data.initialized;
  const sol = (n: number) => (ready ? formatSol(n, 4) : "···");
  const ore = (n: number) => (ready ? formatNum(n, 4) : "···");

  // Prices (the only estimated inputs). From the brain feed; 0 if unavailable.
  const solUsd = stats?.prices.solUsd ?? 0;
  const oreUsd = stats?.prices.oreUsd ?? 0;
  const oreToSol = solUsd > 0 && oreUsd > 0 ? oreUsd / solUsd : 0;
  const priced = oreToSol > 0;
  // stORE price = its on-chain redemption rate (ORE per stORE) x ORE price.
  const storeRate = data?.storeToOreRate ?? 1;
  const storeUsd = oreUsd * storeRate;

  // Exact on-chain recoverable.
  const recSol = data?.recoverableSol ?? 0;
  const recOre = data?.recoverableOre ?? 0;
  const unclaimedOre = data?.unclaimedOre ?? 0; // gross balance in the miner
  const claimFeeOre = data?.claimFeeOre ?? 0; // 10% protocol fee on the rewards_ore leg
  const storeOre = data?.storeInVaultOre ?? 0;
  const oreAsSol = recOre * oreToSol;
  const tvlSol = recSol + oreAsSol;
  const navPerShareTrue = data && data.totalShares > 0 ? tvlSol / data.totalShares : 0;

  // Lifetime + PnL (the lifetime fields come from the brain's miner read). These
  // are NET of the 10% claim fee and reset only if the miner PDA is re-created.
  const lifetimeMined = stats?.miner.lifetimeRewardsOre ?? 0;
  const lifetimeDeployed = stats?.miner.lifetimeDeployed ?? 0;
  const lifetimeRecovered = stats?.miner.lifetimeRewardsSol ?? 0;
  const hasLifetime = !!stats;

  const deployedUsd = lifetimeDeployed * solUsd;
  const madeUsd = lifetimeRecovered * solUsd + lifetimeMined * oreUsd;
  const pnlUsd = madeUsd - deployedUsd;
  const pnlPct = deployedUsd > 0 ? (pnlUsd / deployedUsd) * 100 : 0;
  // Require BOTH prices: with only solUsd, lifetimeMined*oreUsd would silently
  // zero the (principal) ORE leg and could flip a real profit into a fake loss.
  const pnlReady = hasLifetime && solUsd > 0 && oreUsd > 0 && deployedUsd > 0;
  const pnlText = pnlReady
    ? `${pnlUsd < 0 ? "-" : ""}$${formatNum(Math.abs(pnlUsd), 2)} (${pnlPct >= 0 ? "+" : ""}${formatNum(pnlPct, 1)}%)`
    : "···";

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Pool economics</h3>
        <span className="chip border-gold/30 text-gold">exact on-chain</span>
      </div>
      <p className="mb-5 font-mono text-[12px] leading-relaxed text-fog-muted">
        SOL, ORE and stORE are read <span className="text-gray-200">straight from the bucket + ORE miner</span>,
        not estimated. The contract&apos;s NAV reads ~0 mid-round; these are the true recoverable amounts.
      </p>

      {/* headline: combined TVL split into its SOL + ORE shares. True TVL goes
          full-width on mobile so the priced "≈ value SOL" never gets cramped. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Big
          className="col-span-2 sm:col-span-1"
          label="True TVL"
          value={priced ? `≈ ${sol(tvlSol)}` : sol(recSol)}
          unit="SOL"
          tone="gold"
          sub={priced ? "SOL + ORE at market price" : "SOL only (no ORE price)"}
        />
        <Big label="SOL share" value={sol(recSol)} unit="SOL" tone="silver" />
        <Big
          label="ORE share"
          value={ore(recOre)}
          unit="ORE"
          tone="silver"
          sub={priced ? `≈ ${formatSol(oreAsSol, 4)} SOL` : undefined}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Big label="Value / share" value={priced ? `≈ ${formatNum(navPerShareTrue, 4)}` : "···"} unit="SOL" />
        <Big
          label="On-chain NAV"
          value={sol(data?.totalNavSol ?? 0)}
          unit="SOL"
          sub={data && data.phase === 0 && !data.windowSettled ? "≈0 mid-round (by design)" : undefined}
        />
      </div>

      {/* recoverable-now breakdown */}
      <Section title="Recoverable now (claimable at the next open window)">
        <Row k="In vault (idle SOL)" v={sol(data?.solInVaultSol ?? 0)} unit="SOL" />
        <Row k="Miner rewards (won SOL)" v={sol(data?.rewardsSol ?? 0)} unit="SOL" />
        <Row k="In-flight this round" v={sol(data?.inFlightSol ?? 0)} unit="SOL" />
        <Row k="stORE held (claimed ORE)" v={ore(storeOre)} unit="stORE" />
        <Row
          k="Unclaimed ORE"
          v={ore(unclaimedOre - claimFeeOre)}
          unit="ORE"
          sub={claimFeeOre > 0 ? "net of 10% claim fee" : undefined}
        />
        <Row
          k="Total recoverable"
          v={priced ? `≈ ${sol(tvlSol)}` : sol(recSol)}
          unit="SOL"
          sub={priced ? undefined : "+ ORE"}
          strong
        />
      </Section>

      {/* ORE lifecycle (all-time) */}
      <Section title="ORE lifecycle (all-time)">
        <Row k="Net ORE mined (lifetime)" v={ore(lifetimeMined)} unit="ORE" strong />
        <Row k="↳ stORE in pool (claimed, held)" v={ore(storeOre)} unit="stORE" />
        <Row k="↳ still unclaimed (in miner)" v={ore(unclaimedOre)} unit="ORE" />
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-fog-muted">
          Net of the 10% claim fee. The remainder (mined minus held minus unclaimed)
          is ORE already withdrawn by users as stORE; it is not cleanly separable
          on-chain, so it is not shown as an exact figure.
        </p>
      </Section>

      {/* lifetime SOL + PnL */}
      <Section title="Lifetime mining (all-time)">
        <Row k="Total SOL deployed" v={sol(lifetimeDeployed)} unit="SOL" />
        <Row k="Total SOL recovered" v={sol(lifetimeRecovered)} unit="SOL" />
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2 font-mono text-xs">
          <span className="text-white">All-time PnL</span>
          <span className={`num text-sm font-semibold ${pnlUsd >= 0 ? "text-pos" : "text-[#ec9b9b]"}`}>
            {pnlText}
          </span>
        </div>
      </Section>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 font-mono text-[12px] text-fog-muted sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span>
          per-round deploy {stats ? `${formatNum(stats.keeper.minSolPerRound, 3)} SOL` : "···"} · keeper{" "}
          {stats?.keeper.mode ?? "···"}
        </span>
        <span>
          SOL ${solUsd ? formatNum(solUsd, 2) : "··"} · ORE ${oreUsd ? formatNum(oreUsd, 2) : "··"} · stORE $
          {storeUsd ? formatNum(storeUsd, 2) : "··"}{storeRate ? ` (${formatNum(storeRate, 3)}×)` : ""}
        </span>
      </div>
    </div>
  );
}

// Thin adapters onto the shared stat primitives (one source of truth for the
// markup in components/primitives/Stat.tsx). ORE economics keeps the larger
// headline figure (text-base sm:text-lg) via the inset tile.
function Big({
  label,
  value,
  unit,
  sub,
  tone,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "gold" | "silver";
  className?: string;
}) {
  return (
    <StatTile
      variant="inset"
      valueSize="text-base sm:text-lg"
      label={label}
      value={value}
      unit={unit}
      hint={sub}
      tone={tone}
      className={className}
    />
  );
}

const Section = StatSection;
const Row = StatRow;
