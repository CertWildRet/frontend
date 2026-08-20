"use client";

/**
 * /profile — banner, Mining Pool promo, then collapsible MinerDetail.
 */
import Link from "next/link";
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
            <h1 className={banner.title}>Your Profile</h1>
          </div>
        </header>

        <ChartCard title="dORE Mining Pool Is Available">
          <p className="max-w-2xl text-sm leading-relaxed text-[#A8B0D4]">
            Put in SOL. Hold dORE. The vault mines the rounds worth playing and turns wins back
            into SOL.
          </p>
          <div className="mt-4">
            <Link href="/pools" className="btn-primary inline-flex px-5 py-2.5">
              View dORE Details
            </Link>
          </div>
        </ChartCard>

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
