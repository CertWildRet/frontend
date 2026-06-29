import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ZINC · Diamond Pools",
  description:
    "Deposit SOL to mint dZINC. A keeper mines the ZINC board, smelts the winnings, and holds them - non-custodial, on-chain. Coming soon.",
};

/**
 * ZINC pool (dZINC) page - SCAFFOLD.
 *
 * The dZINC pool (bucket 1) is not deployed yet (Stage 3 follow-up), so this is
 * a labelled placeholder, NOT live data. The stat fields reflect ZINC's real,
 * verified mechanics:
 *   - dZINC      = the pool SHARE token (minted on deposit, like dORE).
 *   - ZINC       = the mined asset (parimutuel 30-tile game).
 *   - Unsmelted ZINC = won ZINC sitting on the miner, pre-smelt (earns refining
 *                      yield ~1%/day + dodges the 10% smelt fee). Analogue of unclaimed ORE.
 *   - Smelted ZINC   = claimed (-10% smelt fee) ZINC the pool HOLDS (basket-v1
 *                      adapter token_in_vault / acc_token_per_share). Analogue of
 *                      stORE held. NOTE: basket-v1 forces ZINC stake_enabled=false
 *                      (v1 ships HOLD-only "until unstake-on-claim ships"); staking
 *                      is a planned toggle, and there is no liquid stZINC token.
 * Min deploy: the ZINC PROTOCOL floor is 0.05 SOL/round (Config.min_deploy_lamports);
 * the ZINC pool's adapter deploys full 30-tile coverage at ~1.5 SOL/round by default
 * (ZINC_PER_TILE_MIN 0.05 x 30 = ZINC_ADAPTER_MIN_ROUND_DEFAULT, admin-tunable via
 * min_round_lamports) for 0% ruin, production-cost gated (mine iff cost-to-mine < ZINC price).
 */
export default function ZincPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">ZINC</h1>
            <span className="chip border-amber/30 text-amber">coming soon</span>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-fog-dim">
            Deposit SOL to mint dZINC. A keeper mines the ZINC board around the clock, smelts the
            winnings, and holds them for you - the same non-custodial, on-chain model as the ORE pool.
          </p>
        </div>
      </header>

      {/* Planned stat surface (placeholders until the dZINC pool is live). */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="TVL" value="···" unit="SOL" accent hint="recoverable value" />
        <Tile label="dZINC price" value="···" unit="SOL" hint="value per share" />
        <Tile label="dZINC supply" value="···" hint="pool share token" />
        <Tile label="Smelted ZINC" value="···" unit="ZINC" hint="claimed (-10%), pool-held" />
        <Tile label="Unsmelted ZINC" value="···" unit="ZINC" hint="won, on the miner" />
        <Tile label="Fee" value="···" hint="on deploy volume" />
      </div>

      <div className="card relative overflow-hidden">
        <h3 className="font-display text-lg font-semibold text-white">How ZINC works</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog-dim">
          ZINC is a parimutuel 30-tile mining game, mechanically close to ORE. Your SOL joins the
          pool, mints dZINC, and a keeper plays the board for you.
        </p>
        <ul className="mt-4 space-y-1.5 font-mono text-xs text-fog-muted">
          <li>› mine → smelt (−10% fee) → hold; you hold dZINC, a pro-rata claim on it all</li>
          <li>› unsmelted winnings earn refining yield (~1%/day) and dodge the smelt fee until claimed</li>
          <li>› v1 holds smelted ZINC (staking is a planned toggle; no liquid stZINC token)</li>
          <li>› protocol min is 0.05 SOL/round; the keeper deploys full 30-tile coverage (~1.5 SOL/round, tunable) for 0% ruin</li>
          <li>› deploy is production-cost gated: mine only when cost-to-mine &lt; the live ZINC price</li>
          <li>› withdraw burns dZINC for your SOL plus your pro-rata smelted ZINC, in kind</li>
        </ul>
        <button
          disabled
          className="mt-5 cursor-not-allowed rounded-lg border border-line px-4 py-2 text-sm text-fog-muted"
        >
          Not yet live
        </button>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  hint,
  accent,
}: {
  label: ReactNode;
  value: string;
  unit?: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card px-4 py-3.5">
      <div className="label">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={`num text-xl ${accent ? "gradient-text" : "text-white"}`}>{value}</span>
        {unit && <span className="font-mono text-xs text-fog-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 font-mono text-[12px] text-fog-muted">{hint}</div>}
    </div>
  );
}
