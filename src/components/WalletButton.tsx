"use client";

import dynamic from "next/dynamic";

// Render the wallet-adapter modal button client-only — its label depends on
// wallet state, which differs between server and client (avoids hydration
// mismatch).
const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

export function WalletButton() {
  return <WalletMultiButtonDynamic />;
}
