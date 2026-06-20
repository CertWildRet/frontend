"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type ToastInput = {
  title: string;
  body?: React.ReactNode;
  /** ms before auto-dismiss. Default 7000. */
  duration?: number;
  variant?: "info" | "warn";
};

type Toast = ToastInput & { id: number; duration: number };

const ToastCtx = createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: ToastInput) => {
      const id = ++idRef.current;
      const item: Toast = { duration: 7000, variant: "warn", ...t, id };
      setToasts((ts) => [...ts, item]);
      setTimeout(() => dismiss(id), item.duration);
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto animate-fade-up rounded-xl border bg-ink-900/95 p-4 shadow-glow-gold backdrop-blur-md ${
              t.variant === "warn" ? "border-amber/40" : "border-line-bright"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-sm font-semibold text-white">{t.title}</p>
                {t.body && <div className="mt-1 text-xs leading-relaxed text-fog-dim">{t.body}</div>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-fog-muted transition hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
