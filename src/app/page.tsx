import { getBuckets, getRoundState, isBackendReachable } from "@/lib/api";
import { BucketCard } from "@/components/BucketCard";
import { BackendBanner } from "@/components/BackendBanner";
import { StatusBadge } from "@/components/StatusBadge";
import { Stat } from "@/components/Stat";
import { TileHeatmap } from "@/components/TileHeatmap";
import { formatNum, formatSol } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [buckets, round, online] = await Promise.all([
    getBuckets(),
    getRoundState(),
    isBackendReachable(),
  ]);

  return (
    <>
      <BackendBanner />

      <section className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">
            Three buckets. One smart ORE-mining brain.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400 leading-relaxed">
            CWR runs selective bets on the ORE roulette table — only deploying
            on rounds our math says are profitable. Pick a liquidity tier;
            higher lockup = more aggressive strategy = higher yield.
          </p>
        </div>
        <div className="flex gap-3">
          {online ? (
            <StatusBadge status="ok" label="Backend online" />
          ) : (
            <StatusBadge status="warn" label="Backend offline" />
          )}
        </div>
      </section>

      <section className="mb-12">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {buckets.map((b) => (
            <BucketCard key={b.kind} bucket={b} />
          ))}
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Current ORE round
            </h2>
            <p className="text-xs text-muted">
              Live table state — what the brain sees right now.
            </p>
          </div>
          <span className="font-mono text-xs text-muted">
            round #{round.roundId}
          </span>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat
            label="Motherlode pool"
            value={`${formatSol(round.motherlodePoolOre, 1)} ORE`}
            hint="1/625 hit probability per round"
          />
          <Stat
            label="Total deployed"
            value={`${formatSol(round.totalDeployedSol, 2)} SOL`}
          />
          <Stat
            label="Active miners"
            value={formatNum(round.totalMiners)}
          />
          <Stat
            label="Per-tile avg"
            value={`${formatSol(round.totalDeployedSol / 25, 4)} SOL`}
            hint="competition floor"
          />
        </div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-gray-300">
            Per-tile deploys (25 tiles)
          </h3>
          <span className="text-xs text-muted">
            shade ∝ SOL deployed · 👤 = unique miners
          </span>
        </div>
        <TileHeatmap
          perTileSol={round.perTileSol}
          perTileCount={round.perTileCount}
        />
      </section>
    </>
  );
}
