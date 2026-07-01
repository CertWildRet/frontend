"use client";

import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./ZincRoulette.module.css";

/* ════════════════════════════════════════════════════════════════
   ZincRoulette - ZINC's signature 30-tile roulette ring.

   30 tiles arranged in a circle (roulette-wheel style) with a stat
   readout in the centre. Rendered in the Diamond Pools spectral style
   (NOT ZINC's amber look): dZINC purple -> pink gradient on dark glass,
   per-tile glow, faint mono tile numbers (1..30).

   Full-coverage (litTiles='all') is the canonical dZINC representation:
   the pool always deploys all 30 tiles. Un-lit tiles render dim.
   ════════════════════════════════════════════════════════════════ */

const TILE_COUNT = 30;
/* dZINC accent endpoints (default 'zinc' brand palette) */
const PURPLE = "#9A6BFF";
const PINK = "#FF5AC8";
/* 'steel' palette — the silver/steel tones shared with the dORE surface
   (echoes TileHeatmap's rgba(157,183,216) / rgba(90,110,140)). Used by the
   Live crank panel so dZINC's keeper board matches dORE's at a glance. */
const STEEL_LIGHT = "#9DB7D8";
const STEEL_DARK = "#5A6E8C";

type Props = {
  size?: number;
  /** which tiles are "lit" (covered). 'all' = full 30-tile coverage (default). */
  litTiles?: number[] | "all";
  /** centre readout (stat / facet / label). */
  center?: ReactNode;
  /** slow ring rotate + per-tile shimmer (disabled under reduced-motion). */
  animated?: boolean;
  className?: string;
  /** accent palette. 'zinc' = purple→pink (brand default, landing hero);
      'steel' = the dORE silver/steel tones (Live crank panel, for parity). */
  palette?: "zinc" | "steel";
};

/* polar -> cartesian on a unit viewBox centred at (cx,cy). angle in deg, 0 = up. */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** A single annular-sector (trapezoid) tile path between two radii / two angles. */
function sectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  a0: number,
  a1: number,
) {
  const oStart = polar(cx, cy, rOuter, a0);
  const oEnd = polar(cx, cy, rOuter, a1);
  const iEnd = polar(cx, cy, rInner, a1);
  const iStart = polar(cx, cy, rInner, a0);
  return [
    `M ${oStart.x.toFixed(2)} ${oStart.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${oEnd.x.toFixed(2)} ${oEnd.y.toFixed(2)}`,
    `L ${iEnd.x.toFixed(2)} ${iEnd.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 0 0 ${iStart.x.toFixed(2)} ${iStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function ZincRoulette({
  size = 320,
  litTiles = "all",
  center,
  animated = true,
  className = "",
  palette = "zinc",
}: Props) {
  const uid = useId().replace(/[:]/g, "");
  const litFill = `zinc-lit-${uid}`;
  const dimFill = `zinc-dim-${uid}`;
  const glow = `zinc-glow-${uid}`;
  const sweepGrad = `zinc-sweep-${uid}`;

  // Accent endpoints + glass tints per palette. 'steel' mirrors the dORE
  // surface so the Live crank board reads as the same family as dORE's.
  const steel = palette === "steel";
  const accentLight = steel ? STEEL_LIGHT : PURPLE;
  const accentDark = steel ? STEEL_DARK : PINK;
  const dimStopA = steel ? "rgba(157,183,216,0.10)" : "rgba(154,107,255,0.10)";
  const dimStopB = steel ? "rgba(90,110,140,0.06)" : "rgba(255,90,200,0.06)";
  const hubStroke = steel ? "rgba(157,183,216,0.24)" : "rgba(154,107,255,0.28)";

  const VB = 200;
  const cx = VB / 2;
  const cy = VB / 2;
  const rOuter = 94;
  const rInner = 62;
  const gapDeg = 1.8; // gap between tiles (in degrees)
  const step = 360 / TILE_COUNT;

  const isLit = (i: number) =>
    litTiles === "all" ? true : litTiles.includes(i + 1);

  const tiles = Array.from({ length: TILE_COUNT }, (_, i) => {
    const a0 = i * step + gapDeg / 2;
    const a1 = (i + 1) * step - gapDeg / 2;
    const mid = (a0 + a1) / 2;
    const labelPos = polar(cx, cy, (rInner + rOuter) / 2, mid);
    return {
      i,
      d: sectorPath(cx, cy, rInner, rOuter, a0, a1),
      lit: isLit(i),
      labelX: labelPos.x,
      labelY: labelPos.y,
      delay: ((i % 6) * 0.18 + Math.floor(i / 6) * 0.05).toFixed(2),
    };
  });

  return (
    <div className={`${styles.root} ${className}`} style={{ width: size, height: size }}>
      {/* the ring + tile numbers are decorative; the live centre readout below
          is the meaningful content, so only the SVG is hidden from SR. */}
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        className="block h-full w-full"
        aria-hidden
      >
        <defs>
          {/* lit tile: accent gradient (zinc purple→pink, or dORE steel) */}
          <linearGradient id={litFill} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={accentLight} />
            <stop offset="1" stopColor={accentDark} />
          </linearGradient>
          {/* dim (un-covered) tile */}
          <linearGradient id={dimFill} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={dimStopA} />
            <stop offset="1" stopColor={dimStopB} />
          </linearGradient>
          {/* rotating highlight sweep over the ring */}
          <linearGradient id={sweepGrad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="0.46" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="0.54" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* faint outer + inner guide rings */}
        <circle
          cx={cx}
          cy={cy}
          r={rOuter + 2.5}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.8"
        />
        <circle
          cx={cx}
          cy={cy}
          r={rInner - 2.5}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.8"
        />

        {/* the tile ring (rotates slowly when animated) */}
        <g className={animated ? styles.ring : undefined}>
          {tiles.map((t) => (
            <g
              key={t.i}
              className={animated && t.lit ? styles.tile : undefined}
              style={
                animated && t.lit
                  ? ({ animationDelay: `${t.delay}s` } as CSSProperties)
                  : undefined
              }
            >
              <path
                d={t.d}
                fill={t.lit ? `url(#${litFill})` : `url(#${dimFill})`}
                fillOpacity={t.lit ? 0.92 : 1}
                stroke={
                  t.lit ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.06)"
                }
                strokeWidth="0.6"
                filter={t.lit ? `url(#${glow})` : undefined}
              />
              {/* faint tile number 1..30, mono */}
              <text
                x={t.labelX}
                y={t.labelY}
                dy="2.6"
                textAnchor="middle"
                fontFamily="'JetBrains Mono Variable', monospace"
                fontSize="6.2"
                fill={t.lit ? "rgba(255,255,255,0.62)" : "rgba(234,236,246,0.18)"}
              >
                {t.i + 1}
              </text>
            </g>
          ))}

          {/* travelling specular sweep across the lit ring */}
          {animated && (
            <g className={styles.sweep}>
              <circle
                cx={cx}
                cy={cy}
                r={(rInner + rOuter) / 2}
                fill="none"
                stroke={`url(#${sweepGrad})`}
                strokeWidth={rOuter - rInner}
                opacity="0.5"
              />
            </g>
          )}
        </g>

        {/* hub disc behind the centre readout */}
        <circle
          cx={cx}
          cy={cy}
          r={rInner - 4}
          fill="rgba(10,12,22,0.72)"
          stroke={hubStroke}
          strokeWidth="0.8"
        />
      </svg>

      {/* centre readout - HTML overlay so it can hold rich content + stays
          crisp / upright regardless of the ring rotation. */}
      {center != null && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center"
          style={{ width: `${((rInner - 6) / VB) * 2 * size}px` }}
        >
          {center}
        </div>
      )}
    </div>
  );
}

export default ZincRoulette;
