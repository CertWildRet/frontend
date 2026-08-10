"use client";

/**
 * Toasts, on top of `sonner`.
 *
 * This was a hand-rolled context provider: bottom-right only, no de-duplication, no
 * hover-pause, and a setTimeout per toast that was never cleared. That is fine for the
 * one-off "no wallet detected" notice it was written for, but not for a toast attached to
 * a button a user can click repeatedly, which is what the "All" timeframe needs.
 *
 * sonner handles stacking, timers, hover-pause, swipe-dismiss, reduced-motion and the
 * screen-reader announcements. What it does NOT do is decide how a toast looks, so the
 * card below is still ours, rendered through `toast.custom` with the same classes the
 * previous implementation used. The public API (`ToastProvider`, `useToast`, `ToastInput`)
 * is unchanged so existing call sites keep working untouched.
 */

import { useCallback } from "react";
import { Toaster, toast as sonnerToast } from "sonner";

export type ToastInput = {
  title: string;
  body?: React.ReactNode;
  /** ms before auto-dismiss. Default 7000. */
  duration?: number;
  variant?: "info" | "warn";
  /**
   * Stable identity. Firing again with the same key REPLACES the live toast instead of
   * stacking a duplicate, which is what makes a toast safe to attach to a control the
   * user can hammer.
   */
  key?: string;
};

/**
 * Top-right: the bottom-right corner is where chart tooltips and the footer CTAs live, and
 * a toast that covers the thing the user just clicked is worse than no toast.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        expand
        visibleToasts={3}
        gap={10}
        offset={18}
        toastOptions={{ unstyled: true }}
      />
    </>
  );
}

export function useToast() {
  const toast = useCallback((t: ToastInput) => {
    const variant = t.variant ?? "warn";
    sonnerToast.custom(
      (id) => (
        <div
          role="status"
          className={`w-[356px] max-w-[calc(100vw-2rem)] rounded-xl border bg-ink-900/95 p-4 shadow-glow-gold backdrop-blur-md ${
            variant === "warn" ? "border-amber/40" : "border-line-bright"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-white">{t.title}</p>
              {t.body && <div className="mt-1 text-xs leading-relaxed text-fog-dim">{t.body}</div>}
            </div>
            <button
              onClick={() => sonnerToast.dismiss(id)}
              aria-label="Dismiss"
              className="shrink-0 text-fog-muted transition hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      ),
      { duration: t.duration ?? 7000, id: t.key },
    );
  }, []);

  /**
   * Retire a keyed toast early. A "please hold" notice has to be able to disappear the
   * moment the thing arrives, otherwise it sits there telling the user to wait for work
   * that already finished, which is its own kind of lying.
   */
  const dismiss = useCallback((key: string) => sonnerToast.dismiss(key), []);

  return { toast, dismiss };
}
