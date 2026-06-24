import Link from "next/link";
import Image from "next/image";
import { RefinedComingSoon } from "@/components/RefinedComingSoon";
import { FacetMark } from "@/components/FacetMark";
import { HeroStone } from "@/components/HeroStone";

export const metadata = {
  title: "CWR · autonomous ORE mining",
};

export default function HomePage() {
  return (
    <div className="space-y-28">
      {/* Hero */}
      <section className="grid grid-cols-1 items-center gap-10 pt-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="stagger">
          <h1 className="font-display text-5xl font-bold leading-[1.04] tracking-tight md:text-6xl">
            Pool your SOL.
            <br />
            <span className="text-sheen">Mine ORE</span> as one.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-fog-dim">
            Drop in SOL, mint CWR, and a tireless keeper works the ORE board for you. Pooled capital,
            smoother outcomes, and you never sign a single round.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/crank" className="btn-primary px-6 py-2.5">
              Enter the pool →
            </Link>
            <Link href="/crank" className="btn-outline px-6 py-2.5">
              Watch it live
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3">
            <Spec k="non-custodial" v="funds never leave the vault" />
            <Spec k="no lockup" v="leave any open window" />
            <Spec k="hands-off" v="zero transactions to sign" />
          </div>
        </div>
        <OreHeroVisual />
      </section>

      {/* How it works */}
      <section>
        <SectionLabel>How it works</SectionLabel>
        <div className="mt-6 grid grid-cols-1 gap-5 stagger md:grid-cols-3">
          <Step
            n="01"
            title="Deposit SOL, mint CWR"
            body="Your SOL joins the pool and you receive CWR, a streamlined share of everything the pool mines. Burn it any open window to walk away."
          />
          <Step
            n="02"
            title="The engine works the board"
            body="A keeper runs the 25 tile ORE board nonstop, committing capital only when conditions line up in the pool's favor. You never sign a thing in between."
          />
          <Step
            n="03"
            title="ORE compounds into stORE"
            body="Winnings ride instead of cashing out early, sidestepping the claim fee and stacking refining yield, then settle into stORE. Claim to take SOL plus your pro rata stORE."
          />
        </div>
      </section>

      {/* The Edge */}
      <section>
        <SectionLabel>The edge</SectionLabel>
        <div className="mt-8 divide-y divide-line">
          <EdgeRow
            head="Mine as one."
            note="Pooled capital behaves like a whale. Smoother outcomes, less variance, a faster path to the exposure that actually matters."
          />
          <EdgeRow
            head="Hold to compound."
            note="Winnings stay in and refine instead of cashing out early. The patient capture yield the impatient leave behind."
          />
          <EdgeRow
            head="Claim on your terms."
            note="Take profit any open window without unwinding your whole position. Whatever you leave behind keeps working."
          />
        </div>
      </section>

      {/* The honest pitch */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-ink-900/50 p-8 md:p-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-grad-gold-soft blur-3xl" aria-hidden />
        <div className="relative max-w-3xl">
          <SectionLabel>The honest part</SectionLabel>
          <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            A real edge, <span className="text-sheen">not a bet on the room staying dumb.</span>
          </h2>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-fog-dim">
            <p>
              Plenty of products sell a single number and call it an edge. The trouble with a number
              everyone can hit is simple: the market reprices, and the edge quietly disappears.
            </p>
            <p>
              We build on advantages that do not depend on someone else playing badly. Pooling lowers
              your variance. Holding compounds your yield. Flexible claims let you take profit without
              giving up your position. Good conditions, bad conditions, and everything in between.
            </p>
          </div>
          <p className="mt-6 font-display text-lg font-semibold text-gold">Structure over hopium.</p>
        </div>
      </section>

      {/* Transparency */}
      <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <SectionLabel>Onchain, not a black box</SectionLabel>
          <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight">
            You keep custody. Always.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-fog-dim">
            Every deposit, balance, and flow lives on Solana, readable by any explorer at any time.
            The vault holds the SOL, the program mines it, and funds only ever move vault to ORE and
            back. Nobody ever takes your keys.
          </p>
          <ul className="mt-5 space-y-2.5">
            <ProofRow t="Vault treasury" d="Where pooled SOL lives onchain before each round." />
            <ProofRow t="Mining authority" d="A program-owned signer. It can mine, never withdraw to a human." />
            <ProofRow t="Verifiable claims" d="Mint, burn, and payout are all onchain. Read them yourself." />
          </ul>
        </div>
        <OnchainVisual />
      </section>

      {/* Pools */}
      <section>
        <SectionLabel>Pools</SectionLabel>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Link href="/crank" className="card card-hover frame-brand group relative overflow-hidden">
            <span className="chip absolute right-5 top-5 border-pos/40 text-white">
              <span className="live-dot text-pos" /> live
            </span>
            <h3 className="font-display text-lg font-semibold text-white">Simple</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-fog-dim">
              Disciplined 25 tile mining, no lockup. The engine commits only on rounds it likes, and
              you withdraw any open window. The straightforward way in.
            </p>
            <ul className="mt-4 space-y-1.5 font-mono text-xs text-fog-muted">
              <li>› deposit SOL, mint CWR</li>
              <li>› 1% on volume, nothing on idle</li>
              <li>› claim SOL plus stORE any open window</li>
            </ul>
            <span className="mt-5 inline-block text-sm font-medium text-gold transition group-hover:text-glow-gold">
              Enter the pool →
            </span>
          </Link>
          <RefinedComingSoon />
        </div>
      </section>

      {/* Team */}
      <section>
        <SectionLabel>Built by ORE natives</SectionLabel>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-fog-dim">
          Shipped from inside the ecosystem. We built CWR for the same friction we hit in the mines:
          variance, slow accumulation, and flows that worked but were never convenient.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TeamCard handle="br0wnD3v" role="Infrastructure" avatar="/brown.png" blurb="Contracts, keeper, and the rails. Builds the machine that runs the board nonstop." />
          <TeamCard handle="Willd" role="Product Manager" avatar="/will.png" blurb="Product, brand, and direction. Makes pooled mining read clean and feel serious." />
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="label flex items-center gap-3 text-gold before:h-px before:w-8 before:bg-gold/40 before:content-['']">
      {children}
    </h2>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="font-display text-sm font-semibold text-white">{k}</div>
      <div className="text-xs text-fog-muted">{v}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="card card-hover">
      <span className="font-mono text-xs text-gold/70">{n}</span>
      <h3 className="mt-3 font-display text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fog-dim">{body}</p>
    </div>
  );
}

function EdgeRow({ head, note }: { head: string; note: string }) {
  return (
    <div className="group grid grid-cols-1 items-center gap-4 py-7 transition-colors md:grid-cols-[1fr_1.1fr]">
      <h3 className="font-display text-3xl font-bold tracking-tight text-fog-dim transition-colors group-hover:text-white md:text-4xl">
        {head}
      </h3>
      <p className="max-w-md text-sm leading-relaxed text-fog-dim md:text-base">{note}</p>
    </div>
  );
}

function ProofRow({ t, d }: { t: string; d: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
      <span className="text-sm text-fog-dim">
        <span className="font-medium text-white">{t}.</span> {d}
      </span>
    </li>
  );
}

function TeamCard({
  handle,
  role,
  blurb,
  avatar,
}: {
  handle: string;
  role: string;
  blurb: string;
  avatar: string;
}) {
  return (
    <div className="card card-hover flex items-start gap-4">
      <span className="relative h-12 w-12 flex-none overflow-hidden rounded-xl shadow-glow-gold ring-1 ring-gold/40">
        <Image src={avatar} alt={handle} fill sizes="48px" className="object-cover" />
      </span>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-base font-semibold text-white">{handle}</span>
        </div>
        <div className="label mt-0.5 text-gold">{role}</div>
        <p className="mt-2 text-sm leading-relaxed text-fog-dim">{blurb}</p>
      </div>
    </div>
  );
}

/** Hero centerpiece: the glowing ORE mark over a faint board grid. */
function OreHeroVisual() {
  return (
    <div className="relative mx-auto hidden w-full max-w-[560px] items-center justify-center lg:flex">
      <div
        className="absolute inset-6 rounded-full blur-3xl"
        aria-hidden
        style={{ background: "radial-gradient(circle, rgba(157,183,216,0.3), transparent 70%)" }}
      />
      <div
        className="absolute inset-0 rounded-[2rem] border border-line/60"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(157,183,216,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(157,183,216,.06) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, #000, transparent 76%)",
          maskImage: "radial-gradient(circle at 50% 50%, #000, transparent 76%)",
        }}
      />
      {/* big stone: +30% overall to fill its space, keeping the +20% width boost */}
      <div className="relative" style={{ transform: "scaleX(1.2)" }}>
        <HeroStone size={442} />
      </div>
      <span className="chip absolute bottom-5 right-5 border-pos/40 text-white">
        <span className="live-dot text-pos" /> mining ORE
      </span>
    </div>
  );
}

/** Transparency visual: pooled treasury feeding the mining board. */
function OnchainVisual() {
  return (
    <div className="frame-brand relative overflow-hidden rounded-2xl border border-line bg-ink-900/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between rounded-xl border border-line bg-ink-800/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <FacetMark className="h-6 w-6" />
          <div>
            <div className="label">vault treasury</div>
            <div className="font-mono text-xs text-fog-dim">program-owned PDA</div>
          </div>
        </div>
        <span className="chip border-pos/40 text-white">
          <span className="live-dot text-pos" /> live
        </span>
      </div>
      <div className="my-3 flex justify-center">
        <div className="h-5 w-px bg-gradient-to-b from-gold/60 to-transparent" />
      </div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label text-gold">mining now</span>
        <span className="font-mono text-[12px] text-fog-muted">25-tile board</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 25 }).map((_, i) => {
          const lit = [3, 7, 8, 11, 16, 19, 22].includes(i);
          return (
            <div
              key={i}
              className={`aspect-square rounded-md border ${
                lit ? "border-gold/50 bg-gold/15 shadow-glow-gold" : "border-line bg-ink-800/50"
              }`}
              style={lit ? { animation: `pulseDot ${2 + (i % 3) * 0.5}s ease-in-out infinite` } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
