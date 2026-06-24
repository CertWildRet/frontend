"use client";

import type { PoolStatsData } from "@/hooks/useStats";
import { formatNum, formatSol } from "@/lib/format";

/**
 * Full economic transparency. The on-chain NAV reads ~0 during a BETTING window
 * (the contract doesn't credit the ORE miner's unclaimed rewards until settle),
 * so this panel reports the TRUE recoverable value from the brain's /api/stats:
 * sol_in_vault + miner rewards + in-flight deploy + unclaimed ORE at live price.
 */
export function PoolEconomics({ stats }: { stats: PoolStatsData | null }) {
  const s = stats;
  const sol = (n: number | undefined) => (s ? `${formatSol(n ?? 0, 4)}` : "···");
  const ore = (n: number | undefined) => (s ? `${formatNum(n ?? 0, 4)}` : "···");
  // ORE mined all-time = still unclaimed (recoverable now) + already claimed and
  // withdrawn (during earlier settle cycles). This reconciles the lifetime total
  // with the small "unclaimed" figure above.
  const claimedOre = s ? Math.max(0, s.miner.lifetimeRewardsOre - s.value.recoverableOre) : 0;

  // All-time PnL in $: made = recovered SOL + ORE winnings (both at live price);
  // deployed = SOL deployed (at live price). PnL = made - deployed; % over deployed.
  const solUsd = s?.prices.solUsd ?? 0;
  const oreUsd = s?.prices.oreUsd ?? 0;
  const deployedUsd = s ? s.miner.lifetimeDeployed * solUsd : 0;
  const madeUsd = s ? s.miner.lifetimeRewardsSol * solUsd + s.miner.lifetimeRewardsOre * oreUsd : 0;
  const pnlUsd = madeUsd - deployedUsd;
  const pnlPct = deployedUsd > 0 ? (pnlUsd / deployedUsd) * 100 : 0;
  const pnlReady = !!s && solUsd > 0 && deployedUsd > 0;
  const pnlText = pnlReady
    ? `${pnlUsd < 0 ? "-" : ""}$${formatNum(Math.abs(pnlUsd), 2)} (${pnlPct >= 0 ? "+" : ""}${formatNum(pnlPct, 1)}%)`
    : "···";

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Pool economics</h3>
        <span className="chip border-gold/30 text-gold">full transparency</span>
      </div>
      <p className="mb-5 font-mono text-[12px] leading-relaxed text-fog-muted">
        Every lamport, live. The contract&apos;s NAV reads ~0 while a mining round is in flight; it
        only credits mined SOL + ORE at settle. These are the <span className="text-gray-200">true</span>{" "}
        recoverable values, read straight from the ORE miner.
      </p>

      {/* headline: combined TVL (gold) split into its SOL + ORE shares (silver) */}
      <div className="grid grid-cols-3 gap-3">
        <Big label="True TVL" value={sol(s?.value.tvlSol)} unit="SOL" tone="gold" sub="SOL + ORE combined" />
        <Big label="SOL share" value={sol(s?.value.recoverableSol)} unit="SOL" tone="silver" />
        <Big
          label="ORE share"
          value={ore(s?.value.recoverableOre)}
          unit="ORE"
          tone="silver"
          sub={s ? `≈ ${formatSol(s.value.oreAsSol, 4)} SOL` : undefined}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Big label="Value / share" value={s ? formatNum(s.value.navPerShareTrue, 4) : "···"} unit="SOL" />
        <Big
          label="On-chain NAV"
          value={sol(s?.vault.totalNavOnchain)}
          unit="SOL"
          sub={s && s.phaseLabel === "BETTING" && !s.windowSettled ? "≈0 mid-round (by design)" : undefined}
        />
      </div>

      {/* recoverable-now breakdown */}
      <Section title="Recoverable now (claimable at the next open window)">
        <Row k="In vault (idle SOL)" v={sol(s?.vault.solInVault)} unit="SOL" />
        <Row k="Miner rewards (stake-back + winnings)" v={sol(s?.miner.rewardsSol)} unit="SOL" />
        <Row k="In-flight this round" v={sol(s?.miner.inFlightSol)} unit="SOL" />
        <Row k="Unclaimed ORE" v={ore(s?.value.recoverableOre)} unit="ORE" sub={s ? `≈ ${formatSol(s.value.oreAsSol, 4)} SOL` : undefined} />
        <Row k="Total recoverable" v={sol(s?.value.tvlSol)} unit="SOL" strong />
      </Section>

      {/* lifetime mining (all-time, includes ORE already claimed + withdrawn) */}
      <Section title="Lifetime mining (all-time)">
        <Row k="Total SOL deployed" v={sol(s?.miner.lifetimeDeployed)} unit="SOL" />
        <Row k="Total SOL recovered" v={sol(s?.miner.lifetimeRewardsSol)} unit="SOL" />
        <Row k="Total ORE mined" v={ore(s?.miner.lifetimeRewardsOre)} unit="ORE" strong />
        <Row k="↳ already claimed + withdrawn" v={ore(claimedOre)} unit="ORE" />
        <Row k="↳ still unclaimed" v={ore(s?.value.recoverableOre)} unit="ORE" />
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2 font-mono text-xs">
          <span className="text-white">All-time PnL</span>
          <span className={`num text-sm font-semibold ${pnlUsd >= 0 ? "text-pos" : "text-[#ec9b9b]"}`}>
            {pnlText}
          </span>
        </div>
      </Section>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 font-mono text-[12px] text-fog-muted">
        <span>
          per-round deploy {s ? `${formatNum(s.keeper.minSolPerRound, 3)} SOL` : "···"} · keeper{" "}
          {s?.keeper.mode ?? "···"}
        </span>
        <span>
          SOL ${s?.prices.solUsd ? formatNum(s.prices.solUsd, 2) : "··"} · ORE $
          {s?.prices.oreUsd ? formatNum(s.prices.oreUsd, 2) : "··"}
        </span>
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
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "gold" | "silver";
}) {
  const valueClass =
    tone === "gold"
      ? "gradient-text"
      : tone === "silver"
        ? "gradient-silver text-glow-silver"
        : "text-white";
  return (
    <div className="rounded-lg border border-line bg-ink-800 px-3 py-2.5">
      <div className="label">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`num text-lg ${valueClass}`}>{value}</span>
        {unit && <span className="font-mono text-[12px] text-fog-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[12px] text-fog-muted">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="label mb-2 text-white">{title}</div>
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
    <div className="flex items-baseline justify-between font-mono text-xs">
      <span className="text-fog-muted">{k}</span>
      <span className="flex items-baseline gap-1.5">
        {sub && <span className="text-[12px] text-fog-muted">{sub}</span>}
        <span className={`num ${strong ? "text-gold" : "text-gray-200"}`}>{v}</span>
        {unit && <span className="text-[12px] text-fog-muted">{unit}</span>}
      </span>
    </div>
  );
}
