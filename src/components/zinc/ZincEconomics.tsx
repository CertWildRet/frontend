"use client";

import type { ZincPoolStats } from "@/lib/cwr";
import { formatNum, formatSol } from "@/lib/format";

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
        <Row k="Smelted ZINC held" v={znc(smelted)} unit="ZINC" sub="paid in kind on withdraw" />
        <Row k="Total recoverable" v={sol(solIn)} unit="SOL" sub="+ ZINC in kind" strong />
      </Section>

      {/* ZINC held (all-time) */}
      <Section title="ZINC held (all-time)">
        <Row k="Smelted ZINC in pool" v={znc(smelted)} unit="ZINC" strong />
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-fog-muted">
          Smelted ZINC is claimed winnings (net of the 10% smelt fee) the pool holds in custody. v1 is
          HOLD-only: it is paid out pro-rata in kind when you withdraw, never auto-sold. There is no miner
          and no stORE leg; the value model is simply SOL plus held ZINC.
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
  const valueClass =
    tone === "gold" ? "gradient-text" : tone === "silver" ? "gradient-silver text-glow-silver" : "text-white";
  return (
    <div className={`rounded-lg border border-line bg-ink-800 px-3 py-2.5 ${className ?? ""}`}>
      <div className="label">{label}</div>
      <div className="mt-1 flex items-baseline gap-1 whitespace-nowrap">
        <span className={`num text-base sm:text-lg ${valueClass}`}>{value}</span>
        {unit && <span className="font-mono text-[12px] text-fog-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[12px] leading-tight text-fog-muted">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="section-label mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  k,
  v,
  unit,
  sub,
  strong,
}: {
  k: string;
  v: string;
  unit?: string;
  sub?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 font-mono text-xs">
      <span className="min-w-0 text-fog-muted">{k}</span>
      <span className="flex shrink-0 flex-col items-end text-right leading-tight">
        <span className="whitespace-nowrap">
          <span className={`num ${strong ? "text-gold" : "text-gray-200"}`}>{v}</span>
          {unit && <span className="ml-1 text-[12px] text-fog-muted">{unit}</span>}
        </span>
        {sub && <span className="mt-0.5 text-[11px] text-fog-muted">{sub}</span>}
      </span>
    </div>
  );
}
