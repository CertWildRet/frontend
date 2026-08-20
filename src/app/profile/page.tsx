"use client";

/**
 * /profile — the connected wallet's miner readout.
 *
 * Same stats page shell + MinerDetail panel as /search results, with a compact
 * Profile banner above (no wallet strip — MinerDetail already shows the address).
 */
import { useWallet } from "@solana/wallet-adapter-react";
import { ChartCard } from "@/components/stats/Charts";
import { MinerDetail } from "@/components/stats/MinerDetail";
import { WalletButton } from "@/components/WalletButton";
import pageStyles from "@/app/stats/stats.module.css";
import banner from "./profile.module.css";

export default function ProfilePage() {
  const { connected, publicKey } = useWallet();
  const address = connected && publicKey ? publicKey.toBase58() : null;

  return (
    <div className={pageStyles.page}>
      <div className="space-y-5">
        <header className={banner.banner}>
          <div className={banner.row}>
            <div className={banner.eyebrow}>
              <span className={banner.liveDot} aria-hidden />
              Your Wallet
            </div>
            <h1 className={banner.title}>
              Profile · <span className={banner.titleAccent}>Miner Readout</span>
            </h1>
            <p className={banner.subtitle}>
              Your ORE miner stats for the connected wallet — the same lens as Search Miner.
            </p>
          </div>
        </header>

        {address ? (
          <MinerDetail pubkey={address} collapsible />
        ) : (
          <ChartCard title="Your Miner Stats" subtitle="Connect to Load">
            <p className="max-w-2xl text-sm leading-relaxed text-[#A8B0D4]">
              Connect a wallet and your miner readout loads right here — lifetime deployed and
              returned SOL, ORE earned, hit rate, best and worst rounds, streaks, ORE cost, and
              your cumulative P/L trend, round by round.
            </p>
            <div className="mt-4">
              <WalletButton />
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
