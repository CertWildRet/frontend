"use client";

/**
 * useHoverIndex — a chart hover index that cannot outlive the data it points at.
 *
 * Every hand-rolled chart stores the hovered point as an ARRAY INDEX, clamped to
 * the series length at pointer time. But the series can shrink underneath a live
 * hover — a range switch, a source toggle, or a poll returning fewer points —
 * and the next render then reads `series[staleIndex]`, which is `undefined`, and
 * the tooltip crashes the page ("Cannot read properties of undefined").
 *
 * Clamping happens on READ, derived during render: the stored index stays put
 * (so a series that grows back keeps the hover) while anything past the current
 * end simply reads as "not hovering". No effect, no extra render, no stale frame
 * where the old index is still live.
 */
import { useState } from "react";

export function useHoverIndex(length: number): [number | null, (i: number | null) => void] {
  const [hover, setHover] = useState<number | null>(null);
  const safe = hover != null && hover >= 0 && hover < length ? hover : null;
  return [safe, setHover];
}
