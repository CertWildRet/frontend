"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useToast } from "./Toast";

const BTN =
  "rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed";

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
        className={`${BTN} border border-bg-border bg-bg-elevated font-mono text-gray-200 hover:border-accent-ultra hover:text-white`}
      >
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
            Install a Solana wallet to connect — we recommend{" "}
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
    <button
      onClick={onConnect}
      disabled={connecting}
      className={`${BTN} bg-accent-simple text-black hover:opacity-90 disabled:opacity-60`}
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
