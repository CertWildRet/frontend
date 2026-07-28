"use client";

/**
 * Solana wallet + RPC providers. Dynamically imported only on routes that need
 * a wallet so /stats and the landing page don't pay for web3.js / adapter JS.
 */
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { rpcEndpoint } from "@/lib/cwr";
import { MOCK } from "@/lib/mock";
import { MockWalletAdapter, MockAutoConnect } from "@/lib/mockWallet";
import { WalletShellActive } from "./walletShell";

export function SolanaProviders({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => rpcEndpoint(), []);
  const wallets = useMemo(() => (MOCK ? [new MockWalletAdapter()] : []), []);
  return (
    <WalletShellActive.Provider value={true}>
      <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {MOCK && <MockAutoConnect />}
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </WalletShellActive.Provider>
  );
}
