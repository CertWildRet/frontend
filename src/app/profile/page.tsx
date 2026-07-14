"use client";

/**
 * /profile — the connected wallet's miner readout.
 *
 * No placeholders: stats render only once a wallet is connected, and they use
 * the SAME top-level MinerDetail panel that powers the Search Miners
 * chevron-expansion on /stats (extracted to components/stats/MinerDetail) —
 * lifetime census, event-window P&L, best/worst rounds, streaks, ORE cost,
 * cumulative P/L trend, exact round history.
 *
 * "First Diamond Pool OGs": one merged join card — connect the wallet AND
 * join the OreStack Discord; an automation (coming soon) links the Discord id
 * to the wallet seen here and grants the v0 OG tag on the OreStack server.
 */
import { useWallet } from "@solana/wallet-adapter-react";
import { ChartCard } from "@/components/stats/Charts";
import { MinerDetail } from "@/components/stats/MinerDetail";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { WalletButton } from "@/components/WalletButton";
import { DISCORD_URL } from "@/lib/links";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const { connected, publicKey } = useWallet();
  const address = connected && publicKey ? publicKey.toBase58() : null;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={styles.liveDot} aria-hidden />
          Your wallet
        </div>
        <h1 className={styles.title}>
          Profile
          <br />
          <span className={styles.titleAccent}>Miner readout</span>
        </h1>
        <p className={styles.subtitle}>
          Your ORE miner stats for the connected wallet — the same lens as Ore Data → Search
          Miners, front and center.
        </p>
        <div className={styles.walletStrip}>
          <span className="text-[#9AA3C8]">Wallet</span>
          {address ? (
            <CopyAddress address={address} className="text-[#EAECF6]" />
          ) : (
            <span className="text-[#9AA3C8]">not connected</span>
          )}
        </div>
      </header>

      <div className={styles.sections}>
        {address ? (
          <MinerDetail pubkey={address} />
        ) : (
          <ChartCard title="Your miner stats" subtitle="Connect to load">
            <p className={styles.ctaBody}>
              Connect a wallet and your miner readout loads right here — lifetime deployed and
              returned SOL, ORE earned, hit rate, best and worst rounds, streaks, ORE cost, and
              your cumulative P/L trend, round by round.
            </p>
            <div className={styles.ctaActions}>
              <WalletButton />
            </div>
          </ChartCard>
        )}

        <ChartCard title="Become a First Diamond Pool OG" subtitle="Wallet + Discord">
          <p className={styles.ctaBody}>
            The first Diamond Pool is invite-gated, and the OG list forms here. Connect both your
            wallet and your Discord — join the OreStack server — and you&apos;re in: once a
            profile has a wallet and a Discord linked, our automation pairs the Discord id with
            the wallet and grants the <span className="text-[#EAECF6]">v0 OG</span> tag on the
            OreStack server.
          </p>
          <div className={styles.ogRows}>
            <div className={styles.ogRow}>
              <span className={styles.ogStep} aria-hidden>
                1
              </span>
              <div className={styles.ogRowBody}>
                <span className={styles.ogLabel}>Wallet</span>
                {address ? (
                  <span className={styles.ogDone}>
                    <span className={styles.ogCheck} aria-hidden>
                      ✓
                    </span>
                    <CopyAddress address={address} className="text-[#EAECF6]" />
                  </span>
                ) : (
                  <WalletButton />
                )}
              </div>
            </div>
            <div className={styles.ogRow}>
              <span className={styles.ogStep} aria-hidden>
                2
              </span>
              <div className={styles.ogRowBody}>
                <span className={styles.ogLabel}>Discord</span>
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary inline-flex px-5 py-2.5"
                >
                  Join OreStack
                </a>
                <span className={styles.ogHint}>account linking lands here soon</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
