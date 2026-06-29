/**
 * The shared centre readout for both pool heroes (ORE board + ZINC ring). One
 * component so the two are identical by construction: state title, the live
 * countdown, the full-coverage tile line (pool-tinted), and the share price.
 * Deliberately tight - four short lines, no redundant context line.
 */
export function PoolReadout({
  title,
  countdown,
  tilesLabel,
  tilesTint,
  price,
}: {
  /** state line: "mining" / "claim window" / "paused" / "..." */
  title: string;
  /** live colon countdown, or null when there is none (halted / not live) */
  countdown?: string | null;
  /** e.g. "25/25 tiles" */
  tilesLabel: string;
  /** pool accent for the tile line (cyan for ORE, purple for ZINC) */
  tilesTint: string;
  /** e.g. "0.3150 SOL / dORE", or null */
  price?: string | null;
}) {
  return (
    <div className="flex flex-col items-center px-2 text-center">
      <span className="font-display text-[19px] font-bold leading-tight text-white">{title}</span>
      {countdown && (
        <span className="mt-1.5 font-mono text-[28px] font-medium leading-none text-gold text-glow-gold">
          {countdown}
        </span>
      )}
      <span
        className="mt-2.5 font-mono text-[9.5px] uppercase tracking-[0.24em]"
        style={{ color: tilesTint }}
      >
        {tilesLabel}
      </span>
      {price && <span className="mt-1.5 font-mono text-[11px] text-fog-muted">{price}</span>}
    </div>
  );
}

export default PoolReadout;
