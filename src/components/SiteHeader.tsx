"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/WalletButton";
import { MobileNav } from "@/components/MobileNav";
import { NAV_ITEMS, isActiveRoute } from "@/lib/nav";

const display = { fontFamily: "'Chakra Petch', sans-serif" } as const;

const activeStyle = {
  ...display,
  background: "linear-gradient(110deg, rgba(91,108,255,0.30), rgba(154,107,255,0.24))",
  boxShadow:
    "0 0 24px -6px rgba(91,108,255,0.65), inset 0 1px 0 rgba(255,255,255,0.15)",
} as const;

/** The dispersion prism mark - spectral-stroke triangle (matches the /3 logo). */
function PrismMark({ className = "" }: { className?: string }) {
  const sp = "url(#site-spectral)";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3 21 19 3 19 12 3Z" stroke={sp} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 3 12 19" stroke={sp} strokeWidth="1" opacity="0.6" />
      <path d="M2 12 12 11 22 12" stroke="#EAECF6" strokeWidth="0.9" opacity="0.5" />
    </svg>
  );
}

/**
 * The single, app-wide top bar - dispersion/glass theme. Renders the prism
 * logo, the nav with an active-route glass pill, and the wallet button. Used
 * by the root layout so every page (including /3) shares one header.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-30"
      style={{
        background: "linear-gradient(180deg, rgba(14,18,34,0.85), rgba(7,9,18,0.75))",
        backdropFilter: "blur(22px) saturate(120%)",
        WebkitBackdropFilter: "blur(22px) saturate(120%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 8px 32px -12px rgba(0,0,0,0.6)",
        // promote the sticky bar to its own compositor layer + contain repaints
        // so its backdrop-filter:blur isn't re-sampled against everything behind
        // it on every scroll frame (a major scroll-jank source).
        contain: "paint",
        transform: "translateZ(0)",
      }}
    >
      {/* spectral gradient def for the prism mark */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id="site-spectral" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22E0E6" />
            <stop offset="30%" stopColor="#5B6CFF" />
            <stop offset="55%" stopColor="#9A6BFF" />
            <stop offset="80%" stopColor="#FF5AC8" />
            <stop offset="100%" stopColor="#FFC061" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="glass grid h-10 w-10 place-items-center rounded-xl">
              <PrismMark className="h-5 w-5" />
            </span>
            <span
              className="text-[19px] font-semibold tracking-[0.16em] text-[#EAECF6]"
              style={display}
            >
              Diamond Pools
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((l) => {
              const active = isActiveRoute(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  style={active ? activeStyle : display}
                  className={
                    active
                      ? "spectral-edge relative rounded-lg px-3.5 py-1.5 text-[14px] font-semibold text-white"
                      : "rounded-lg border border-transparent px-3 py-1.5 text-[14px] font-semibold text-[#C6CCEC] transition-colors hover:bg-[rgba(234,236,246,0.06)] hover:text-[#EAECF6]"
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <WalletButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
