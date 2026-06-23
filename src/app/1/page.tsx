"use client";

import Link from "next/link";
import styles from "./pressure.module.css";
import { HeroStone } from "./stone";

const DISPLAY = "'Chakra Petch', sans-serif";
const MONO = "'JetBrains Mono Variable', monospace";

/* ── data ─────────────────────────────────────────────────────── */
const STEPS = [
  {
    n: "01",
    t: "Deposit SOL, mint CWR",
    d: "Your SOL joins the pool and you receive CWR, a streamlined share of everything the pool mines. Burn it any open window to walk away.",
  },
  {
    n: "02",
    t: "The engine works the board",
    d: "A keeper runs the 25-tile ORE board nonstop, committing capital only when conditions line up in the pool's favor. You never sign a thing in between.",
  },
  {
    n: "03",
    t: "ORE compounds into stORE",
    d: "Winnings ride instead of cashing out early, sidestepping the claim fee and stacking refining yield, then settle into stORE. Claim to take SOL plus your pro-rata stORE.",
  },
];

const EDGE = [
  {
    t: "Mine as one.",
    d: "Pooled capital behaves like a whale. Smoother outcomes, less variance, a faster path to the exposure that actually matters.",
  },
  {
    t: "Hold to compound.",
    d: "Winnings stay in and refine instead of cashing out early. The patient capture yield the impatient leave behind.",
  },
  {
    t: "Claim on your terms.",
    d: "Take profit any open window without unwinding your whole position. Whatever you leave behind keeps working.",
  },
];

const PROOF = [
  {
    t: "Vault treasury",
    d: "where pooled SOL lives onchain before each round.",
  },
  {
    t: "Mining authority",
    d: "a program-owned signer. It can mine, never withdraw to a human.",
  },
  {
    t: "Verifiable claims",
    d: "mint, burn, and payout are all onchain. Read them yourself.",
  },
];

const TEAM = [
  {
    name: "br0wnD3v",
    role: "Infrastructure",
    d: "Contracts, keeper, and the rails. Builds the machine that runs the board nonstop.",
  },
  {
    name: "Willd",
    role: "Product Manager",
    d: "Product, brand, and direction. Makes pooled mining read clean and feel serious.",
  },
];

/* ── small marks ──────────────────────────────────────────────── */
function FacetMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M5 9 L12 3 L19 9 L12 21 Z" fill="#9DB7D8" fillOpacity="0.25" />
      <path d="M5 9 L19 9 L12 21 Z" fill="#1C2029" />
      <path d="M5 9 L12 3 L19 9" stroke="#C9D2DE" strokeOpacity="0.7" strokeWidth="1" />
      <path d="M5 9 L12 21 L19 9" stroke="#9DB7D8" strokeOpacity="0.5" strokeWidth="0.8" />
      <path d="M9 6 L12 3 L15 6" stroke="#F4F8FF" strokeWidth="0.8" />
    </svg>
  );
}

export default function PressureLanding() {
  return (
    <div className="min-h-screen w-full">
      {/* caustic sweep on load */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 top-1/4 z-[5] h-40 ${styles.causticSweep}`}
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(157,183,216,0.18) 40%, rgba(244,248,255,0.28) 50%, rgba(157,183,216,0.18) 60%, transparent)",
        }}
      />

      {/* ══ NAV BAR ══ */}
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 pt-7 sm:px-10">
        <div className="flex items-center gap-3">
          <FacetMark className="h-7 w-7" />
          <span
            className="text-[18px] font-bold tracking-[0.22em] text-[#F4F8FF]"
            style={{ fontFamily: DISPLAY }}
          >
            CWR
          </span>
        </div>
        <div
          className={`${styles.chip} flex items-center gap-2 border border-[rgba(201,210,222,0.16)] bg-[rgba(18,20,26,0.6)] px-3 py-1.5`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className={`absolute inline-flex h-full w-full rounded-full bg-[#9DB7D8] ${styles.gaugePulse}`} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#F4F8FF]" />
          </span>
          <span
            className="text-[12px] tracking-[0.16em] text-[#9AA7B8]"
            style={{ fontFamily: MONO }}
          >
            keeper online · 24/7
          </span>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className="relative mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-10 px-6 pb-24 pt-16 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div className={`relative z-10 ${styles.rise}`}>
          <h1
            className={`${styles.deboss} text-[clamp(2.6rem,6.2vw,5.2rem)] font-bold leading-[0.96] tracking-[-0.01em] text-[#F4F8FF]`}
            style={{ fontFamily: DISPLAY }}
          >
            Pool your SOL.
            <br />
            <span className="text-[#C9D2DE]">Mine ORE</span> as one.
          </h1>

          <p
            className="mt-7 max-w-[34rem] text-[16px] leading-relaxed text-[#9AA7B8]"
            style={{ fontFamily: "'Sora Variable', sans-serif" }}
          >
            Drop in SOL, mint CWR, and a tireless keeper works the ORE board for
            you. Pooled capital, smoother outcomes, and you never sign a single
            round.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/1/app"
              className={`${styles.facet} group inline-flex items-center gap-2 border border-[rgba(201,210,222,0.3)] bg-[linear-gradient(180deg,#1C2029,#0B0D13)] px-7 py-3.5 text-[14px] font-semibold tracking-[0.06em] text-[#F4F8FF]`}
              style={{
                fontFamily: DISPLAY,
                boxShadow: "0 20px 50px -16px rgba(0,0,0,0.9), inset 0 1px 0 rgba(244,248,255,0.18)",
              }}
            >
              Enter the pool
              <span className="text-[#9DB7D8] transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <a
              href="#live"
              className={`${styles.chip} inline-flex items-center gap-2 border border-[rgba(201,210,222,0.2)] px-6 py-3.5 text-[14px] tracking-[0.04em] text-[#C9D2DE] transition-colors hover:border-[rgba(201,210,222,0.45)] hover:text-[#F4F8FF]`}
              style={{ fontFamily: DISPLAY }}
            >
              Watch it live
            </a>
          </div>

          {/* spec row */}
          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-8">
            {[
              ["non-custodial", "funds never leave the vault"],
              ["no lockup", "leave any open window"],
              ["hands-off", "zero transactions to sign"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start gap-2.5">
                <FacetMark className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <div
                    className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#C9D2DE]"
                    style={{ fontFamily: DISPLAY }}
                  >
                    {k}
                  </div>
                  <div className="text-[12px] text-[#6A7689]">{v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* the stone */}
        <div className={`relative flex items-center justify-center lg:justify-end ${styles.ignite}`}>
          <div className="relative">
            <HeroStone size={520} />
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS — three milled slabs ══ */}
      <Section kicker="The mechanism" title="How it works">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <article
              key={s.n}
              className={`${styles.slab} ${styles.slabHover} border border-[rgba(201,210,222,0.12)] bg-[linear-gradient(165deg,#12141A,#090A0F)] p-7`}
              style={{ boxShadow: "0 30px 80px -30px rgba(0,0,0,0.85)" }}
            >
              <div
                className={`${styles.embossNum} text-[40px] font-bold leading-none text-[#2A3445]`}
                style={{ fontFamily: MONO }}
              >
                {s.n}
              </div>
              <h3
                className="mt-5 text-[20px] font-semibold tracking-[-0.01em] text-[#F4F8FF]"
                style={{ fontFamily: DISPLAY }}
              >
                {s.t}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#9AA7B8]">{s.d}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ══ THE EDGE ══ */}
      <Section kicker="What you actually get" title="The edge">
        <div className="divide-y divide-[rgba(201,210,222,0.1)] border-y border-[rgba(201,210,222,0.1)]">
          {EDGE.map((e, i) => (
            <div
              key={e.t}
              className="grid grid-cols-1 gap-3 py-7 md:grid-cols-[0.4fr_0.6fr] md:items-baseline"
            >
              <div className="flex items-center gap-4">
                <span
                  className="text-[13px] text-[#3A4A63]"
                  style={{ fontFamily: MONO }}
                >
                  0{i + 1}
                </span>
                <h3
                  className="text-[22px] font-semibold tracking-[-0.01em] text-[#F4F8FF]"
                  style={{ fontFamily: DISPLAY }}
                >
                  {e.t}
                </h3>
              </div>
              <p className="text-[15px] leading-relaxed text-[#9AA7B8] md:pl-8">{e.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ══ THE HONEST PART ══ */}
      <section className="relative mx-auto max-w-[1280px] px-6 py-20 sm:px-10">
        <div
          className={`${styles.slab} relative overflow-hidden border border-[rgba(201,210,222,0.12)] bg-[linear-gradient(150deg,#0B1426,#070810_70%)] p-9 sm:p-14`}
          style={{ boxShadow: "0 40px 110px -40px rgba(0,0,0,0.9)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(157,183,216,0.2), transparent 70%)" }}
          />
          <p
            className="text-[12px] uppercase tracking-[0.24em] text-[#5A6E8C]"
            style={{ fontFamily: MONO }}
          >
            The honest part
          </p>
          <h2
            className={`${styles.deboss} mt-5 max-w-[24ch] text-[clamp(1.8rem,3.6vw,3rem)] font-bold leading-[1.05] tracking-[-0.01em] text-[#F4F8FF]`}
            style={{ fontFamily: DISPLAY }}
          >
            A real edge, not a bet on the room staying dumb.
          </h2>
          <div className="mt-8 grid max-w-[60rem] grid-cols-1 gap-6 md:grid-cols-2">
            <p className="text-[15px] leading-relaxed text-[#9AA7B8]">
              Plenty of products sell a single number and call it an edge. The
              trouble with a number everyone can hit is simple: the market
              reprices and the edge quietly disappears.
            </p>
            <p className="text-[15px] leading-relaxed text-[#9AA7B8]">
              We build on advantages that don&apos;t depend on someone else
              playing badly. Pooling lowers your variance. Holding compounds your
              yield. Flexible claims let you take profit without giving up your
              position.
            </p>
          </div>
          <div
            className="mt-9 inline-flex items-center gap-3 border-l border-[#9DB7D8] pl-4 text-[15px] font-semibold tracking-[0.02em] text-[#C9D2DE]"
            style={{ fontFamily: DISPLAY }}
          >
            Structure over hopium.
          </div>
        </div>
      </section>

      {/* ══ ONCHAIN — read the stone ══ */}
      <Section kicker="Read the stone" title="You keep custody. Always.">
        <p className="mb-9 max-w-[52rem] text-[15px] leading-relaxed text-[#9AA7B8]">
          Every deposit, balance, and flow lives on Solana, readable by any
          explorer at any time. The vault holds the SOL, the program mines it,
          and funds only ever move vault → ORE → back.
        </p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PROOF.map((p) => (
            <div
              key={p.t}
              className={`${styles.slab} border border-[rgba(201,210,222,0.12)] bg-[linear-gradient(165deg,#12141A,#090A0F)] p-6`}
            >
              <div className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rotate-45 bg-[#9DB7D8]" />
                <h3
                  className="text-[15px] font-semibold tracking-[0.02em] text-[#F4F8FF]"
                  style={{ fontFamily: DISPLAY }}
                >
                  {p.t}
                </h3>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-[#9AA7B8]">{p.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ══ POOLS ══ */}
      <Section kicker="Choose your facet" title="Pools" id="live">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Simple — LIVE */}
          <article
            className={`${styles.slab} ${styles.slabHover} relative overflow-hidden border border-[rgba(201,210,222,0.2)] bg-[linear-gradient(160deg,#161A22,#0A0C12)] p-8`}
            style={{ boxShadow: "0 36px 90px -34px rgba(0,0,0,0.9), inset 0 0 40px rgba(157,183,216,0.05)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3
                  className="text-[26px] font-bold tracking-[-0.01em] text-[#F4F8FF]"
                  style={{ fontFamily: DISPLAY }}
                >
                  Simple
                </h3>
              </div>
              <span
                className={`${styles.chip} flex items-center gap-2 border border-[rgba(157,183,216,0.4)] bg-[rgba(157,183,216,0.08)] px-3 py-1 text-[12px] tracking-[0.16em] text-[#C9D2DE]`}
                style={{ fontFamily: MONO }}
              >
                <span className={`h-1.5 w-1.5 rounded-full bg-[#F4F8FF] ${styles.gaugePulse}`} />
                LIVE
              </span>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-[#9AA7B8]">
              Disciplined 25-tile mining, no lockup. The engine commits only on
              rounds it likes; withdraw any open window.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "deposit SOL, mint CWR",
                "1% on volume, nothing on idle",
                "claim SOL plus stORE any open window",
              ].map((b) => (
                <li key={b} className="flex items-center gap-3 text-[13.5px] text-[#C9D2DE]">
                  <span className="h-1 w-1 rotate-45 bg-[#9DB7D8]" />
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href="/1/app"
              className={`${styles.facet} mt-8 inline-flex w-full items-center justify-center gap-2 border border-[rgba(201,210,222,0.3)] bg-[linear-gradient(180deg,#1C2029,#0B0D13)] px-6 py-3.5 text-[14px] font-semibold tracking-[0.06em] text-[#F4F8FF]`}
              style={{ fontFamily: DISPLAY, boxShadow: "inset 0 1px 0 rgba(244,248,255,0.18)" }}
            >
              Enter the pool →
            </Link>
          </article>

          {/* Refined — COMING SOON, frosted */}
          <article
            className={`${styles.slab} relative overflow-hidden border border-[rgba(201,210,222,0.08)] bg-[linear-gradient(160deg,#0E1015,#080910)] p-8`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 backdrop-blur-[1px]"
              style={{ background: "linear-gradient(180deg, rgba(8,9,16,0.35), rgba(8,9,16,0.6))" }}
            />
            <div className="relative opacity-60">
              <div className="flex items-start justify-between">
                <h3
                  className="text-[26px] font-bold tracking-[-0.01em] text-[#9AA7B8]"
                  style={{ fontFamily: DISPLAY }}
                >
                  Refined
                </h3>
                <span
                  className={`${styles.chip} border border-[rgba(201,210,222,0.16)] px-3 py-1 text-[12px] tracking-[0.16em] text-[#6A7689]`}
                  style={{ fontFamily: MONO }}
                >
                  COMING SOON
                </span>
              </div>
              <p className="mt-4 max-w-[26rem] text-[14px] leading-relaxed text-[#6A7689]">
                A higher-pressure pool. Deeper compounding, refined yield routing.
                Cut and polished next.
              </p>
              <div className="mt-7 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-3 w-2/3 bg-[rgba(201,210,222,0.06)]" />
                ))}
              </div>
              <div
                className={`${styles.facet} mt-8 inline-flex w-full cursor-not-allowed items-center justify-center border border-[rgba(201,210,222,0.1)] bg-[rgba(18,20,26,0.5)] px-6 py-3.5 text-[14px] tracking-[0.06em] text-[#4A5568]`}
                style={{ fontFamily: DISPLAY }}
              >
                Locked
              </div>
            </div>
          </article>
        </div>
      </Section>

      {/* ══ TEAM ══ */}
      <Section kicker="The cutters" title="Built by ORE natives">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {TEAM.map((m) => (
            <article
              key={m.name}
              className={`${styles.slab} ${styles.slabHover} flex items-start gap-5 border border-[rgba(201,210,222,0.12)] bg-[linear-gradient(165deg,#12141A,#090A0F)] p-7`}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center border border-[rgba(201,210,222,0.18)]"
                style={{
                  clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)",
                  background: "linear-gradient(135deg,#2A3445,#0B1426)",
                }}
              >
                <span
                  className="text-[15px] font-bold text-[#C9D2DE]"
                  style={{ fontFamily: DISPLAY }}
                >
                  {m.name[0].toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-3">
                  <h3
                    className="text-[18px] font-bold text-[#F4F8FF]"
                    style={{ fontFamily: DISPLAY }}
                  >
                    {m.name}
                  </h3>
                  <span
                    className="text-[12px] uppercase tracking-[0.16em] text-[#5A6E8C]"
                    style={{ fontFamily: MONO }}
                  >
                    {m.role}
                  </span>
                </div>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#9AA7B8]">{m.d}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* ══ FOOTER ══ */}
      <footer className="mx-auto max-w-[1280px] px-6 pb-28 pt-16 sm:px-10">
        <div className="border-t border-[rgba(201,210,222,0.1)] pt-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr]">
            <div>
              <div className="flex items-center gap-3">
                <FacetMark className="h-6 w-6" />
                <span
                  className="text-[16px] font-bold tracking-[0.22em] text-[#F4F8FF]"
                  style={{ fontFamily: DISPLAY }}
                >
                  CWR
                </span>
              </div>
              <p className="mt-4 max-w-[22rem] text-[13.5px] leading-relaxed text-[#6A7689]">
                Pooled, non-custodial ORE mining on Solana.
              </p>
            </div>
            <FooterCol title="Product" links={["Simple Pool", "Live crank", "Dashboard"]} />
            <FooterCol title="Legal" links={["Terms", "Privacy", "Disclosures"]} />
            <div>
              <div
                className="text-[12px] uppercase tracking-[0.2em] text-[#5A6E8C]"
                style={{ fontFamily: MONO }}
              >
                Socials
              </div>
              <div className="mt-4 flex gap-3">
                {["X", "Discord"].map((s) => (
                  <a
                    key={s}
                    href="#"
                    className={`${styles.chip} border border-[rgba(201,210,222,0.16)] px-3 py-1.5 text-[12px] text-[#9AA7B8] transition-colors hover:border-[rgba(201,210,222,0.4)] hover:text-[#F4F8FF]`}
                    style={{ fontFamily: DISPLAY }}
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-12 flex items-center justify-between border-t border-[rgba(201,210,222,0.06)] pt-6">
            <span className="text-[11.5px] text-[#4A5568]" style={{ fontFamily: MONO }}>
              © 2026 CWR
            </span>
            <span
              className="flex items-center gap-2 text-[11.5px] tracking-[0.1em] text-[#6A7689]"
              style={{ fontFamily: MONO }}
            >
              <span className="h-1 w-1 rotate-45 bg-[#9DB7D8]" />
              built on Solana
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── layout primitives ────────────────────────────────────────── */
function Section({
  kicker,
  title,
  id,
  children,
}: {
  kicker: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-[1280px] scroll-mt-20 px-6 py-16 sm:px-10">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p
            className="text-[12px] uppercase tracking-[0.24em] text-[#5A6E8C]"
            style={{ fontFamily: MONO }}
          >
            {kicker}
          </p>
          <h2
            className="mt-3 text-[clamp(1.7rem,3.4vw,2.6rem)] font-bold tracking-[-0.01em] text-[#F4F8FF]"
            style={{ fontFamily: DISPLAY }}
          >
            {title}
          </h2>
        </div>
        <span className="hidden h-px flex-1 bg-[rgba(201,210,222,0.12)] sm:block" />
      </div>
      {children}
    </section>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div
        className="text-[12px] uppercase tracking-[0.2em] text-[#5A6E8C]"
        style={{ fontFamily: "'JetBrains Mono Variable', monospace" }}
      >
        {title}
      </div>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="text-[13.5px] text-[#9AA7B8] transition-colors hover:text-[#F4F8FF]">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
