"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/dispersion.module.css";

/**
 * Wraps a heavy animated subtree and pauses ALL its CSS animations
 * (animation-play-state: paused) whenever it scrolls out of the viewport,
 * resuming ~200px before it scrolls back in.
 *
 * This is the single biggest landing-perf win: the OreBoard tiles, ZINC
 * roulette rings and spectral border shimmers otherwise keep compositing and
 * painting forever, even when scrolled far off-screen. Pausing them off-screen
 * removes the bulk of steady-state paint with zero visual change while visible.
 *
 * SMIL animations (the APY rider dot) are not affected by CSS play-state, so
 * any descendant <svg> with SMIL is paused/resumed via pauseAnimations().
 */
export function PauseWhenOffscreen({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const toggleSmil = (run: boolean) => {
      el.querySelectorAll("svg").forEach((svg) => {
        const s = svg as SVGSVGElement & {
          pauseAnimations?: () => void;
          unpauseAnimations?: () => void;
        };
        if (run) s.unpauseAnimations?.();
        else s.pauseAnimations?.();
      });
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        const off = !entry.isIntersecting;
        setPaused(off);
        toggleSmil(!off);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${className} ${paused ? styles.offscreenPaused : ""}`}>
      {children}
    </div>
  );
}
