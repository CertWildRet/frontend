"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a heavy animated subtree and pauses ALL its CSS animations
 * (animation-play-state: paused) whenever it scrolls out of the viewport,
 * resuming ~200px before it scrolls back in.
 *
 * Uses the global `.offscreenPaused` class in globals.css so this helper
 * does not pull landing `dispersion.module.css` into every consumer (e.g. /stats).
 *
 * SMIL animations are paused/resumed via SVG pauseAnimations().
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
    <div ref={ref} className={`${className}${paused ? " offscreenPaused" : ""}`}>
      {children}
    </div>
  );
}
