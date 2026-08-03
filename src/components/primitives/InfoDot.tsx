"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Info icon with a styled flyover — hover on desktop, tap to toggle on touch.
 * Native `title` alone is unreliable on mobile and slow on desktop.
 */
export function InfoDot({ title, className = "" }: { title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <span ref={rootRef} className={`group/info relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-describedby={open ? id : undefined}
        aria-label={title}
        className="inline-flex cursor-help rounded-sm p-0.5 text-inherit outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-steel/50"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6 5.2V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="6" cy="3.6" r="0.7" fill="currentColor" />
        </svg>
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-64 max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-line-bright bg-ink-800 px-3 py-2 text-left font-mono text-[10.5px] leading-snug text-fog shadow-xl transition-opacity ${
          open ? "opacity-100" : "opacity-0 group-hover/info:opacity-100"
        }`}
      >
        {title}
        <span
          className="absolute bottom-full left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 border-l border-t border-line-bright bg-ink-800"
          aria-hidden
        />
      </span>
    </span>
  );
}
