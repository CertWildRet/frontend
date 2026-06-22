"use client";

// ── Mock wallet for UI design (NEXT_PUBLIC_MOCK === "1") ──────────────────────
// A no-op wallet adapter that reports itself as installed and "connects" to a
// demo public key without any extension, signing, or RPC. Wiring it into the
// real WalletProvider means every wallet-gated component (Mint / Claim /
// Position cards, the header connect pill) renders its CONNECTED state, so you
// can design those screens too. Nothing is ever signed or broadcast.

import { useEffect } from "react";
import {
  BaseSignerWalletAdapter,
  WalletReadyState,
  type WalletName,
} from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { MOCK_TX_SIG } from "./mock";

export const MOCK_WALLET_NAME = "Demo Wallet" as WalletName<"Demo Wallet">;

// A valid base58 pubkey, purely cosmetic (the wrapped-SOL mint). Wrapped in
// try/catch so a bad string can never crash the provider on mount.
function demoPubkey(): PublicKey {
  try {
    return new PublicKey("So11111111111111111111111111111111111111112");
  } catch {
    return PublicKey.default;
  }
}

// Inline (non-base64) data-URI icon so this never depends on `btoa` at runtime.
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' rx='8' fill='%23f5c518'/%3E%3C/svg%3E";

export class MockWalletAdapter extends BaseSignerWalletAdapter {
  name = MOCK_WALLET_NAME;
  url = "https://example.com";
  icon = ICON;
  supportedTransactionVersions = null;

  private _publicKey: PublicKey | null = null;
  private _connecting = false;

  get readyState() {
    return WalletReadyState.Installed;
  }
  get publicKey() {
    return this._publicKey;
  }
  get connecting() {
    return this._connecting;
  }

  async connect(): Promise<void> {
    this._connecting = true;
    this._publicKey = demoPubkey();
    this._connecting = false;
    this.emit("connect", this._publicKey);
  }

  async disconnect(): Promise<void> {
    this._publicKey = null;
    this.emit("disconnect");
  }

  // No-op signer: returns the transaction untouched, never touches a key.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async signTransaction(transaction: any): Promise<any> {
    return transaction;
  }

  // Override the base send so we never hit RPC.
  async sendTransaction(): Promise<string> {
    return MOCK_TX_SIG;
  }
}

/**
 * Drop this anywhere inside <WalletProvider> in mock mode. It selects the demo
 * wallet and connects it on mount, so the app boots already "connected".
 */
export function MockAutoConnect() {
  const { wallet, select, connect, connected, connecting } = useWallet();

  useEffect(() => {
    select(MOCK_WALLET_NAME);
  }, [select]);

  useEffect(() => {
    if (wallet && !connected && !connecting) {
      connect().catch(() => {
        /* mock connect never really fails; ignore */
      });
    }
  }, [wallet, connected, connecting, connect]);

  return null;
}
