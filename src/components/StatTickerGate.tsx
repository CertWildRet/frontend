"use client";

import { usePathname } from "next/navigation";
import { StatTicker } from "./StatTicker";

/**
 * Renders the live StatTicker strip only on the ORE pool page (`/ore`). Kept in
 * the root layout (not inside the page) so the bar stays full-bleed under the
 * header; this gate just scopes it to the one route that should show it.
 */
export function StatTickerGate() {
  const pathname = usePathname();
  if (pathname !== "/ore") return null;
  return <StatTicker />;
}
