"use client";

import { formatNum, formatPct } from "@/lib/format";
import { InfoDot } from "@/components/primitives/InfoDot";

/**
 * Hit-rate tile — circular progress ring + percent + wins/rounds caption.
 * Optional expected rate (from avg tiles / 25) drawn as an outer reference arc.
 */
export function HitRate({
  rate,
  expectedRate,
  avgTiles,
  sampleRounds,
  hits,
  rounds,
  className = "",
}: {
  /** Hit fraction in [0, 1], or null when unknown. */
  rate: number | null;
  /** Fair expected hit fraction from avg tiles / 25, or null when unknown. */
  expectedRate?: number | null;
  /** Average distinct tiles covered over the sample window. */
  avgTiles?: number | null;
  /** How many recent rounds the avg/expected was computed from. */
  sampleRounds?: number | null;
  hits?: number | null;
  rounds?: number | null;
  className?: string;
}) {
  const pct = rate != null ? Math.max(0, Math.min(1, rate)) : 0;
  const expPct = expectedRate != null ? Math.max(0, Math.min(1, expectedRate)) : null;
  const size = 40;
  const strokeAct = 3.5;
  const strokeExp = 2;
  const gap = expPct != null ? 3 : 0;
  const rExp = (size - strokeExp) / 2;
  const rAct = expPct != null ? rExp - strokeExp / 2 - gap - strokeAct / 2 : (size - strokeAct) / 2;
  const cAct = 2 * Math.PI * rAct;
  const cExp = 2 * Math.PI * rExp;
  const actOffset = cAct * (1 - pct);
  const expOffset = expPct != null ? cExp * (1 - expPct) : null;

  const tipParts = [
    "Share of captured rounds that paid a win",
    expPct != null && avgTiles != null && sampleRounds != null
      ? `Expected ${formatPct(expPct)} from avg ${formatNum(avgTiles, 1)} tiles over last ${formatNum(sampleRounds)} rounds (tiles ÷ 25)`
      : null,
  ].filter(Boolean);
  const tip = tipParts.join(". ");

  return (
    <div className={`rounded-xl border border-line px-3.5 py-2.5 ${className || "bg-ink-800"}`}>
      <div
        className="flex items-center gap-1.5 text-[13px] font-medium leading-none text-[#9AA3C8]"
        style={{ fontFamily: "var(--font-subtext)" }}
      >
        Hit rate
        <InfoDot title={tip} className="text-fog-muted" />
      </div>
      <div className="mt-1.5 flex items-center gap-2.5">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="shrink-0 -rotate-90"
          aria-hidden
        >
          {/* Expected track + arc (outer) */}
          {expPct != null && expOffset != null && (
            <>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={rExp}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={strokeExp}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={rExp}
                fill="none"
                stroke="rgba(154, 107, 255, 0.85)"
                strokeWidth={strokeExp}
                strokeLinecap="round"
                strokeDasharray={cExp}
                strokeDashoffset={expOffset}
              />
            </>
          )}
          {/* Actual track + arc (inner) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={rAct}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeAct}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={rAct}
            fill="none"
            stroke="#5B6CFF"
            strokeWidth={strokeAct}
            strokeLinecap="round"
            strokeDasharray={cAct}
            strokeDashoffset={actOffset}
          />
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#EAECF6"
            fontSize="10"
            fontFamily="'JetBrains Mono Variable', ui-monospace, monospace"
            fontWeight="600"
            transform={`rotate(90 ${size / 2} ${size / 2})`}
          >
            {rate != null ? `${Math.round(pct * 100)}%` : "·"}
          </text>
        </svg>
        <div className="min-w-0">
          <div className="num text-[22px] leading-none tracking-tight text-white">
            {rate != null ? formatPct(rate) : "···"}
          </div>
          {hits != null && rounds != null && rounds > 0 && (
            <div className="subtext mt-0.5">
              {formatNum(hits)} wins from {formatNum(rounds)} rounds
            </div>
          )}
          {expPct != null && (
            <div className="subtext mt-0.5 text-[#C4B0FF]">
              vs {formatPct(expPct)} expected
              {avgTiles != null ? ` · ${formatNum(avgTiles, 1)} tiles` : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
