"use client";

import type { ZincPoolStats } from "@/lib/cwr";
import { formatNum, formatSol } from "@/lib/format";
import { StatTile, StatRow, StatSection } from "@/components/primitives/Stat";
import { useZincPoolSummary, type ZincPoolPnl } from "@/hooks/useZincPoolSummary";

/**
 * dZINC pool economics - the HOLD-only twin of <PoolEconomics> (same `card`
 * wrapper + Big/Section/Row sub-components, verbatim, so the two pools read
 * identically). The ZINC value model is intentionally leaner: there is NO
 * miner, NO stORE oracle and NO price feed, so every miner/stORE/lifetime/PnL/
 * priced row from the ORE economics is dropped. Recoverable value = the exact
 * on-chain SOL custody (sol_in_vault) + the pro-rata smelted ZINC the pool
 * holds (zinc_in_vault), paid in kind. ZINC is shown raw (no price), never
 * folded into the SOL TVL.
 */
export function ZincEconomics({ data }: { data: ZincPoolStats | null }) {
  const ready = !!data && data.initialized;
  const sol = (n: number) => (ready ? formatSol(n, 4) : "···");
  const znc = (n: number) => (ready ? formatNum(n, 4) : "···");

  const solIn = data?.solInVaultSol ?? 0;
  const smelted = data?.smeltedZincHeld ?? 0;
  const navPerShare = data?.navPerShareSol ?? 0;
  const feeBps = data?.pullFeeEnabled ? (data?.pullFeeBps ?? 0) : 0;
  const wonClaimable = data?.wonClaimableSol ?? 0;
  // Lifetime mining PnL is event-sourced by the analytics indexer (deployed from
  // CrankMineZincEvent, recovered from SettleHarvestZincEvent.claimed_sol) - the
  // honest cumulative numbers no single on-chain account exposes. Fails soft.
  const { pnl } = useZincPoolSummary();
  const pnlReady = ready && !!pnl;

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Pool economics</h3>
        <span className="chip border-gold/30 text-gold">exact on-chain</span>
      </div>
      <p className="mb-5 font-mono text-[12px] leading-relaxed text-fog-muted">
        SOL and smelted ZINC are read <span className="text-gray-200">straight from the bucket + ZINC custody</span>,
        not estimated. ZINC has no price feed, so it is shown as a raw amount and never folded into the SOL TVL.
      </p>

      {/* headline: SOL custody + its share price + held ZINC. True TVL goes
          full-width on mobile to match the ORE economics layout. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Big
          className="col-span-2 sm:col-span-1"
          label="True TVL"
          value={sol(solIn)}
          unit="SOL"
          tone="gold"
          sub="SOL custody (ZINC not priced)"
        />
        <Big label="SOL / share" value={znc(navPerShare)} unit="SOL" tone="silver" />
        <Big label="ZINC held" value={znc(smelted)} unit="ZINC" tone="silver" sub="smelted, in kind" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Big label="Value / share" value={znc(navPerShare)} unit="SOL" />
        <Big label="dZINC supply" value={ready ? formatNum(data!.totalShares, 2) : "···"} />
      </div>

      {/* recoverable-now breakdown */}
      <Section title="Recoverable now (claimable at the next open window)">
        <Row k="In vault (idle SOL)" v={sol(solIn)} unit="SOL" />
        <Row k="Won SOL (claimable)" v={sol(wonClaimable)} unit="SOL" sub="swept into the vault each settled window" />
        <Row k="Smelted ZINC held" v={znc(smelted)} unit="ZINC" sub="paid in kind on withdraw" />
        <Row k="Total recoverable" v={sol(solIn + wonClaimable)} unit="SOL" sub="+ ZINC in kind" strong />
      </Section>

      {/* mining (lifetime): the SOL spent vs what the pool keeps. Deployed is exact
          (the mining_authority's ZINC PlayerProfile gross_deployed); won SOL is
          swept back into the vault (idle SOL above), and kept winnings are the
          smelted ZINC held - so the realized SOL "recovered" is not a single
          on-chain counter and is reconstructed from the round history off-chain. */}
      <Section title="Mining (lifetime)">
        <Row k="Total SOL deployed" v={pnlReady ? sol(pnl!.deployedGrossSol) : "···"} unit="SOL" sub="gross, into 30-tile rounds" />
        <Row k="Won SOL recovered" v={pnlReady ? sol(pnl!.recoveredSol) : "···"} unit="SOL" sub="claimed from winning rounds" />
        <PnlRow label="All-time PnL" pnl={pnl} ready={pnlReady} />
        <Row k="Smelted ZINC kept" v={znc(smelted)} unit="ZINC" sub="in-kind winnings held" />
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-fog-muted">
          Deployed and recovered are summed from on-chain events (CrankMineZincEvent deploys vs
          SettleHarvestZincEvent claimed SOL) by the analytics indexer - no estimates, no hardcoding.
          Won SOL is swept back into vault custody (above, idle SOL); kept winnings are the smelted ZINC,
          paid in kind. ZINC has no price feed, so it is never folded into the SOL PnL.
        </p>
      </Section>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 font-mono text-[12px] text-fog-muted sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span>
          fee {(feeBps / 100).toFixed(1)}% on deploy volume · keeper full 30-tile coverage
        </span>
        <span>deposit / claim only while the window is open</span>
      </div>
    </div>
  );
}

// Thin adapters onto the shared stat primitives (one source of truth for the
// markup in components/primitives/Stat.tsx) - same as PoolEconomics.
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

/** Colored deployed-vs-recovered PnL line (green +, red -), like the dORE panel. */
function PnlRow({ label, pnl, ready }: { label: string; pnl: ZincPoolPnl | null; ready: boolean }) {
  const neg = (pnl?.netPnlSol ?? 0) < 0;
  const text =
    ready && pnl
      ? `${neg ? "-" : "+"}${formatSol(Math.abs(pnl.netPnlSol), 4)} SOL (${pnl.pnlPct >= 0 ? "+" : ""}${formatNum(pnl.pnlPct, 1)}%)`
      : "···";
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="font-mono text-[13px] font-semibold text-white">{label}</span>
      <span className={`num text-sm ${ready ? (neg ? "text-[#ec9b9b]" : "text-pos") : "text-fog-muted"}`}>
        {text}
      </span>
    </div>
  );
}

const Section = StatSection;
const Row = StatRow;
