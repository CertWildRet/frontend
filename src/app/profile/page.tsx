"use client";

/**
 * /profile — UX shell (issue #14).
 * Mock miner stats + waitlist / Discord sections. Live wallet wiring lands in #15.
 */
import { ChartCard } from "@/components/stats/Charts";
import { CopyAddress } from "@/components/primitives/CopyAddress";
import { StatTile } from "@/components/primitives/Stat";
import { DISCORD_URL, WAITLIST_URL } from "@/lib/links";
import styles from "./profile.module.css";

/** Static preview row — same fields as Ore Data → Search Miners. */
const MOCK_MINER = {
  authority: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  deployed: "12.4",
  earned: "3.82",
  netSol: "-8.58",
  ore: "1.24",
  unclaimed: "0.45",
  refined: "0.08",
};

export default function ProfilePage() {
  const netNeg = MOCK_MINER.netSol.startsWith("-");

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
          Your ORE miner stats for this wallet — the same lens as Ore Data → Search Miners.
        </p>
        <div className={styles.walletStrip}>
          <span className="text-[#9AA3C8]">Wallet</span>
          <CopyAddress address={MOCK_MINER.authority} className="text-[#EAECF6]" />
        </div>
      </header>

      <div className={styles.sections}>
        <ChartCard
          title="Miner stats"
          subtitle="Mock preview · live data wires in next"
        >
          <div className={styles.statGrid}>
            <StatTile label="Deployed" value={MOCK_MINER.deployed} unit="SOL" variant="inset" />
            <StatTile label="Earned" value={MOCK_MINER.earned} unit="SOL" variant="inset" />
            <StatTile
              label="Net SOL"
              value={MOCK_MINER.netSol}
              unit="SOL"
              variant="inset"
              className={netNeg ? "[&_.num]:text-red" : "[&_.num]:text-pos"}
            />
            <StatTile label="ORE" value={MOCK_MINER.ore} unit="ORE" variant="inset" />
            <StatTile label="Unclaimed" value={MOCK_MINER.unclaimed} unit="ORE" variant="inset" />
            <StatTile label="Refined" value={MOCK_MINER.refined} unit="ORE" variant="inset" />
          </div>

          <div className={`mt-5 ${styles.tableWrap}`}>
            <table className="font-mono text-[13px] sm:min-w-[640px]">
              <thead>
                <tr className={styles.tableHead}>
                  <th>#</th>
                  <th>Miner</th>
                  <th className="text-right">Deployed</th>
                  <th className="text-right">Earned</th>
                  <th className="text-right">Net SOL</th>
                  <th className="hidden text-right sm:table-cell">ORE</th>
                  <th className="hidden text-right sm:table-cell">Unclaimed</th>
                  <th className="hidden text-right sm:table-cell">Refined</th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.tableRow}>
                  <td className="text-[#9AA3C8]">1</td>
                  <td className="text-white">
                    <CopyAddress address={MOCK_MINER.authority} />
                  </td>
                  <td className="text-right text-gray-300">{MOCK_MINER.deployed}</td>
                  <td className="text-right text-gray-300">{MOCK_MINER.earned}</td>
                  <td className={`num text-right ${netNeg ? "text-red" : "text-pos"}`}>
                    {MOCK_MINER.netSol}
                  </td>
                  <td className="hidden text-right text-gray-300 sm:table-cell">{MOCK_MINER.ore}</td>
                  <td className="hidden text-right text-gray-300 sm:table-cell">
                    {MOCK_MINER.unclaimed}
                  </td>
                  <td className="hidden text-right text-gray-300 sm:table-cell">
                    {MOCK_MINER.refined}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Join the first Diamond Pool" subtitle="Waitlist">
          <p className={styles.ctaBody}>
            The first Diamond Pool is invite-gated. Get on the waitlist to deposit SOL and mine
            ORE as one — your connected wallet is how we match you when seats open.
          </p>
          <div className={styles.ctaActions}>
            {WAITLIST_URL === "#" ? (
              <button type="button" className="btn-primary px-5 py-2.5">
                Join waitlist
              </button>
            ) : (
              <a href={WAITLIST_URL} className="btn-primary inline-flex px-5 py-2.5">
                Join waitlist
              </a>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Join the community" subtitle="Discord">
          <p className={styles.ctaBody}>
            Pool announcements, support, and updates land in Discord first. Come hang with other
            miners while the first pool fills.
          </p>
          <div className={styles.ctaActions}>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-outline inline-flex px-5 py-2.5"
            >
              Join Discord
            </a>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
