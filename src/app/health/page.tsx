import { getBrainStatus, isBackendReachable } from "@/lib/api";
import { Stat } from "@/components/Stat";
import { StatusBadge } from "@/components/StatusBadge";
import { BackendBanner } from "@/components/BackendBanner";
import { formatNum, formatRelative, formatTime, formatUptime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HealthPage() {
  const [status, online] = await Promise.all([
    getBrainStatus(),
    isBackendReachable(),
  ]);

  const buckets = ["0", "1", "2"]; // Liquid / Staked / Locked (numeric in the brain state map)
  const BUCKET_NAMES: Record<string, string> = {
    "0": "Simple",
    "1": "Refined",
    "2": "Ultra",
  };

  const lastRoundTs = status.lastRound?.ts ?? 0;

  return (
    <>
      <BackendBanner />

      <section className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Brain health</h1>
          <p className="mt-2 text-sm text-muted">
            Live operational state of the cwr-slaves/brain worker. Updates
            every round (~75s) and every NAV report (~5m).
          </p>
        </div>
        {online ? (
          <StatusBadge status="ok" label="Reachable" />
        ) : (
          <StatusBadge status="down" label="Unreachable" />
        )}
      </section>

      <section className="card mb-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Worker</h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat
            label="Uptime"
            value={formatUptime(status.uptimeMs)}
            hint={status.startedAt ? `started ${formatTime(status.startedAt)}` : undefined}
          />
          <Stat label="Rounds processed" value={formatNum(status.roundsSeen)} />
          <Stat
            label="Last round seen"
            value={status.lastRound?.roundId ?? "—"}
            hint={lastRoundTs ? formatRelative(lastRoundTs) : undefined}
          />
          <Stat
            label="Last round result"
            value={
              status.lastRound ? (
                <DeployBreakdown round={status.lastRound} />
              ) : (
                "—"
              )
            }
          />
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          NAV reports (per bucket)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="pb-3">Bucket</th>
                <th className="pb-3">Last NAV report</th>
                <th className="pb-3">External lamports</th>
                <th className="pb-3">Last push to vault</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => {
                const nav = status.lastNavReport?.[b];
                const push = status.lastPush?.[b];
                return (
                  <tr key={b} className="border-t border-bg-border">
                    <td className="py-3 font-medium text-white">
                      {BUCKET_NAMES[b]}
                    </td>
                    <td className="py-3 text-gray-300">
                      {nav ? formatRelative(nav.ts) : "—"}
                    </td>
                    <td className="py-3 font-mono text-gray-300">
                      {nav ? formatNum(Number(nav.externalLamports)) : "—"}
                    </td>
                    <td className="py-3 text-gray-300">
                      {push
                        ? `${formatRelative(push.ts)} • ${formatNum(Number(push.lamports))} lamports`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold text-white">
          SOL-buffer events (Ultra-V3 monitor)
        </h2>
        <p className="mb-3 text-xs text-muted">
          Fires when <code>state.sol &lt; sol_buffer_pct × NAV</code>. V1: detect-and-log only.
          V1.1 will execute the Jupiter ORE→SOL swap.
        </p>
        {Object.values(status.bufferEvents ?? {}).flat().length === 0 ? (
          <p className="text-sm text-muted">No buffer events recorded.</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(status.bufferEvents ?? {}).flatMap(([bucket, events]) =>
              events.slice(-5).map((e, i) => (
                <li
                  key={`${bucket}-${i}`}
                  className="rounded-md border border-bg-border bg-bg-elevated px-3 py-2 text-xs"
                >
                  <span className="font-medium text-white">
                    {BUCKET_NAMES[bucket] ?? bucket}
                  </span>{" "}
                  <span className="text-muted">— {formatRelative(e.ts)}</span>
                  <div className="mt-1 font-mono text-gray-300">
                    held ORE: {formatNum(e.heldOre, 2)} • would sell:{" "}
                    {formatNum(e.wouldSellOre, 2)} • SOL deficit:{" "}
                    {formatNum(e.solDeficitSol, 4)}
                  </div>
                </li>
              )),
            )}
          </ul>
        )}
      </section>
    </>
  );
}

function DeployBreakdown({
  round,
}: {
  round: NonNullable<Awaited<ReturnType<typeof getBrainStatus>>["lastRound"]>;
}) {
  const buckets = Object.entries(round.perBucket ?? {});
  if (buckets.length === 0)
    return <span className="text-muted">no data</span>;
  return (
    <div className="space-y-0.5">
      {buckets.map(([b, outcome]) => (
        <div key={b} className="text-xs text-gray-300">
          <span className="text-muted">{b}:</span>{" "}
          {outcome.decision.kind === "deploy"
            ? `deploy [${outcome.decision.engine ?? "A"}]`
            : `skip`}
        </div>
      ))}
    </div>
  );
}
