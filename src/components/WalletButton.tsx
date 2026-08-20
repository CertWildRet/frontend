"use client";

import { useContext } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { WalletShellActive } from "./walletShell";

const WalletButtonLive = dynamic(
  () => import("./WalletButtonLive").then((m) => m.WalletButtonLive),
  {
    ssr: false,
    loading: () => (
      <button type="button" disabled className="btn-primary px-4 sm:px-5">
        Connect
      </button>
    ),
  },
);

/**
 * Connect control. On wallet routes this talks to the adapter; on /stats and
 * the landing page (no Solana shell) it routes to /profile so wallet JS stays off
 * those pages.
 */
export function WalletButton() {
  const shell = useContext(WalletShellActive);
  if (!shell) return <WalletButtonRedirect />;
  return <WalletButtonLive />;
}

function WalletButtonRedirect() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.push("/profile")} className="btn-primary px-4 sm:px-5">
      Connect
    </button>
  );
}
