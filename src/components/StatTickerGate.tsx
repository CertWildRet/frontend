"use client";

import { usePathname } from "next/navigation";
import { StatTicker } from "./StatTicker";

/**
 * Renders the live stat strip under the header on /ore (the ORE StatTicker). Kept
 * in the root layout (not inside the page) so the bar stays full-bleed under the
 * header; this gate just scopes it to its route.
 */
export function StatTickerGate() {
  const pathname = usePathname();
  if (pathname === "/ore") return <StatTicker />;
  return null;
}
