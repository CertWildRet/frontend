"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ToastProvider } from "./Toast";
import { WalletShellActive, needsWalletShell } from "./walletShell";

/**
 * App providers: Toast is always on. Solana wallet/RPC shell is loaded only on
 * routes that need it (/profile, /referral, …) so Ore Data (/stats) stays light.
 *
 * `wallets={[]}` inside SolanaProviders is intentional — wallet-adapter
 * auto-detects Wallet Standard wallets without bundling per-wallet packages.
 */
const SolanaProviders = dynamic(
  () => import("./SolanaProviders").then((m) => m.SolanaProviders),
);

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wallet = needsWalletShell(pathname);

  return (
    <ToastProvider>
      {wallet ? (
        <SolanaProviders>{children}</SolanaProviders>
      ) : (
        <WalletShellActive.Provider value={false}>{children}</WalletShellActive.Provider>
      )}
    </ToastProvider>
  );
}
