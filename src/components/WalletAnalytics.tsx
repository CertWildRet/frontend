"use client";

/**
 * Your full mining history, reconstructed from chain by the analytics service.
 * For the dORE pool: exact cash legs + attributed SOL/ORE won, then a per-cycle
 * table you can expand into the actual crank ROUNDS your capital was deployed
 * into and exactly what each window won. Native units only.
 */
import { useState } from "react";
import { useWalletAnalytics } from "@/hooks/useWalletAnalytics";
import {
  fetchCycleDetail,
  lamportsToSol,
  oreGramsToOre,
  type WalletCycle,
  type PnlBucket,
  type CycleDetail,
} from "@/lib/analytics";
import { formatNum, formatSol, formatPct } from "@/lib/format";

const POOLS = [
  // dORE = the canonical steel accent (#9DB7D8).
  { bucket: 0, label: "dORE", asset: "ORE", color: "#9DB7D8", textc: "#9DB7D8" },
] as const;

const tsToMs = (ts?: string | null) => (ts ? Number(ts) * 1000 : 0);
const when = (ms: number) => (ms ? new Date(ms).toLocaleString() : "·");
const big = (v?: string | number | null) => (v == null ? 0n : BigInt(v));

export function WalletAnalytics({ pubkey }: { pubkey: string }) {
  const { pnl, cycles, provenance, loading, error, reload } = useWalletAnalytics(pubkey);

  if (loading && !pnl) {
    return <div className="card font-mono text-[12px] text-fog-muted">Loading your mining history…</div>;
  }
  if (error) {
    return (
      <div className="card">
        <p className="font-mono text-[12px] text-red">{error}</p>
        <button onClick={reload} className="mt-3 chip text-fog-muted hover:text-white">retry</button>
      </div>
    );
  }
  if (!pnl) return null;

  const anyActivity = pnl.buckets.some(
    (b) =>
      big(b.exact.sol_in_net_lamports) > 0n ||
      cycles.some((c) => c.bucket_id === b.bucket_id),
  );
  if (!anyActivity) {
    return (
      <div className="card font-mono text-[12px] text-fog-muted">
        No deposits or mining activity found for this wallet yet. Once you deposit and the pool cranks a
        round, every round your capital joins shows up here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {POOLS.map((p) => {
        const bucket = pnl.buckets.find((b) => b.bucket_id === p.bucket);
        const myCycles = cycles.filter((c) => c.bucket_id === p.bucket);
        const active = bucket && (big(bucket.exact.sol_in_net_lamports) > 0n || myCycles.length > 0);
        if (!active || !bucket) return null;
        return <PoolSection key={p.bucket} pool={p} bucket={bucket} cycles={myCycles} />;
      })}

      {provenance && (
        <p className="font-mono text-[10.5px] leading-relaxed text-fog-muted">
          {provenance.backfill_complete
            ? "Reconstructed from finalized on-chain history."
            : "Historical backfill still running — figures are provisional and may grow."}{" "}
          Native units only; per-wallet SOL/ORE won is pro-rata by your frozen share of each round (there is no per-wallet bet on chain).{" "}
          ORE mined while a window is open is held in the shared miner (shown per-cycle as &quot;in miner&quot;) and is credited to your won / owed balance at the next settle.
        </p>
      )}
    </div>
  );
}

function PoolSection({
  pool,
  bucket,
  cycles,
}: {
  pool: (typeof POOLS)[number];
  bucket: PnlBucket;
  cycles: WalletCycle[];
}) {
  const won = lamportsToSol(bucket.attributed.sol_won_attr_lamports);
  const oreWon = oreGramsToOre(bucket.attributed.uore_rewards_accrued_grams) + oreGramsToOre(bucket.attributed.uore_refined_accrued_grams);
  const depIn = lamportsToSol(bucket.exact.sol_in_net_lamports);
  const out = lamportsToSol(bucket.exact.sol_out_lamports);
  const owedSol = lamportsToSol((bucket.current?.recoverable_sol_lamports as string) ?? null);
  const owedOre = oreGramsToOre((bucket.current?.owed_uore_rewards_grams as string) ?? null) + oreGramsToOre((bucket.current?.owed_uore_refined_grams as string) ?? null);
  const owedStore = oreGramsToOre((bucket.current?.owed_store_grams as string) ?? null);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">
          {pool.label} mining history
        </h3>
        <span className="chip" style={{ borderColor: `${pool.color}66`, color: pool.textc }}>
          {pool.asset} pool · bucket {pool.bucket}
        </span>
      </div>

      {/* lifetime totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Deposited" value={formatSol(depIn, 4)} unit="SOL" />
        <Stat label="Withdrawn" value={formatSol(out, 4)} unit="SOL" />
        <Stat label="SOL won (settled)" value={formatSol(won, 6)} unit="SOL" tone={pool.textc} strong />
        <Stat label="ORE won (settled)" value={formatNum(oreWon, 6)} unit="ORE" tone={pool.textc} strong />
        <Stat
          label="Owed now (live)"
          value={formatSol(owedSol, 4)}
          unit="SOL"
          sub={`+ ${formatNum(owedOre, 4)} uORE · ${formatNum(owedStore, 4)} stORE`}
        />
      </div>

      {/* per-cycle rounds */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Rounds your capital joined</span>
          <span className="font-mono text-[11px] text-fog-muted">{cycles.length} cycle{cycles.length === 1 ? "" : "s"}</span>
        </div>
        {cycles.length === 0 ? (
          <p className="font-mono text-[12px] text-fog-muted">
            You hold {pool.label} but no settled betting window has attributed to you yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white/[0.02]">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 bg-ink-800/60 px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-fog-muted">
              <span>Cycle</span>
              <span>Window</span>
              <span className="text-right">Your share</span>
              <span className="text-right">SOL worked</span>
              <span className="text-right">ORE / SOL won</span>
            </div>
            {cycles.map((c) => (
              <CycleRow key={`${c.bucket_id}-${c.cycle_id}`} c={c} pool={pool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CycleRow({ c, pool }: { c: WalletCycle; pool: (typeof POOLS)[number] }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<CycleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const frac = Number(c.share_fraction);
  const worked = lamportsToSol(c.sol_attributed_net);
  const wonSol = lamportsToSol(c.sol_recovered_attr);
  const wonOre = oreGramsToOre(c.uore_rewards_accrued_grams) + oreGramsToOre(c.uore_refined_accrued_grams);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !detail && !loading) {
      setLoading(true);
      fetchCycleDetail(c.bucket_id, c.cycle_id)
        .then((d) => setDetail(d.data))
        .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
        .finally(() => setLoading(false));
    }
  };

  return (
    <div className={`rounded-lg transition-colors duration-200 ${open ? "bg-white/[0.022]" : ""}`}>
      <button
        onClick={toggle}
        className="grid w-full grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-3 rounded-lg px-3 py-2.5 text-left font-mono text-[12px] transition-colors hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-1.5 num text-white">
          <span className={`inline-block transition-transform duration-300 ease-in-out ${open ? "rotate-90" : ""}`} style={{ color: pool.textc }}>›</span>
          #{c.cycle_id}
        </span>
        <span className="truncate text-fog-muted">
          {when(tsToMs(c.open_ts))}
          {c.settled ? (
            <span className="ml-2 text-pos">settled</span>
          ) : (
            <span className="ml-2 text-fog-dim">{c.ore_join_status === "round_alive" ? "live" : "open"}</span>
          )}
        </span>
        <span className="text-right text-gray-300">{formatPct(isFinite(frac) ? frac : 0, 2)}</span>
        <span className="text-right num text-gray-300">{formatSol(worked, 4)}</span>
        <span className="text-right num" style={{ color: pool.textc }}>
          {c.settled ? (
            <>
              {formatNum(wonOre, 4)} ORE
              <span className="ml-1 text-fog-muted">/ {formatSol(wonSol, 4)} SOL</span>
            </>
          ) : (
            <span className="text-fog-muted">expand →</span>
          )}
        </span>
      </button>

      {/* smooth ease-in-out drawer: grid-template-rows 0fr->1fr animates auto height.
          The panel inherits the row's open highlight (no separate bg) so expanding
          doesn't flash a different colour. */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1">
            {loading && <p className="font-mono text-[11px] text-fog-muted">Loading rounds…</p>}
            {err && <p className="font-mono text-[11px] text-red">{err}</p>}
            {detail && <CycleExpanded detail={detail} c={c} pool={pool} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function CycleExpanded({ detail, c, pool }: { detail: CycleDetail; c: WalletCycle; pool: (typeof POOLS)[number] }) {
  const cy = detail.cycle;
  const frac = Number(c.share_fraction);
  const s = (k: string) => String(cy[k] ?? "");
  const settled = !!cy.settled;
  const deployedNet = lamportsToSol(s("sol_deployed_net"));
  const recovered = cy.sol_recovered == null ? null : lamportsToSol(s("sol_recovered"));
  const fee = lamportsToSol(s("volume_fee_lamports"));
  const motherlode = oreGramsToOre(s("motherlode_grams"));

  // Per-round ORE = the in-miner watermark GROWTH at each round (checkpoint deltas,
  // in slot order). This is the real "how much ORE this round won" the chain records.
  const oreByRound = new Map<string, number>();
  let cum = 0;
  for (const ck of [...detail.checkpoints].sort((a, b) => Number(a.slot) - Number(b.slot))) {
    const v = oreGramsToOre(ck.rewards_ore) + oreGramsToOre(ck.refined_ore);
    oreByRound.set(ck.round_id, Math.max(0, v - cum));
    cum = v;
  }
  // What the window mined: the settle-credited growth once settled, else the in-miner
  // running total (the cumulative checkpoint = the ORE the miner actually holds,
  // pending the next settle that credits it). Never a misleading 0 while ORE is in the miner.
  const oreCredited = oreGramsToOre(s("uore_rewards_growth")) + oreGramsToOre(s("uore_refined_growth"));
  const oreMined = oreCredited > 0 ? oreCredited : cum;

  return (
    <div className="space-y-3">
      {/* what the WINDOW won + your slice */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Mini k="Deployed (net)" v={`${formatSol(deployedNet, 4)} SOL`} sub={`your ${formatSol(deployedNet * frac, 5)}`} />
        <Mini k="SOL won (window)" v={recovered == null ? "pending settle" : `${formatSol(recovered, 4)} SOL`} sub={recovered == null ? undefined : `your ${formatSol(recovered * frac, 5)}`} />
        <Mini
          k={settled ? "ORE mined (window)" : "ORE in miner (gross)"}
          v={`${formatNum(oreMined, 6)} ORE`}
          sub={`your ${formatNum(oreMined * frac, 6)}${settled ? "" : " · credits at settle"}`}
          tone={pool.textc}
        />
        <Mini k="Rounds" v={String(cy.num_rounds ?? detail.cranks.length)} sub={`fee ${formatSol(fee, 5)} SOL${motherlode > 0 ? ` · motherlode ${formatNum(motherlode, 2)} ORE` : ""}`} />
      </div>

      {/* the actual rounds */}
      {detail.cranks.length > 0 && (
        <div>
          <div className="mb-1 label">Rounds in this window</div>
          <div className="overflow-x-auto rounded-lg bg-white/[0.02]">
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className="bg-ink-800/60 text-left text-fog-muted">
                  <th className="px-2.5 py-1.5 font-normal">Round</th>
                  <th className="px-2.5 py-1.5 font-normal">Time</th>
                  <th className="px-2.5 py-1.5 text-right font-normal">Deployed (net)</th>
                  <th className="px-2.5 py-1.5 text-right font-normal">Your slice</th>
                  <th className="px-2.5 py-1.5 text-right font-normal">ORE won</th>
                  <th className="px-2.5 py-1.5 text-right font-normal">Tiles</th>
                </tr>
              </thead>
              <tbody>
                {detail.cranks.map((r) => {
                  const net = lamportsToSol(r.net_amount_lamports);
                  const tms = r.block_time ? Date.parse(r.block_time) : 0;
                  const ore = oreByRound.get(r.round_id);
                  return (
                    <tr key={r.sig}>
                      <td className="px-2.5 py-1.5 text-white">#{r.round_id}</td>
                      <td className="px-2.5 py-1.5 text-fog-muted">{tms ? new Date(tms).toLocaleTimeString() : "·"}</td>
                      <td className="px-2.5 py-1.5 text-right text-gray-300">{formatSol(net, 4)}</td>
                      <td className="px-2.5 py-1.5 text-right text-gray-400">{formatSol(net * frac, 5)}</td>
                      <td className="px-2.5 py-1.5 text-right" style={{ color: ore ? pool.textc : undefined }}>
                        {ore == null ? "·" : ore === 0 ? <span className="text-fog-dim">0</span> : formatNum(ore, 6)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-fog-muted">{r.squares_selected}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, unit, sub, tone, strong }: { label: string; value: string; unit?: string; sub?: string; tone?: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-white/[0.04] px-3 py-2.5">
      <div className="label">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-base" style={strong && tone ? { color: tone } : undefined}>{value}</span>
        {unit && <span className="font-mono text-[10px] text-fog-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-fog-muted">{sub}</div>}
    </div>
  );
}

function Mini({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div className="font-mono text-[11px]">
      <div className="text-fog-muted">{k}</div>
      <div className="num text-gray-200" style={tone ? { color: tone } : undefined}>{v}</div>
      {sub && <div className="text-[10px] text-fog-dim">{sub}</div>}
    </div>
  );
}
