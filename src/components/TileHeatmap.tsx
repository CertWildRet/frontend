import { formatSol } from "@/lib/format";

type Props = {
  perTileSol: number[]; // length 25
  perTileCount?: number[]; // length 25, optional
};

/** Visualize the 25-tile ORE board. Color intensity scales with SOL deployed. */
export function TileHeatmap({ perTileSol, perTileCount }: Props) {
  const tiles = Array.from({ length: 25 }, (_, i) => perTileSol[i] ?? 0);
  const maxSol = Math.max(0.0001, ...tiles);
  const hasData = tiles.some((s) => s > 0);

  if (!hasData) {
    return (
      <div className="rounded-md border border-bg-border bg-bg-elevated p-6 text-center text-sm text-muted">
        No deploys on the current round yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {tiles.map((sol, i) => {
        const intensity = sol / maxSol; // 0..1
        const bg = `rgba(34, 197, 94, ${(0.06 + intensity * 0.55).toFixed(3)})`;
        const ring = intensity > 0.85 ? "ring-1 ring-accent-simple/60" : "";
        return (
          <div
            key={i}
            className={`relative rounded-md border border-bg-border p-2 text-xs ${ring} transition`}
            style={{ backgroundColor: bg }}
            title={`Tile ${i + 1}: ${formatSol(sol, 4)} SOL${
              perTileCount ? ` · ${perTileCount[i] ?? 0} miners` : ""
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-muted">#{i + 1}</span>
              {perTileCount && (
                <span className="font-mono text-[10px] text-gray-300">{perTileCount[i] ?? 0} 👤</span>
              )}
            </div>
            <div className="mt-1 font-mono text-xs text-white">{formatSol(sol, 4)}</div>
          </div>
        );
      })}
    </div>
  );
}
