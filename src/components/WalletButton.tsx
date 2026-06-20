"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useToast } from "./Toast";


export function WalletButton() {
  const { wallets, connected, connecting, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { toast } = useToast();

  if (connected && publicKey) {
    const a = publicKey.toBase58();
    return (
      <button
        onClick={() => disconnect()}
        title="Disconnect"
        className="chip border-line-bright px-3 py-1.5 font-mono text-fog transition hover:border-red hover:text-white"
      >
        <span className="live-dot text-gold" />
        {a.slice(0, 4)}…{a.slice(-4)}
      </button>
    );
  }

  const onConnect = () => {
    const supported = wallets.filter(
      (w) =>
        w.readyState === WalletReadyState.Installed ||
        w.readyState === WalletReadyState.Loadable,
    );
    if (supported.length === 0) {
      toast({
        title: "No supported wallet detected",
        duration: 7000,
        body: (
          <>
            Install a Solana wallet to connect. We recommend{" "}
            <a
              href="https://phantom.app/"
              target="_blank"
              rel="noreferrer"
              className="text-accent-simple underline"
            >
              Phantom
            </a>{" "}
            or{" "}
            <a
              href="https://solflare.com/"
              target="_blank"
              rel="noreferrer"
              className="text-accent-simple underline"
            >
              Solflare
            </a>
            , then refresh.
          </>
        ),
      });
      return;
    }
    setVisible(true);
  };

  return (
    <button onClick={onConnect} disabled={connecting} className="btn-primary px-5">
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
