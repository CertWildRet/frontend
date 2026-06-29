"use client";

import { usePathname } from "next/navigation";
import { StatTicker } from "./StatTicker";
import { ZincStatTicker } from "./zinc/ZincStatTicker";

/**
 * Renders the live stat strip under the header on the pool pages: the ORE
 * StatTicker on /ore, the dZINC ZincStatTicker on /zinc. Kept in the root layout
 * (not inside the page) so the bar stays full-bleed under the header; this gate
 * just scopes each ticker to its route.
 */
export function StatTickerGate() {
  const pathname = usePathname();
  if (pathname === "/ore") return <StatTicker />;
  if (pathname === "/zinc") return <ZincStatTicker />;
  return null;
}
