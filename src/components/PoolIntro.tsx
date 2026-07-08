import type { ReactNode } from "react";

/**
 * Shared pool-intro hero: a `panel` with the board visualization on the left
 * and the "full coverage" headline + mechanics bullets on the right. Both the
 * ORE pool (/ore) and the ZINC pool (/zinc) render this with their own board,
 * accent and copy - the ONLY deltas between the two heroes are the individual
 * properties (board, colors, tile count, wording). The layout is identical so
 * the two pages share one feel.
 */
export function PoolIntro({
  board,
  accentFrom,
  accentTo,
  bloom,
  dotGlow,
  tilesLabel,
  blurb,
  bullets,
  eyebrow = "full coverage",
}: {
  /** the left-hand board visualization (ORE 25-tile board / ZINC 30-tile ring) */
  board: ReactNode;
  /** headline + eyebrow-diamond gradient stops */
  accentFrom: string;
  accentTo: string;
  /** corner radial bloom (CSS background value) */
  bloom: string;
  /** eyebrow diamond glow color */
  dotGlow: string;
  /** e.g. "25 tiles" / "30 tiles" */
  tilesLabel: string;
  blurb: string;
  bullets: string[];
  eyebrow?: string;
}) {
  return (
    <div className="panel relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
        style={{ background: bloom }}
      />

      <div className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
        <div className="flex justify-center">{board}</div>

        <div className="text-center md:text-left">
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <span
              className="h-2 w-2 rotate-45"
              style={{
                background: `linear-gradient(135deg,${accentFrom},${accentTo})`,
                boxShadow: `0 0 8px ${dotGlow}`,
              }}
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-fog-muted">
              {eyebrow}
            </span>
          </div>
          <h2 className="mt-3 font-display text-[clamp(1.4rem,3vw,2rem)] font-bold leading-tight text-white">
            The pool covers all{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(to right, ${accentFrom}, ${accentTo})` }}
            >
              {tilesLabel}
            </span>
            .
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-fog-dim md:max-w-lg">{blurb}</p>
          <ul className="mt-4 space-y-1.5 font-mono text-xs text-fog-muted">
            {bullets.map((b, i) => (
              <li key={i}>› {b}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PoolIntro;
