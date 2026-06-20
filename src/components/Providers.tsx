"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { rpcEndpoint } from "@/lib/cwr";
import { ToastProvider } from "./Toast";

/**
 * Client-side provider boundary: RPC connection + wallet adapter + connect modal.
 *
 * `wallets={[]}` is intentional — modern wallet-adapter auto-detects any wallet
 * implementing the Wallet Standard (Phantom, Solflare, Backpack, …), so we
 * don't bundle per-wallet adapter packages (that's what dragged in the
 * Trezor/Stellar/USB multi-chain subtree we removed).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => rpcEndpoint(), []);
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <ToastProvider>{children}</ToastProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
