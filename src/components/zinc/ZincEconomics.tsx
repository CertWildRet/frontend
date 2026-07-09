"use client";

import type { ZincPoolStats } from "@/lib/cwr";
import { formatNum, formatSol } from "@/lib/format";
import { ZINC_ATH_USD } from "@/lib/ath";
import { useAth } from "@/hooks/useAth";
import { StatTile, StatRow, StatSection } from "@/components/primitives/Stat";
import { useZincPoolSummary } from "@/hooks/useZincPoolSummary";
import { useStats } from "@/hooks/useStats";

/**
 * dZINC pool economics - structurally mirrors <PoolEconomics> (ORE) so the two
 * pools read identically: the same 5 headline tiles (True TVL / SOL share / token
 * share / Value-share / On-chain NAV) and the same three sections (Recoverable
 * now / token lifecycle (all-time) / Lifetime mining (all-time) with All-time
 * PnL). ZINC is the analog of ORE's mined token: won SOL + won/held ZINC sit
 * claimable while the contract NAV reads ~0 mid-round, so the headline uses the
 * true recoverable value (idle + claimable SOL + ZINC valued at the live Meteora
 * price), and the PnL mirrors ORE (recovered SOL + mined token valued - deployed).
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

  // The pool's SOL is deployed into rounds during BETTING, so idle sol_in_vault
  // (the contract's NAV) reads ~0 mid-round. The TRUE recoverable position adds the
  // won SOL sitting claimable in the ZINC game + the ZINC won, valued live.
  const recoverableSol = solIn + wonClaimable; // exact SOL
  const totalZinc = smelted + wonClaimableZinc; // ZINC won (held + claimable)
  const totalZincVal = zincHeldVal + wonClaimableZincVal;
  const recoverableValue = recoverableSol + totalZincVal; // SOL + ZINC valued
  const valuePerShare = supply > 0 ? recoverableValue / supply : 0;

  // Phase flag so a holder sees the pool is actively mining (and that winnings
  // settle each window), not a tanked vault with no feedback.
  const phase = data?.phase ?? 0;
  const paused = !!data?.paused || !!data?.ddHalt;
  const status = !ready
    ? { text: "loading", cls: "border-line text-fog-muted" }
    : paused
      ? { text: "PAUSED", cls: "border-[#ec9b9b]/40 text-[#ec9b9b]" }
      : phase === 1
        ? { text: "OPEN · deposit / claim", cls: "border-pos/40 text-pos" }
        : { text: "MINING · settles next window", cls: "border-gold/30 text-gold" };

  // PnL mirrors the ORE panel: recovered = lifetime won SOL (settled + still
  // claimable; the analytics "settled" alone lags because capital recycles and
  // only settles each window). made = recovered + mined ZINC valued; PnL = made -
  // deployed, as a % of deployed - the same as the ORE lifetime-mining section.
  const { pnl } = useZincPoolSummary();
  const pnlReady = ready && !!pnl;
  const deployed = pnl?.deployedGrossSol ?? 0; // gross - recycled every round
  const depositedCapital = pnl?.depositedCapitalSol ?? 0; // capital base / cost basis
  const recoveredSol = (pnl?.recoveredSol ?? 0) + wonClaimable;
  const madeSol = recoveredSol + totalZincVal;
  const pnlSol = madeSol - deployed;
  // TRUE ROI: net PnL over the SOL actually DEPOSITED (cost basis), not gross
  // deployed. Gross deployed recycles the same capital many times (here ~6x), so
  // dividing by it makes a real capital loss look tiny. deposited is the honest base.
  const pnlPct = depositedCapital > 0 ? (pnlSol / depositedCapital) * 100 : 0;

  // Denominate the headline PnL in USD, exactly like the ORE panel. Everything
  // above is already valued in SOL (ZINC via the live ZINC/SOL price), so a
  // single SOL/USD scale converts it; the % is invariant to the scale. solUsd
  // is the same global price the ORE panel uses (app-wide brain feed); if it is
  // unavailable we fall back to the SOL figure rather than blanking the PnL.
  const solUsd = useStats()?.prices.solUsd ?? 0;
  const pnlUsd = pnlSol * solUsd;
  const zincUsd = zincPrice * solUsd;

  // Projected ("hopium") PnL: the SAME calculation, but the mined ZINC leg is
  // revalued at ZINC's trailing-1-year high ($ high → SOL via the live SOL
  // price) instead of the live ZINC/SOL price. Recovered SOL, gross deployed and
  // the deposited cost basis are unchanged. NOT realized PnL — what it *could*
  // be if ZINC round-trips to its past-year high. The high is live from the ZINC
  // keeper's /api/ath (≤ once-a-day refresh); the ath.ts constant is a fallback.
  const athLive = useAth(process.env.NEXT_PUBLIC_ZINC_BRAIN_URL);
  const zincAthUsd = athLive?.athUsd && athLive.athUsd > 0 ? athLive.athUsd : ZINC_ATH_USD;
  const zincAthSol = solUsd > 0 ? zincAthUsd / solUsd : 0;
  const totalZincValAth = totalZinc * zincAthSol;
  const madeSolAth = recoveredSol + totalZincValAth;
  const pnlSolAth = madeSolAth - deployed;
  const pnlUsdAth = pnlSolAth * solUsd;
  const pnlPctAth = depositedCapital > 0 ? (pnlSolAth / depositedCapital) * 100 : 0;
  const pnlAthReady = pnlReady && solUsd > 0;
  const pnlAthText = pnlAthReady
    ? `${pnlUsdAth < 0 ? "-" : ""}$${formatNum(Math.abs(pnlUsdAth), 2)} (${pnlPctAth >= 0 ? "+" : ""}${formatNum(pnlPctAth, 1)}%)`
    : "···";

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Pool economics</h3>
        <span className={`chip ${status.cls}`}>{status.text}</span>
      </div>
      <p className="mb-5 font-mono text-[12px] leading-relaxed text-fog-muted">
        Read <span className="text-gray-200">straight from chain</span>, not estimated (the contract NAV reads ~0
        mid-round, so these are your true recoverable amounts).{" "}
        <span className="text-gray-200">uZINC</span> = unsmelted ZINC ·{" "}
        <span className="text-gray-200">stZINC</span> = smelted + staked in the vault. ZINC valued live at the Meteora ZINC/SOL price.
      </p>

      {/* headline: combined TVL split into its SOL + ZINC shares (mirrors the ORE
          panel). On-chain NAV reads ~0 mid-round, so True TVL is the real value. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Big
          className="col-span-2 sm:col-span-1"
          label="True TVL"
          value={zincPrice > 0 ? `≈ ${sol(recoverableValue)}` : sol(recoverableSol)}
          unit="SOL"
          tone="gold"
          sub={zincPrice > 0 ? "SOL + ZINC at market price" : "SOL only (no ZINC price)"}
        />
        <Big label="SOL share" value={sol(recoverableSol)} unit="SOL" tone="silver" />
        <Big
          label="ZINC share"
          value={znc(totalZinc)}
          unit="ZINC"
          tone="silver"
          sub={zincPrice > 0 ? `≈ ${sol(totalZincVal)} SOL` : undefined}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Big label="Value / share" value={zincPrice > 0 ? `≈ ${formatNum(valuePerShare, 4)}` : "···"} unit="SOL" />
        <Big
          label="On-chain NAV"
          value={sol(solIn)}
          unit="SOL"
          sub={phase === 0 && !data?.windowSettled ? "≈0 mid-round (by design)" : undefined}
        />
      </div>

      {/* recoverable-now breakdown */}
      <Section title="Recoverable now (claimable at the next open window)">
        <Row k="Idle SOL" v={sol(solIn)} unit="SOL" />
        <Row k="Won SOL" v={sol(wonClaimable)} unit="SOL" sub="round winnings, not yet swept in" />
        {/* v1.4.0 lazy smelt: settles no longer smelt — new winnings ride
            unsmelted (compounding refining yield); the staked reserve only
            grows when an exit forces a batch smelt. */}
        <Row k="stZINC (smelted + staked)" v={znc(smelted)} unit="stZINC" sub="staked exit reserve; refilled by batch smelts only when exits need it" />
        <Row
          k="uZINC (unsmelted)"
          v={znc(wonClaimableZinc)}
          unit="ZINC"
          sub={zincPrice > 0 ? "held unsmelted on purpose — earns the refining rebase; -10% when smelted" : undefined}
        />
        <Row
          k="Total recoverable"
          v={zincPrice > 0 ? `≈ ${sol(recoverableValue)}` : sol(recoverableSol)}
          unit="SOL"
          sub={zincPrice > 0 ? undefined : "+ ZINC"}
          strong
        />
      </Section>

      {/* ZINC lifecycle (all-time) - mirrors the ORE lifecycle section */}
      <Section title="ZINC lifecycle (all-time)">
        <Row k="ZINC mined (all-time)" v={znc(totalZinc)} unit="ZINC" strong />
        <Row k="↳ stZINC (smelted + staked)" v={znc(smelted)} unit="stZINC" />
        <Row k="↳ uZINC (unsmelted)" v={znc(wonClaimableZinc)} unit="ZINC" />
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-fog-muted">
          Net of the 10% smelt fee. ZINC already withdrawn by holders in kind is not
          separable on-chain, so it is not shown.
        </p>
      </Section>

      {/* lifetime SOL + PnL - mirrors the ORE lifetime-mining section */}
      <Section title="Lifetime mining (all-time)">
        <Row k="Net capital deposited" v={pnlReady ? sol(depositedCapital) : "···"} unit="SOL" sub="the SOL actually put in (cost basis); the PnL % below is measured against this" strong />
        <Row k="Total SOL deployed" v={pnlReady ? sol(deployed) : "···"} unit="SOL" sub="gross: the pool recycles the same capital every round, so this far exceeds what was deposited" />
        <Row k="Total SOL recovered" v={pnlReady ? sol(recoveredSol) : "···"} unit="SOL" sub="settled + claimable, plus ZINC mined valued in PnL" />
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2 font-mono text-xs">
          <span className="min-w-0 text-white">All-time PnL <span className="font-normal text-fog-muted">on deposited</span></span>
          <span className={`num shrink-0 whitespace-nowrap text-right text-sm font-semibold ${pnlSol >= 0 ? "text-pos" : "text-[#ec9b9b]"}`}>
            {pnlReady
              ? solUsd > 0
                ? `${pnlUsd < 0 ? "-" : ""}$${formatNum(Math.abs(pnlUsd), 2)} (${pnlPct >= 0 ? "+" : ""}${formatNum(pnlPct, 1)}%)`
                : `${pnlSol < 0 ? "-" : "+"}${formatSol(Math.abs(pnlSol), 4)} SOL (${pnlPct >= 0 ? "+" : ""}${formatNum(pnlPct, 1)}%)`
              : "···"}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3 font-mono text-xs">
          <span className="min-w-0 text-fog-muted">
            Projected <span className="text-gold/80">if ZINC @ ${formatNum(zincAthUsd, 0)} · ATH past year</span>
          </span>
          <span className="num shrink-0 whitespace-nowrap text-right text-sm font-semibold text-gold">{pnlAthText}</span>
        </div>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-fog-muted">
          Hopium, not the real number: values all mined ZINC at its highest price in the past year
          (${formatNum(zincAthUsd, 0)}), not the live price. What the PnL <span className="italic">could</span> be if
          ZINC round-trips to its past-year high — not what it is.
        </p>
      </Section>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 font-mono text-[12px] text-fog-muted sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span>
          fee {(feeBps / 100).toFixed(1)}% on deploy volume · miner full 30-tile coverage
        </span>
        <span>
          SOL ${solUsd ? formatNum(solUsd, 2) : "··"} · ZINC ${zincUsd ? formatNum(zincUsd, 4) : "··"}
        </span>
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

const Section = StatSection;
const Row = StatRow;
