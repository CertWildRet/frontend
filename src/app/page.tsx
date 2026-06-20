import Link from "next/link";
import { RefinedComingSoon } from "@/components/RefinedComingSoon";

export const metadata = {
  title: "CWR — mine ORE, hands-free",
};

export default function HomePage() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="pt-6">
        <span className="badge bg-accent-simple/15 text-accent-simple">● 24/7 crank · live on Solana</span>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          Mine ORE, hands-free.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
          Deposit SOL, mint <span className="text-white">CWR</span> — your share of the pool — and a
          keeper bot mines the ORE board for you around the clock. One simple purpose, running
          non-stop: bet the 25 tiles only when the math says it pays.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/crank"
            className="rounded-md bg-accent-simple px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Open the crank →
          </Link>
          <Link
            href="/crank"
            className="rounded-md border border-bg-border px-5 py-2.5 text-sm text-gray-200 transition hover:border-bg-elevated"
          >
            See it live
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">How it works</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Step
            n="1"
            title="Deposit SOL, mint CWR"
            body="Your SOL joins the pool and you receive CWR — a streamlined LP share that tracks your slice of everything the pool mines. Burn it anytime the window's open to withdraw."
          />
          <Step
            n="2"
            title="The crank bets 25 tiles"
            body="A 24/7 keeper deploys the pool's SOL uniformly across all 25 ORE tiles — but only on rounds its exact-EV math says are profitable. You never touch a transaction in between."
          />
          <Step
            n="3"
            title="ORE compounds into stORE"
            body="Winnings ride unclaimed to the max — dodging the 10% claim fee and earning refining yield — then settle straight into stORE. When you claim, you get SOL plus your pro-rata stORE."
          />
        </div>
      </section>

      {/* Why */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Feature
          title="Streamlined LP share"
          body="One token, CWR. It is your position — no lockup on Simple, withdraw whenever the claim window opens."
        />
        <Feature
          title="Unclaimed ORE, to the max"
          body="The crank never claims mid-cycle. ORE accumulates as refining yield and avoids the 10% claim fee, then wraps into stORE on settle."
        />
        <Feature
          title="Built for the long game"
          body="Fees are 1% on deploy volume — the pool earns when the crank works, not on idle deposits. Staying in compounds in your favor."
        />
      </section>

      {/* Pools */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Pools</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Link
            href="/crank"
            className="card card-hover group relative overflow-hidden"
          >
            <span className="badge absolute right-5 top-5 bg-accent-simple/15 text-accent-simple">live</span>
            <h3 className="text-base font-semibold text-white">Simple</h3>
            <p className="mt-2 max-w-md text-sm text-gray-400">
              Selective 25-tile mining, no lockup. Deploys only when a round is profitable; withdraw
              any open window. The straightforward way in.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-muted">
              <li>• Deposit SOL → mint CWR</li>
              <li>• 1% volume fee, nothing on idle</li>
              <li>• Claim SOL + stORE anytime the window&apos;s open</li>
            </ul>
            <span className="mt-5 inline-block text-sm font-medium text-accent-simple group-hover:underline">
              Enter the pool →
            </span>
          </Link>
          <RefinedComingSoon />
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="card">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-simple/15 font-mono text-sm text-accent-simple">
        {n}
      </div>
      <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">{body}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">{body}</p>
    </div>
  );
}
