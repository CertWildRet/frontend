"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/WalletButton";
import { MobileNav } from "@/components/MobileNav";
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

      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Diamond Pools"
              width={80}
              height={80}
              priority
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
            <span
              className="whitespace-nowrap text-[16px] font-semibold tracking-[0.08em] text-[#EAECF6] sm:text-[19px] sm:tracking-[0.16em]"
              style={tabDisplayFont}
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
                  style={active ? activeStyle : tabDisplayFont}
                  className={
                    active
                      ? `${tabActiveClass} px-3.5 py-1.5 text-[14px]`
                      : `${tabIdleClass} px-3 py-1.5 text-[14px]`
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
