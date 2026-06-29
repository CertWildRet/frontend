"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActiveRoute } from "@/lib/nav";

/**
 * Mobile-only page navigation. The desktop nav is `hidden sm:flex`, so without
 * this there is no way to move between pages on a phone. A hamburger toggles a
 * full-width panel anchored to the bottom of the sticky header.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-fog-dim transition hover:border-gold/40 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          {open ? (
            <>
              <path d="M4 4l10 10" />
              <path d="M14 4L4 14" />
            </>
          ) : (
            <>
              <path d="M2 5h14" />
              <path d="M2 9h14" />
              <path d="M2 13h14" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <>
          {/* tap-outside to close */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div className="absolute left-0 right-0 top-full z-30 border-b border-line/80 bg-ink/95 backdrop-blur-xl">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
              {NAV_ITEMS.map((l) => {
                const active = isActiveRoute(pathname, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-md px-3 py-2.5 text-sm transition ${
                      active ? "bg-ink-800 text-white" : "text-fog-dim hover:bg-ink-800 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
