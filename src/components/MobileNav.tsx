"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActiveRoute } from "@/lib/nav";
import {
  tabActiveClass,
  tabActiveGlow,
  tabDisplayFont,
  tabIdleClass,
} from "@/components/primitives/TabBar";

const ANIM_MS = 300;

/**
 * Mobile-only page navigation. The desktop nav is `hidden sm:flex`, so without
 * this there's no way to move between pages on a phone. A hamburger toggles a
 * panel rendered via a PORTAL to <body>: the sticky header sets `contain:paint`
 * + `transform` (scroll-perf), which would otherwise CLIP an absolutely-
 * positioned dropdown to the header box. The portal escapes that containing
 * block; we anchor the fixed panel to the live header's bottom edge and animate
 * it open/closed with the same ease-in-out drawer (grid-template-rows 0fr->1fr +
 * fade) used by the cycle expanders.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [render, setRender] = useState(false); // portal present (incl. during exit)
  const [shown, setShown] = useState(false); // animated-in state
  const [top, setTop] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Enter/exit: mount then animate in; on close, animate out then unmount.
  useEffect(() => {
    if (open) {
      setRender(true);
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = setTimeout(() => setRender(false), ANIM_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Anchor the portaled panel right below the header (measured live).
  useEffect(() => {
    if (!render) return;
    const measure = () => {
      const header = btnRef.current?.closest("header");
      setTop(header ? header.getBoundingClientRect().bottom : 56);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [render]);

  // Close on route change.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="sm:hidden">
      <button
        ref={btnRef}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-steel/35 text-fog-dim transition hover:border-steel/70 hover:text-white"
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

      {mounted &&
        render &&
        createPortal(
          <div className="sm:hidden">
            {/* tap-outside to close */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] cursor-default"
            />
            {/* ease-in-out drawer: grid-template-rows 0fr->1fr + fade */}
            <div className="fixed left-0 right-0 z-[61]" style={{ top }}>
              <div
                className="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
                style={{ gridTemplateRows: shown ? "1fr" : "0fr", opacity: shown ? 1 : 0 }}
              >
                <div className="overflow-hidden">
                  <div
                    className="border-b border-steel/30 bg-ink/95 backdrop-blur-xl"
                    style={{ boxShadow: "0 10px 30px -12px rgba(0,0,0,0.7)" }}
                  >
                    <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
                      {NAV_ITEMS.map((l) => {
                        const active = isActiveRoute(pathname, l.href);
                        return (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            style={active ? { ...tabDisplayFont, ...tabActiveGlow } : tabDisplayFont}
                            className={
                              active
                                ? `${tabActiveClass} px-3 py-2.5 text-sm`
                                : `${tabIdleClass} px-3 py-2.5 text-sm`
                            }
                          >
                            {l.label}
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
