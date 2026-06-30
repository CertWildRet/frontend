"use client";

import type { ZincPoolStats } from "@/lib/cwr";
import { formatNum, formatSol } from "@/lib/format";
import { StatTile, StatRow, StatSection } from "@/components/primitives/Stat";
import { useZincPoolSummary } from "@/hooks/useZincPoolSummary";

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
  const supply = data?.totalShares ?? 0;
  const feeBps = data?.pullFeeEnabled ? (data?.pullFeeBps ?? 0) : 0;
  const wonClaimable = data?.wonClaimableSol ?? 0;
  const wonClaimableZinc = data?.wonClaimableZinc ?? 0;
  const wonClaimableZincVal = data?.wonClaimableZincValueSol ?? 0;
  const zincHeldVal = data?.zincHeldValueSol ?? 0;
  const zincPrice = data?.zincPriceSol ?? 0;
  const zincSub = (n: number) => (zincPrice > 0 ? `≈ ${sol(n * zincPrice)} SOL @ ${formatNum(zincPrice, 4)}/ZINC` : "in kind");

  // The pool's SOL is deployed into rounds during BETTING, so idle sol_in_vault
  // alone reads ~0 mid-cycle. The TRUE recoverable position also includes the won
  // SOL sitting claimable in the ZINC game (swept in each settle) - both EXACT SOL.
  const recoverableSol = solIn + wonClaimable;
  // ZINC won + held (smelted custody + still-claimable), valued live alongside.
  const totalZinc = smelted + wonClaimableZinc;
  const totalZincVal = zincHeldVal + wonClaimableZincVal;
  // Full recoverable value (SOL + ZINC valued) and a true per-share figure, so the
  // headline never reads 0 just because capital is mid-round.
  const recoverableValue = recoverableSol + totalZincVal;
  const valuePerShare = supply > 0 ? recoverableValue / supply : 0;
  const solPerShare = supply > 0 ? recoverableSol / supply : 0;

  // Phase-aware status flag: a holder must see the pool is actively mining (and
  // that winnings settle each window), not a tanked vault with no feedback.
  const phase = data?.phase ?? 0;
  const paused = !!data?.paused || !!data?.ddHalt;
  const status = !ready
    ? { text: "loading", cls: "border-line text-fog-muted" }
    : paused
      ? { text: "PAUSED", cls: "border-[#ec9b9b]/40 text-[#ec9b9b]" }
      : phase === 1
        ? { text: "OPEN · deposit / claim", cls: "border-pos/40 text-pos" }
        : { text: "MINING · settles next window", cls: "border-gold/30 text-gold" };

  // Lifetime mining PnL is event-sourced by the analytics indexer (deployed from
  // CrankMineZincEvent, recovered from SettleHarvestZincEvent.claimed_sol). During
  // BETTING the wins are WON but unsettled, so the raw event PnL dips to -100%
  // until a settle sweeps them. We FOLD the current on-chain claimable (won SOL +
  // all ZINC valued) into recovered so the headline reflects the true position.
  const { pnl } = useZincPoolSummary();
  const pnlReady = ready && !!pnl;
  const deployed = pnl?.deployedGrossSol ?? 0;
  const recoveredSettled = pnl?.recoveredSol ?? 0;
  // Capital RECYCLES every cycle (deploy -> win -> settle -> re-deploy), so gross
  // "deployed" balloons far past the real capital, and a gross-flow PnL
  // (recovered - deployed) is meaningless (it read -50% while the pool was only
  // down ~8%). The honest headline is POSITION-based: the pool's recoverable value
  // vs its shares at the reseed par (1.0/share). Recycling-proof, and it folds in
  // the claimable (recoverableValue already includes claimable SOL + ZINC).
  const effPnlSol = recoverableValue - supply; // supply * 1.0 par baseline
  const effPnlPct = supply > 0 ? (recoverableValue / supply - 1) * 100 : 0;

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Pool economics</h3>
        <span className={`chip ${status.cls}`}>{status.text}</span>
      </div>
      <p className="mb-5 font-mono text-[12px] leading-relaxed text-fog-muted">
        Read <span className="text-gray-200">straight from the bucket + ZINC custody + the mining profile</span>, not
        estimated. While <span className="text-gold">mining</span>, SOL is deployed into 30-tile rounds and the won
        SOL + ZINC sit <span className="text-gray-200">claimable</span> until they sweep into the vault at each open
        window - the values below <span className="text-gray-200">include that claimable position</span>, so the pool
        does not read empty mid-cycle. ZINC is valued live at the Meteora ZINC/SOL price.
      </p>

      {/* headline: SOL custody + its share price + held ZINC. True TVL goes
          full-width on mobile to match the ORE economics layout. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Big
          className="col-span-2 sm:col-span-1"
          label="True TVL"
          value={sol(recoverableSol)}
          unit="SOL"
          tone="gold"
          sub="idle + won-claimable SOL (exact)"
        />
        <Big label="SOL / share" value={znc(solPerShare)} unit="SOL" tone="silver" />
        <Big label="ZINC held" value={znc(totalZinc)} unit="ZINC" tone="silver" sub={zincSub(totalZinc)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Big label="Value / share" value={znc(valuePerShare)} unit="SOL" sub="SOL + ZINC valued" />
        <Big label="dZINC supply" value={ready ? formatNum(supply, 2) : "···"} />
      </div>

      {/* recoverable-now breakdown */}
      <Section title="Recoverable now (claimable at the next open window)">
        <Row k="In vault (idle SOL)" v={sol(solIn)} unit="SOL" />
        <Row k="Won SOL (claimable)" v={sol(wonClaimable)} unit="SOL" sub="swept into the vault each settled window" />
        <Row k="Won ZINC (claimable)" v={znc(wonClaimableZinc)} unit="ZINC" sub={`smelted into custody each settle · ${zincSub(wonClaimableZinc)}`} />
        <Row k="Smelted ZINC held" v={znc(smelted)} unit="ZINC" sub="paid in kind on withdraw" />
        <Row k="Total recoverable" v={sol(recoverableSol)} unit="SOL" sub={`+ ${znc(totalZinc)} ZINC in kind (${zincSub(totalZinc)})`} strong />
      </Section>

      {/* mining (lifetime): the SOL spent vs what the pool keeps. Deployed is exact
          (the mining_authority's ZINC PlayerProfile gross_deployed); won SOL is
          swept back into the vault (idle SOL above), and kept winnings are the
          smelted ZINC held - so the realized SOL "recovered" is not a single
          on-chain counter and is reconstructed from the round history off-chain. */}
      <Section title="Mining (position vs reseed par)">
        <Row k="Recoverable value" v={sol(recoverableValue)} unit="SOL" sub="idle + claimable SOL + ZINC valued (incl. claimable)" />
        <PnlRow label="Net PnL (vs par 1.0 / share)" pnlSol={effPnlSol} pnlPct={effPnlPct} ready={ready} />
        <Row k="Gross mined (lifetime)" v={pnlReady ? sol(deployed) : "···"} unit="SOL" sub="cumulative deploy volume - capital recycles each cycle, so this exceeds TVL (not a loss)" />
        <Row k="Settled to vault" v={pnlReady ? sol(recoveredSettled) : "···"} unit="SOL" sub="swept from won rounds (the rest is claimable above)" />
        <Row k="Smelted ZINC kept" v={znc(totalZinc)} unit="ZINC" sub={zincPrice > 0 ? zincSub(totalZinc) : "in-kind winnings held"} />
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-fog-muted">
          PnL is position-based: the pool&apos;s recoverable value (idle + claimable SOL + ZINC valued) vs its
          dZINC supply at the reseed par of 1.0 SOL/share - recycling-proof. Gross-mined and settled-to-vault
          are cumulative on-chain flows (CrankMineZincEvent vs SettleHarvestZincEvent); because capital recycles
          every cycle, gross-mined balloons past TVL and is NOT a loss. ZINC valued at the live Meteora price;
          per-wallet PnL is in Your position.
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

/** Colored PnL line (green +, red -), like the dORE panel. Takes the folded
 *  (settled + claimable) PnL so it reflects the true mid-cycle position. */
function PnlRow({ label, pnlSol, pnlPct, ready }: { label: string; pnlSol: number; pnlPct: number; ready: boolean }) {
  const neg = pnlSol < 0;
  const text = ready
    ? `${neg ? "-" : "+"}${formatSol(Math.abs(pnlSol), 4)} SOL (${pnlPct >= 0 ? "+" : ""}${formatNum(pnlPct, 1)}%)`
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
