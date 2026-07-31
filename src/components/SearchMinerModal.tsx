"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ADDRESS_RE, SearchMinerBox } from "@/components/SearchMinerBox";

type SearchMinerModalContextValue = {
  openSearchMiner: () => void;
};

const SearchMinerModalContext = createContext<SearchMinerModalContextValue | null>(null);

export function useSearchMinerModal(): SearchMinerModalContextValue {
  const ctx = useContext(SearchMinerModalContext);
  if (!ctx) throw new Error("useSearchMinerModal must be used within SearchMinerModalProvider");
  return ctx;
}

export function SearchMinerModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSearchMiner = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);

  return (
    <SearchMinerModalContext.Provider value={{ openSearchMiner }}>
      {children}
      <SearchMinerModal open={open} onClose={onClose} />
    </SearchMinerModalContext.Provider>
  );
}

function SearchMinerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const [qInput, setQInput] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement;
      setRender(true);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
    setShown(false);
    const t = setTimeout(() => {
      setRender(false);
      setQInput("");
      (lastFocus.current as HTMLElement | null)?.focus?.();
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [render, onClose]);

  useEffect(() => {
    if (shown) closeRef.current?.focus();
  }, [shown]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const next = qInput.trim();
      if (ADDRESS_RE.test(next)) {
        router.push(`/search?q=${encodeURIComponent(next)}`);
        onClose();
      }
    }, 350);
    return () => clearTimeout(t);
  }, [qInput, open, router, onClose]);

  if (!render || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[12vh] backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none sm:items-center sm:pt-4 ${shown ? "opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-miner-modal-title"
    >
      <div
        className={`my-auto w-full max-w-2xl origin-center transition-all duration-200 ease-out motion-reduce:transition-none ${shown ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-fog-muted transition-colors hover:bg-white/5 hover:text-fog focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            ✕
          </button>
        </div>
        <div id="search-miner-modal-title" className="sr-only">
          Search Miner
        </div>
        <SearchMinerBox
          value={qInput}
          onChange={setQInput}
          onClear={() => setQInput("")}
          autoFocus={shown}
          inputClassName="min-w-0 flex-1 rounded-md border border-line bg-ink-800 px-3 py-2 font-mono text-[13px] text-white placeholder:text-fog-muted focus:border-steel focus:outline-none"
        />
      </div>
    </div>,
    document.body,
  );
}
