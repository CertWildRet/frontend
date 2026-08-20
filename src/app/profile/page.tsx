"use client";

/**
 * /profile — the connected wallet's miner readout.
 *
 * Uses the same stats page shell + MinerDetail panel as /search results
 * (lifetime census, event-window P&L, best/worst rounds, streaks, ORE cost,
 * cumulative P/L trend, exact round history). Connect loads the panel for
 * the active wallet; no Profile-only hero chrome.
 */
import { useWallet } from "@solana/wallet-adapter-react";
import { ChartCard } from "@/components/stats/Charts";
import { MinerDetail } from "@/components/stats/MinerDetail";
import { WalletButton } from "@/components/WalletButton";
import styles from "@/app/stats/stats.module.css";

export default function ProfilePage() {
  const { connected, publicKey } = useWallet();
  const address = connected && publicKey ? publicKey.toBase58() : null;

  return (
    <div className={styles.page}>
      <div className="space-y-5">
        {address ? (
          <MinerDetail pubkey={address} />
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
