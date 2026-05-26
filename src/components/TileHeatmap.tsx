import { formatSol, formatNum } from "@/lib/format";

type Props = {
  perTileSol: number[]; // length 25
  perTileCount: number[]; // length 25
};

/** Visualize the 25-tile ORE board. Color intensity scales with SOL deployed. */
export function TileHeatmap({ perTileSol, perTileCount }: Props) {
  const maxSol = Math.max(0.0001, ...perTileSol);
  const hasData = perTileSol.some((s) => s > 0);

  if (!hasData) {
    return (
      <div className="rounded-md border border-bg-border bg-bg-elevated p-6 text-center text-sm text-muted">
        No deploys on the current round yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {perTileSol.map((sol, i) => {
        const intensity = sol / maxSol; // 0..1
        // Map intensity to a blue-ish bg color via Tailwind (custom inline style)
        const bg = `rgba(59, 130, 246, ${0.08 + intensity * 0.55})`;
        const ring = intensity > 0.85 ? "ring-1 ring-accent-info/60" : "";
        return (
          <div
            key={i}
            className={`relative rounded-md border border-bg-border p-2 text-xs ${ring} transition`}
            style={{ backgroundColor: bg }}
            title={`Tile ${i + 1}: ${formatSol(sol, 4)} SOL · ${formatNum(perTileCount[i])} miners`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-muted">#{i + 1}</span>
              <span className="font-mono text-[10px] text-gray-300">
                {formatNum(perTileCount[i])} 👤
              </span>
            </div>
            <div className="mt-1 font-mono text-xs text-white">
              {formatSol(sol, 4)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
