"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Info icon with a styled flyover — hover on desktop, tap to toggle on touch.
 * Native `title` alone is unreliable on mobile and slow on desktop.
 * Pass `children` for rich tooltip markup; `title` is always used for aria-label.
 */
export function InfoDot({
  title,
  className = "",
  children,
  wide = false,
  placement = "bottom",
}: {
  title: string;
  className?: string;
  children?: ReactNode;
  /** Wider panel for multi-paragraph tooltips (same mono shell as the default). */
  wide?: boolean;
  /** Flyout direction — use `top` when the trigger sits near the bottom of a clipped card. */
  placement?: "top" | "bottom";
}) {
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
        className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-md border border-line-bright bg-ink-800 px-3 py-2 text-left font-mono text-[10.5px] leading-snug text-fog shadow-xl transition-opacity ${
          wide ? "w-[min(20rem,calc(100vw-2rem))] leading-relaxed" : "w-64 max-w-[min(16rem,calc(100vw-2rem))]"
        } ${placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"} ${
          open ? "opacity-100" : "opacity-0 group-hover/info:opacity-100"
        }`}
      >
        {children ?? title}
        <span
          className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-line-bright bg-ink-800 ${
            placement === "top"
              ? "top-full -translate-y-1/2 border-r border-b"
              : "bottom-full translate-y-1/2 border-l border-t"
          }`}
          aria-hidden
        />
      </span>
    </span>
  );
}
