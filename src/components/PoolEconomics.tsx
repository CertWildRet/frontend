"use client";

import type { PoolStatsData } from "@/hooks/useStats";
import type { VaultData } from "@/hooks/useVaultData";
import { usePoolSummary } from "@/hooks/useZincPoolSummary";
import { BUCKET } from "@/lib/analytics";
import { formatNum, formatSol } from "@/lib/format";
import { ORE_ATH_USD } from "@/lib/ath";
import { useAth } from "@/hooks/useAth";
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

  // Capital base (cost basis) from the analytics indexer: the SOL actually
  // deposited, NOT gross recycled deploys. Same true-ROI denominator as dZINC.
  const { pnl: dorePnl } = usePoolSummary(BUCKET.dORE);
  const depositedCapital = dorePnl?.depositedCapitalSol ?? 0;

  const deployedUsd = lifetimeDeployed * solUsd; // gross, recycled (shown as context)
  const depositedUsd = depositedCapital * solUsd; // capital base (ROI denominator)
  const madeUsd = lifetimeRecovered * solUsd + lifetimeMined * oreUsd;
  const pnlUsd = madeUsd - deployedUsd;
  // TRUE ROI: net PnL over the SOL actually deposited (cost basis), not gross
  // deployed. Gross recycles the same capital every round and understates the loss.
  const pnlPct = depositedUsd > 0 ? (pnlUsd / depositedUsd) * 100 : 0;
  // Require BOTH prices + a known capital base. With only solUsd, lifetimeMined*oreUsd
  // would silently zero the (principal) ORE leg and could flip a real profit into a fake loss.
  const pnlReady = hasLifetime && solUsd > 0 && oreUsd > 0 && depositedUsd > 0;
  const pnlText = pnlReady
    ? `${pnlUsd < 0 ? "-" : ""}$${formatNum(Math.abs(pnlUsd), 2)} (${pnlPct >= 0 ? "+" : ""}${formatNum(pnlPct, 1)}%)`
    : "···";

  // Projected ("hopium") PnL: the SAME calculation, but the all-time mined ORE
  // leg is revalued at ORE's trailing-1-year high instead of the live price.
  // Recovered SOL, gross deployed and the deposited cost basis are unchanged.
  // NOT realized PnL — what it *could* be if ORE round-trips to its past-year high.
  // The high is live from the ORE keeper's /api/ath (refreshed ≤ once a day);
  // the ath.ts constant is only a boot fallback.
  const athLive = useAth(process.env.NEXT_PUBLIC_BRAIN_URL);
  const oreAthUsd = athLive?.athUsd && athLive.athUsd > 0 ? athLive.athUsd : ORE_ATH_USD;
  const madeUsdAth = lifetimeRecovered * solUsd + lifetimeMined * oreAthUsd;
  const pnlUsdAth = madeUsdAth - deployedUsd;
  const pnlPctAth = depositedUsd > 0 ? (pnlUsdAth / depositedUsd) * 100 : 0;
  const pnlAthText = pnlReady
    ? `${pnlUsdAth < 0 ? "-" : ""}$${formatNum(Math.abs(pnlUsdAth), 2)} (${pnlPctAth >= 0 ? "+" : ""}${formatNum(pnlPctAth, 1)}%)`
    : "···";

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Pool economics</h3>
        <span className="chip border-gold/30 text-gold">exact on-chain</span>
      </div>
      <p className="mb-5 font-mono text-[12px] leading-relaxed text-fog-muted">
        Read <span className="text-gray-200">straight from chain</span>, not estimated (the contract NAV reads ~0
        mid-round, so these are your true recoverable amounts).{" "}
        <span className="text-gray-200">uORE</span> = unclaimed ORE ·{" "}
        <span className="text-gray-200">stORE</span> = claimed + staked in the vault.
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
        <Row k="Idle SOL" v={sol(data?.solInVaultSol ?? 0)} unit="SOL" />
        <Row k="Won SOL" v={sol(data?.rewardsSol ?? 0)} unit="SOL" sub="mining rewards, not yet swept in" />
        <Row k="SOL in-flight this round" v={sol(data?.inFlightSol ?? 0)} unit="SOL" />
        <Row k="stORE (claimed + staked)" v={ore(storeOre)} unit="stORE" />
        <Row
          k="uORE (unclaimed)"
          v={ore(unclaimedOre - claimFeeOre)}
          unit="ORE"
          sub={claimFeeOre > 0 ? "net of the 10% claim fee" : undefined}
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
        <Row k="ORE mined (all-time)" v={ore(lifetimeMined)} unit="ORE" strong />
        <Row k="↳ stORE (claimed + staked)" v={ore(storeOre)} unit="stORE" />
        <Row k="↳ uORE (unclaimed)" v={ore(unclaimedOre)} unit="ORE" />
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-fog-muted">
          Net of the 10% claim fee. The rest was already withdrawn by holders as stORE, so
          it is not separable on-chain and not shown.
        </p>
      </Section>

      {/* lifetime SOL + PnL */}
      <Section title="Lifetime mining (all-time)">
        <Row k="Net capital deposited" v={pnlReady ? sol(depositedCapital) : "···"} unit="SOL" sub="the SOL actually put in (cost basis); the PnL % below is measured against this" strong />
        <Row k="Total SOL deployed" v={sol(lifetimeDeployed)} unit="SOL" sub="gross: the pool recycles the same capital every round, so this grows past what was deposited" />
        <Row k="Total SOL recovered" v={sol(lifetimeRecovered)} unit="SOL" />
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2 font-mono text-xs">
          <span className="text-white">All-time PnL <span className="font-normal text-fog-muted">on deposited</span></span>
          <span className={`num text-sm font-semibold ${pnlUsd >= 0 ? "text-pos" : "text-[#ec9b9b]"}`}>
            {pnlText}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between font-mono text-xs">
          <span className="text-fog-muted">
            Projected <span className="text-gold/80">if ORE @ ${formatNum(oreAthUsd, 0)} · ATH past year</span>
          </span>
          <span className="num text-sm font-semibold text-gold">{pnlAthText}</span>
        </div>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-fog-muted">
          Hopium, not the real number: values all mined ORE at its highest price in the past year
          (${formatNum(oreAthUsd, 0)}), not the live price. What the PnL <span className="italic">could</span> be if
          ORE round-trips to its past-year high — not what it is.
        </p>
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
