"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/WalletButton";
import { MobileNav } from "@/components/MobileNav";
import { HeaderTicker } from "@/components/HeaderTicker";
import { NAV_ITEMS, isActiveRoute } from "@/lib/nav";
import {
  tabActiveClass,
  tabActiveGlow,
  tabDisplayFont,
  tabIdleClass,
} from "@/components/primitives/TabBar";

// The active pill's fill + spectral border live in the .spectral-edge class
// (border-box technique); here we only add the outer glow + font.
const activeStyle = { ...tabDisplayFont, ...tabActiveGlow } as const;

/**
 * The single, app-wide top bar - dispersion/glass theme. Renders the prism
 * logo, inline nav with an active-route glass pill, wallet button, and the
 * live market ticker beneath the navbar row.
 */
const chromeStyle = {
  background: "linear-gradient(180deg, rgba(14,18,34,0.85), rgba(7,9,18,0.75))",
  backdropFilter: "blur(22px) saturate(120%)",
  WebkitBackdropFilter: "blur(22px) saturate(120%)",
  boxShadow: "0 8px 32px -12px rgba(0,0,0,0.6)",
  contain: "paint",
  transform: "translateZ(0)",
} as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <div
      className="sticky top-0 z-30 border-b border-white/[0.06]"
      style={chromeStyle}
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

      <header data-site-navbar>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Image
                src="/diamond.webp"
                alt="Diamond Pools"
                width={40}
                height={40}
                priority
                sizes="(max-width: 640px) 36px, 40px"
                className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
              />
              <span
                className="whitespace-nowrap text-[14px] font-semibold tracking-[0.02em] text-[#EAECF6] sm:text-[16px] sm:tracking-[0.03em] md:text-[17px] lg:text-[19px] lg:tracking-[0.04em]"
                style={tabDisplayFont}
              >
                Diamond Pools
              </span>
            </Link>
            <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto sm:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {NAV_ITEMS.map((l) => {
                const active = isActiveRoute(pathname, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    style={active ? activeStyle : tabDisplayFont}
                    className={
                      active
                        ? `${tabActiveClass} shrink-0 px-3.5 py-1.5 text-[14px]`
                        : `${tabIdleClass} shrink-0 px-3 py-1.5 text-[14px]`
                    }
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <WalletButton />
            <MobileNav />
          </div>
        </div>
      </header>

      <div
        className="hidden border-t border-white/[0.06] lg:block"
        style={{ background: "rgba(7,9,18,0.35)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
          <HeaderTicker />
        </div>
      </div>
    </div>
  );
}
