import Link from "next/link";
import { ChartCard } from "@/components/stats/Charts";
import styles from "@/app/stats/stats.module.css";

/**
 * /pools — Diamond Pool surfaces. Pool A is the first live vault; more slots
 * land here as they open.
 */
export default function PoolsPage() {
  return (
    <div className={styles.page}>
      <div className="space-y-5">
        <header className="space-y-2">
          <h1
            className="text-[28px] font-bold tracking-tight text-[#EAECF6] sm:text-[32px]"
            style={{ fontFamily: "'Chakra Petch', sans-serif" }}
          >
            Pools
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#A8B0D4]">
            Non-custodial vaults that mine ORE on your behalf. Start with Pool A — the first
            Diamond Pool.
          </p>
        </header>

        <ChartCard title="Pool A" subtitle="First Diamond Pool · dORE">
          <p className="max-w-2xl text-sm leading-relaxed text-[#A8B0D4]">
            Deposit SOL to mint dORE. The engine covers the full 25-tile board when the math
            clears, sits out when it doesn&apos;t, and compounds yield through stORE until you
            redeem.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/profile" className="btn-primary inline-flex px-5 py-2.5">
              Go to Profile
            </Link>
          </div>
        </ChartCard>

        <ChartCard title="How It Works" subtitle="Deposit · Mine · Redeem">
          <ul className="max-w-2xl space-y-2.5 text-sm leading-relaxed text-[#A8B0D4]">
            <li>
              <span className="font-semibold text-[#EAECF6]">Deposit SOL</span> — mint dORE for
              your exact slice of the vault.
            </li>
            <li>
              <span className="font-semibold text-[#EAECF6]">The Engine Digs</span> — full-board
              coverage when EV clears; idle when it doesn&apos;t.
            </li>
            <li>
              <span className="font-semibold text-[#EAECF6]">Cash Out or Compound</span> — redeem
              in any open window, or leave capital in while stORE compounds.
            </li>
          </ul>
        </ChartCard>

        <ChartCard title="Coming Soon" subtitle="More Pools">
          <p className="max-w-2xl text-sm leading-relaxed text-[#A8B0D4]">
            Additional Diamond Pools will appear here as they launch — same glass panels, same
            non-custodial rails.
          </p>
        </ChartCard>
      </div>
    </div>
  );
}
