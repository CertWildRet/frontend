"use client";

/**
 * /pools — Mining Pool · dORE. Wallet-gated: connect first, then the vault page.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  IconChartLine,
  IconEye,
  IconLock,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import { ChartCard } from "@/components/stats/Charts";
import { MiningPoolTechDetails } from "@/components/pools/MiningPoolTechModal";
import { DepositPreview } from "@/components/pools/DepositPreview";
import { WalletButton } from "@/components/WalletButton";
import styles from "@/app/stats/stats.module.css";

function CopyTile({ title, body, icon }: { title: string; body: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5">
      <div className="mb-2 text-[#C7D0EA]" aria-hidden>
        {icon}
      </div>
      <h3
        className="text-[15px] font-semibold tracking-tight text-[#EAECF6]"
        style={{ fontFamily: "'Chakra Petch', sans-serif" }}
      >
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[#A8B0D4]">{body}</p>
    </div>
  );
}

export default function PoolsPage() {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className={styles.page}>
        <div className="space-y-5">
          <header className="space-y-2">
            <h1
              className="text-[28px] font-bold tracking-tight text-[#EAECF6] sm:text-[32px]"
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              dORE Pooled Mining
            </h1>
            <p className="max-w-2xl text-base font-medium leading-snug text-[#EAECF6]">
              Put in SOL. Hold dORE. We mine the rounds worth playing.
            </p>
          </header>
          <ChartCard title="Connect to View" subtitle="Wallet Required">
            <p className="max-w-2xl text-sm leading-relaxed text-[#A8B0D4]">
              The Mining Pool is for connected wallets. Connect to see the vault, the mock
              deposit quote, and how rounds are played or skipped.
            </p>
            <div className="mt-4">
              <WalletButton />
            </div>
          </ChartCard>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="space-y-5">
        <header className="space-y-2">
          <h1
            className="text-[28px] font-bold tracking-tight text-[#EAECF6] sm:text-[32px]"
            style={{ fontFamily: "'Chakra Petch', sans-serif" }}
          >
            dORE Pooled Mining
          </h1>
          <p className="max-w-2xl text-base font-medium leading-snug text-[#EAECF6]">
            Put in SOL. Hold dORE. We mine the rounds worth playing.
          </p>
        </header>

        <ChartCard title="How It's Built">
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CopyTile
              icon={<IconChartLine size={18} stroke={1.6} />}
              title="Six Months of Backtesting"
              body="We ran the rules against the full on-chain history — every round in that window."
            />
            <CopyTile
              icon={<IconLock size={18} stroke={1.6} />}
              title="Frozen Rules"
              body="Nothing is tuned live. The bar to play, the size of each bet, and the stop rules stay as tested."
            />
            <CopyTile
              icon={<IconPlayerSkipForward size={18} stroke={1.6} />}
              title="Built to Sit Out"
              body="In that history, more than half of rounds didn't clear the bar. Skipping weak rounds is the design."
            />
            <CopyTile
              icon={<IconEye size={18} stroke={1.6} />}
              title="Watch Live"
              body="Each week we compare live results to the model. If the edge thins, size is cut automatically. If it goes to zero, mining pauses."
            />
          </div>

          <MiningPoolTechDetails />
        </ChartCard>

        <DepositPreview />

        <ChartCard title="The Fine Print">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3
                className="text-[15px] font-semibold tracking-tight text-[#EAECF6]"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                Fee
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#A8B0D4]">
                There is one fee: 0.25% of each amount the vault deploys. No deposit fee. No
                performance fee.
              </p>
            </div>
            <div>
              <h3
                className="text-[15px] font-semibold tracking-tight text-[#EAECF6]"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                Risk
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#A8B0D4]">
                This is not risk-free. You can lose SOL. Past results don&apos;t promise future
                ones. The vault can slow down or pause — that limits damage, it doesn&apos;t
                remove it.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#8B93B4]">
            Want the live board?{" "}
            <Link href="/stats" className="text-[#C7D0EA] underline-offset-2 hover:text-white hover:underline">
              See Data
            </Link>
            .
          </p>
        </ChartCard>
      </div>
    </div>
  );
}
