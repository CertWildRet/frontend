import Link from "next/link";
import { ChartCard } from "@/components/stats/Charts";
import { MiningPoolTechDetails } from "@/components/pools/MiningPoolTechModal";
import styles from "@/app/stats/stats.module.css";

/**
 * /pools — Mining Pool · dORE for everyday depositors (seat 1).
 * Quant / crank memo lives behind the How It's Built modal, not on the cards.
 */

function CopyTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5">
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

        <ChartCard title="What You Get" subtitle="Your Share of the Vault">
          <div className="grid gap-3 sm:grid-cols-3">
            <CopyTile
              title="dORE"
              body="Your receipt. One token = your slice of the vault. As the vault earns, your share is worth more SOL."
            />
            <CopyTile
              title="It Sits Out"
              body="Many rounds aren't worth playing. The vault skips those and only deploys when the round clears a minimum bar."
            />
            <CopyTile
              title="Cash Out in a Window"
              body="Redeem dORE for SOL when a window is open. Leave it in and the vault keeps mining."
            />
          </div>
        </ChartCard>

        <ChartCard title="How It Works" subtitle="Deposit · Mine · Back to SOL">
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.12] font-mono text-[11px] text-[#C7D0EA]">
                1
              </span>
              <div>
                <h3
                  className="text-[15px] font-semibold tracking-tight text-[#EAECF6]"
                  style={{ fontFamily: "'Chakra Petch', sans-serif" }}
                >
                  You Deposit SOL
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#A8B0D4]">
                  You receive dORE for your exact share of the vault. The SOL stays in the pool
                  — you don&apos;t run a miner.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.12] font-mono text-[11px] text-[#C7D0EA]">
                2
              </span>
              <div>
                <h3
                  className="text-[15px] font-semibold tracking-tight text-[#EAECF6]"
                  style={{ fontFamily: "'Chakra Petch', sans-serif" }}
                >
                  The Vault Mines When It Should
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#A8B0D4]">
                  Each round, it checks if the round is worth playing. If yes, it deploys a
                  small, fixed amount across the board. If no, it waits.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.12] font-mono text-[11px] text-[#C7D0EA]">
                3
              </span>
              <div>
                <h3
                  className="text-[15px] font-semibold tracking-tight text-[#EAECF6]"
                  style={{ fontFamily: "'Chakra Petch', sans-serif" }}
                >
                  Wins Turn Back Into SOL
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#A8B0D4]">
                  ORE the vault wins is sold on a schedule so the pool stays in SOL, not stuck
                  in tokens. That&apos;s the point: you came for SOL return.
                </p>
              </div>
            </li>
          </ol>
        </ChartCard>

        <ChartCard title="How It's Built" subtitle="Tested · Frozen · Watched">
          <p className="max-w-3xl text-sm leading-relaxed text-[#A8B0D4]">
            The vault is not someone picking tiles by hand. It is a set of rules we tested on
            months of real ORE rounds, then froze. Setups that failed after the test window did
            not ship.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CopyTile
              title="Six Months of Rounds"
              body="We ran the rules against the full on-chain history — every round in that window, not a highlight reel."
            />
            <CopyTile
              title="Frozen Rules"
              body="Nothing is tuned live. The bar to play, the size of each bet, and the stop rules stay as tested."
            />
            <CopyTile
              title="Built to Sit Out"
              body="In that history, more than half of rounds didn't clear the bar. Skipping weak rounds is the design."
            />
            <CopyTile
              title="Watched Live"
              body="Each week we compare live results to the model. If the edge thins, size is cut automatically. If it goes to zero, mining pauses."
            />
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-[#8B93B4]">
            Past results don&apos;t promise future ones. Two of the six test months lost money
            — that&apos;s why the slowdown and pause rules exist.
          </p>
          <MiningPoolTechDetails />
        </ChartCard>

        <ChartCard title="The Fine Print" subtitle="One Fee · Real Risk">
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
                This is not risk-free. Some months lose money. Past results don&apos;t promise
                future ones. You can lose SOL. The vault sizes small, and it can slow down or
                pause if results turn — that limits damage, it doesn&apos;t remove it.
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

        <ChartCard title="Mining Pool" subtitle="dORE">
          <p className="max-w-2xl text-sm leading-relaxed text-[#A8B0D4]">
            Ready when you are. Connect a wallet to start. Deposit opens in the next step.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/profile" className="btn-primary inline-flex px-5 py-2.5">
              Connect Wallet
            </Link>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
