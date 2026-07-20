import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Grow a chart to fill the leftover vertical space in a grid-stretched card —
 * WITHOUT the feedback loop a flex-1 / measured-container-height approach hits.
 *
 * Why this is safe where the naive version wasn't:
 *   The chart stays a NORMAL fixed-height block, so the card's content height —
 *   and thus the grid row height — is DEFINITE, anchored by `base`. The grid
 *   stretches paired cards to the tallest one; this hook then measures the dead
 *   space strictly BELOW the chart (card content-bottom − svg-bottom) and grows
 *   the chart into it. Both terms are independent of the chart's own height, so
 *   setting the new height does not move the row height — no measure→grow→measure
 *   runaway. Growth is bounded by the dead space (a header-height difference).
 *
 * Uses a CALLBACK ref (not useRef + useEffect): the chart swaps its loading
 * placeholder for the real <svg> once data arrives, so the observed node appears
 * AFTER mount. A one-shot effect would set up before the svg exists and never
 * re-run; a callback ref wires the observer exactly when the svg mounts.
 *
 * Attach the returned ref to the chart <svg>; the card is found via [data-fillcard].
 */
export function useFillHeight(
  base: number,
  enabled: boolean,
): [(el: SVGSVGElement | null) => void, number] {
  const [h, setH] = useState(base);
  const roRef = useRef<ResizeObserver | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const baseRef = useRef(base);
  baseRef.current = base;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const measure = useCallback(() => {
    const svg = svgRef.current;
    const card = svg?.closest("[data-fillcard]") as HTMLElement | null;
    if (!svg || !card || !enabledRef.current) return;
    const cs = getComputedStyle(card);
    const padB = parseFloat(cs.paddingBottom) || 0;
    const bordB = parseFloat(cs.borderBottomWidth) || 0;
    const contentBottom = card.getBoundingClientRect().bottom - bordB - padB;
    const dead = Math.round(contentBottom - svg.getBoundingClientRect().bottom);
    // >2px threshold kills sub-pixel jitter; never shrink below the design floor.
    if (Math.abs(dead) > 2) setH((prev) => Math.max(baseRef.current, prev + dead));
  }, []);

  // Callback ref: (re)wire the observer whenever the svg node mounts/unmounts.
  const setRef = useCallback(
    (el: SVGSVGElement | null) => {
      svgRef.current = el;
      roRef.current?.disconnect();
      roRef.current = null;
      if (!el || !enabledRef.current) return;
      const card = el.closest("[data-fillcard]");
      if (!card) return;
      const ro = new ResizeObserver(() => measure());
      ro.observe(card); // row height / width changes (resize, data, legend rewrap)
      ro.observe(el); //   re-check convergence right after our own height change
      roRef.current = ro;
      measure();
    },
    [measure],
  );

  // When fill is turned off (or base changes), fall back to the fixed floor.
  useEffect(() => {
    if (!enabled) setH(base);
  }, [enabled, base]);

  return [setRef, enabled ? h : base];
}
