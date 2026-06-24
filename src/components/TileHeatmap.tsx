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
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {tiles.map((sol, i) => {
        const intensity = sol / maxSol; // 0..1
        const hot = intensity > 0.82;
        return (
          <div
            key={i}
            title={`Tile ${i + 1}: ${formatSol(sol, 4)} SOL${perTileCount ? ` · ${perTileCount[i] ?? 0} miners` : ""}`}
            className={`tile !p-1.5 sm:!p-2 ${hot ? "border-gold/50 shadow-glow-gold" : ""}`}
            style={{
              background: `linear-gradient(160deg, rgba(157, 183, 216,${(intensity * 0.18).toFixed(3)}), rgba(90, 110, 140,${(0.05 + intensity * 0.28).toFixed(3)}))`,
            }}
          >
            <span className="absolute left-1.5 top-1 font-mono text-[10px] text-fog-muted sm:left-2 sm:top-1.5 sm:text-[12px]">
              #{i + 1}
            </span>
            {perTileCount ? (
              <span className="absolute right-1.5 top-1 font-mono text-[10px] text-fog-dim sm:right-2 sm:top-1.5 sm:text-[12px]">
                {perTileCount[i] ?? 0}
              </span>
            ) : null}
            {/* 2 decimals on mobile (tiny cells), 3 on larger; full precision in the title tooltip */}
            <span className={`num text-[11px] leading-none sm:text-xs ${hot ? "text-gold" : "text-white"}`}>
              <span className="sm:hidden">{formatSol(sol, 2)}</span>
              <span className="hidden sm:inline">{formatSol(sol, 3)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
