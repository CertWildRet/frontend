import { formatSol } from "@/lib/format";

type Props = {
  perTileSol: number[]; // length 25
  perTileCount?: number[]; // length 25, optional
};

/** The 25-tile ORE board. Tile intensity scales with SOL deployed. */
export function TileHeatmap({ perTileSol, perTileCount }: Props) {
  const tiles = Array.from({ length: 25 }, (_, i) => perTileSol[i] ?? 0);
  const maxSol = Math.max(0.0001, ...tiles);
  const hasData = tiles.some((s) => s > 0);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-line bg-ink-800/40 p-8 text-center font-mono text-sm text-fog-muted">
        No deploys on the current round yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2">
      {tiles.map((sol, i) => {
        const intensity = sol / maxSol; // 0..1
        const hot = intensity > 0.82;
        return (
          <div
            key={i}
            title={`Tile ${i + 1}: ${formatSol(sol, 4)} SOL${perTileCount ? ` · ${perTileCount[i] ?? 0} miners` : ""}`}
            className={`tile ${hot ? "border-gold/50 shadow-glow-gold" : ""}`}
            style={{
              background: `linear-gradient(160deg, rgba(157, 183, 216,${(intensity * 0.18).toFixed(3)}), rgba(90, 110, 140,${(0.05 + intensity * 0.28).toFixed(3)}))`,
            }}
          >
            <span className="absolute left-2 top-1.5 font-mono text-[12px] text-fog-muted">
              #{i + 1}
            </span>
            {perTileCount ? (
              <span className="absolute right-2 top-1.5 font-mono text-[12px] text-fog-dim">
                {perTileCount[i] ?? 0}
              </span>
            ) : null}
            <span className={`num text-xs ${hot ? "text-gold" : "text-white"}`}>{formatSol(sol, 3)}</span>
          </div>
        );
      })}
    </div>
  );
}
