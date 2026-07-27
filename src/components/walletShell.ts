"use client";

import { createContext } from "react";

/** True when Solana Connection/Wallet providers are mounted for this route. */
export const WalletShellActive = createContext(false);

/** Routes that need wallet + RPC (Connect, vault actions, profile miner). */
export function needsWalletShell(pathname: string): boolean {
  if (pathname === "/ore" || pathname.startsWith("/ore/")) return true;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  if (pathname === "/referral" || pathname.startsWith("/referral/")) return true;
  if (pathname === "/position" || pathname.startsWith("/position/")) return true;
  return false;
}
