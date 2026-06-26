import Link from "next/link";
import Image from "next/image";
import styles from "./dispersion.module.css";
import {
  SpectralDefs,
  ArrowIcon,
  Tilt,
} from "./parts";

/* ── inline data ─────────────────────────────────────────────────── */
const STEPS = [
  {
    n: "01",
    t: "Get dOre tokens",
    d: "These represent your share of the Diamond Pool.",
    Graphic: StepTokenGraphic,
  },
  {
    n: "02",
    t: "Let our algorithms do the work",
    d: "It mines all 25 tiles only when it is EV positive.",
    Graphic: StepBoardGraphic,
  },
  {
    n: "03",
    t: "Claim or let it earn APY",
    d: "Pull out to SOL whenever you want, or hold your dOre and let it keep compounding.",
    Graphic: StepYieldGraphic,
  },
];

const EDGE = [
  {
    grade: "VVS1",
    t: "Mine as one.",
    d: "Pooled capital behaves like a whale. Smoother outcomes, less variance, a faster path to the exposure that actually matters.",
    metric: "variance ↓",
  },
  {
    grade: "VVS2",
    t: "More +1 ORE wins",
    d: "Your odds of landing a +1 ORE win scale with how much is deployed each round. A solo miner covers little; the pool deploys as one whale, lifting everyone's chance of hitting a win.",
    metric: "win odds ↑",
  },
  {
    grade: "VS1",
    t: "Claim on your terms.",
    d: "Take profit any open window without unwinding your whole position. Whatever you leave behind keeps working.",
    metric: "flexible exit",
  },
];

const TEAM = [
  {
    name: "br0wnD3v",
    role: "Infrastructure",
    avatar: "/brown.png",
    d: "Contracts, keeper, and the rails. Builds the machine that runs the board nonstop.",
  },
  {
    name: "Willd",
    role: "Product Manager",
    avatar: "/will.png",
    d: "Product, brand, and direction. Makes pooled mining read clean and feel serious.",
  },
];

const HERO_SPECS = [
  "Non-custodial",
  "Transparent",
  "No Claim fee",
  "Built by miners for miners",
];

const display = { fontFamily: "'Chakra Petch', sans-serif" } as const;
const mono = { fontFamily: "'JetBrains Mono Variable', monospace" } as const;

export default function DispersionLanding() {
  return (
    <div className="relative mx-auto w-full max-w-[1180px] px-5 pb-28 pt-4 sm:px-8">
      <SpectralDefs />

      {/* ══ HERO ═══════════════════════════════════════════════════ */}
      <section className="relative mt-4 sm:mt-6">
        {/* floating 3D brilliant-cut diamond, top-right — the refractor */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[0%] top-1/2 hidden h-[291px] w-[336px] -translate-y-1/2 md:block lg:h-[374px] lg:w-[432px] xl:h-[416px] xl:w-[480px]"
        >
          {/* spectral halo */}
          <div
            className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(184,202,255,0.55), rgba(154,107,255,0.3) 42%, rgba(7,9,18,0) 72%)",
            }}
          />
          <div className={`${styles.prismShard} h-full w-full`}>
            <svg viewBox="0 0 200 200" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="d3-table" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#3BF0F2" />
                  <stop offset="0.5" stopColor="#5B6CFF" />
                  <stop offset="1" stopColor="#9A6BFF" />
                </linearGradient>
                <linearGradient id="d3-crownL" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#3BF0F2" />
                  <stop offset="1" stopColor="#33408A" />
                </linearGradient>
                <linearGradient id="d3-crownR" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FF77D6" />
                  <stop offset="1" stopColor="#5A3270" />
                </linearGradient>
                <linearGradient id="d3-pavilion" x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0" stopColor="#9CA8FF" />
                  <stop offset="0.5" stopColor="#5A63CC" />
                  <stop offset="1" stopColor="#332E78" />
                </linearGradient>
                <linearGradient id="d3-pavR" x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0" stopColor="#C495FF" />
                  <stop offset="0.5" stopColor="#7E5BD0" />
                  <stop offset="1" stopColor="#3E2E78" />
                </linearGradient>
                <linearGradient id="d3-pavOuterL" x1="0" y1="0" x2="0.7" y2="1">
                  <stop offset="0" stopColor="#3FC9D8" />
                  <stop offset="1" stopColor="#244C72" />
                </linearGradient>
                <linearGradient id="d3-pavOuterR" x1="1" y1="0" x2="0.3" y2="1">
                  <stop offset="0" stopColor="#E27ED2" />
                  <stop offset="1" stopColor="#46326E" />
                </linearGradient>
                <linearGradient id="d3-fire" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FF5AC8" />
                  <stop offset="1" stopColor="#FFC061" />
                </linearGradient>
                <linearGradient id="d3-edge" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22E0E6" />
                  <stop offset="50%" stopColor="#9A6BFF" />
                  <stop offset="100%" stopColor="#FF5AC8" />
                </linearGradient>
                <radialGradient id="d3-glow" cx="0.5" cy="0.42" r="0.6">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* pavilion (lower point) — luminous, reflective facets */}
              <polygon points="30,72 100,72 100,180" fill="url(#d3-pavilion)" opacity="0.97" />
              <polygon points="170,72 100,72 100,180" fill="url(#d3-pavR)" opacity="0.95" />
              <polygon points="30,72 60,72 100,180" fill="url(#d3-pavOuterL)" opacity="0.95" />
              <polygon points="170,72 140,72 100,180" fill="url(#d3-pavOuterR)" opacity="0.93" />

              {/* specular shine — bright belt + glints converging to the culet */}
              <polygon points="30,72 170,72 138,99 62,99" fill="#FFFFFF" opacity="0.14" />
              <polygon points="60,73 67,73 100,180" fill="#CFFAFF" opacity="0.24" />
              <polygon points="86,73 97,73 100,180" fill="#FFFFFF" opacity="0.32" />
              <polygon points="104,73 116,73 100,180" fill="#FFE7F6" opacity="0.24" />

              {/* girdle band — bright reflective belt */}
              <polygon points="30,68 170,68 170,74 30,74" fill="#D7CBFF" opacity="0.45" />
              <line x1="30" y1="69" x2="170" y2="69" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="0.7" />

              {/* crown facets */}
              <polygon points="55,30 145,30 170,68 30,68" fill="url(#d3-table)" opacity="0.92" />
              {/* table */}
              <polygon points="72,30 128,30 150,52 50,52" fill="url(#d3-table)" />
              <polygon points="72,30 128,30 100,42" fill="#F4FEFF" opacity="0.85" />
              <polygon points="78,31 122,31 100,30" fill="#FFFFFF" opacity="0.6" />
              {/* crown sides */}
              <polygon points="55,30 72,30 50,52 30,68" fill="url(#d3-crownL)" opacity="0.9" />
              <polygon points="145,30 128,30 150,52 170,68" fill="url(#d3-crownR)" opacity="0.9" />
              <polygon points="50,52 150,52 170,68 30,68" fill="#6E7BFF" opacity="0.4" />
              {/* bright kite facets — cyan + fire */}
              <polygon points="72,30 100,42 100,30" fill="#3BF0F2" opacity="0.7" />
              <polygon points="128,30 100,42 100,30" fill="url(#d3-fire)" opacity="0.6" />

              {/* facet edge lines (spectral) */}
              <g stroke="url(#d3-edge)" strokeOpacity="0.78" strokeWidth="0.7" fill="none">
                <polyline points="55,30 145,30" />
                <polyline points="72,30 50,52" />
                <polyline points="128,30 150,52" />
                <polyline points="50,52 150,52" />
                <polyline points="30,68 100,42 170,68" />
                <polyline points="100,42 100,30" />
              </g>
              <g stroke="url(#d3-edge)" strokeOpacity="0.5" strokeWidth="0.6" fill="none">
                <polyline points="30,72 100,180 170,72" />
                <polyline points="60,72 100,180" />
                <polyline points="140,72 100,180" />
                <polyline points="100,74 100,180" />
              </g>

              {/* central table glow */}
              <ellipse cx="100" cy="44" rx="30" ry="14" fill="url(#d3-glow)" />
            </svg>
          </div>

          {/* spectral facet glints */}
          <div className="absolute left-[35%] top-[23%]">
            <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden>
              <path
                d="M11 0 L12.4 9.6 L22 11 L12.4 12.4 L11 22 L9.6 12.4 L0 11 L9.6 9.6 Z"
                fill="#EAFBFF"
              />
            </svg>
          </div>
          <div className="absolute left-[60%] top-[40%]">
            <svg width="13" height="13" viewBox="0 0 22 22" aria-hidden>
              <path
                d="M11 0 L12.4 9.6 L22 11 L12.4 12.4 L11 22 L9.6 12.4 L0 11 L9.6 9.6 Z"
                fill="#FFC061"
              />
            </svg>
          </div>
        </div>

        <div className="relative z-10 max-w-[760px]">
          <h1
            className="text-[clamp(2.6rem,7vw,5.2rem)] font-bold leading-[0.98] tracking-[-0.01em] text-[#EAECF6]"
            style={display}
          >
            Pool SOL,
            <br />
            Mine Like a{" "}
            <span
              className={styles.chroma}
              data-text="Whale"
            >
              Whale
            </span>
          </h1>
          <p className="mt-7 max-w-[560px] text-[17px] leading-relaxed text-[#A8B0D4]">
            Join the Diamond Pool and Mine More together.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <Link
              href="/pools"
              className={`${styles.prismPill} group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium text-[#EAECF6]`}
            >
              Enter the pool
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* spec row */}
          <div className="mt-11 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {HERO_SPECS.map((s) => (
              <div key={s} className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rotate-45"
                  style={{
                    background: "linear-gradient(135deg,#22E0E6,#9A6BFF)",
                    boxShadow: "0 0 8px rgba(91,108,255,0.7)",
                  }}
                />
                <p className="text-[13px] font-medium leading-snug text-[#EAECF6]">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════ */}
      <section className="mt-28">
        <SectionLabel t="How it works" />
        <div className="mt-12 flex flex-col gap-6 sm:gap-7">
          {STEPS.map((step, i) => (
            <HowRow key={step.n} step={step} flip={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* ══ THE EDGE — graded comparison table ═════════════════════ */}
      <section className="mt-28">
        <SectionLabel k="the edge" t="Whale-like performance." />
        <div
          className={`${styles.glass} ${styles.spectralEdge} ${styles.cutTR} mt-9 overflow-hidden rounded-3xl`}
        >
          {/* table head */}
          <div
            className="grid grid-cols-[72px_1fr_104px] items-center border-b border-[rgba(255,255,255,0.10)] px-5 py-3 sm:grid-cols-[104px_1fr_148px] sm:px-7"
            style={mono}
          >
            <span className="text-[10px] uppercase tracking-[0.22em] text-[#6E7AA0]">grade</span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-[#6E7AA0]">property</span>
            <span className="text-right text-[10px] uppercase tracking-[0.22em] text-[#6E7AA0]">
              Edge
            </span>
          </div>
          {EDGE.map((e, i) => (
            <div
              key={e.t}
              className={`grid grid-cols-[72px_1fr_104px] items-center px-5 py-5 transition-colors hover:bg-[rgba(91,108,255,0.06)] sm:grid-cols-[104px_1fr_148px] sm:px-7 ${
                i < EDGE.length - 1 ? "border-b border-[rgba(255,255,255,0.08)]" : ""
              }`}
            >
              <span
                style={mono}
                className="w-fit rounded-md border border-[rgba(34,224,230,0.4)] bg-[rgba(34,224,230,0.08)] px-2 py-1 text-[11px] text-[#22E0E6]"
              >
                {e.grade}
              </span>
              <div className="pr-4 sm:pr-8">
                <h3
                  style={display}
                  className="text-[16px] font-semibold tracking-tight text-[#EAECF6] sm:text-[17px]"
                >
                  {e.t}
                </h3>
                <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-[#9AA3C8]">
                  {e.d}
                </p>
              </div>
              <span style={mono} className="text-right text-[12px] text-[#22E0E6]">
                {e.metric}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ══ THE HONEST PART ════════════════════════════════════════ */}
      <section className="mt-28">
        <div
          className={`${styles.glass} ${styles.spectralEdge} ${styles.cutBL} relative overflow-hidden rounded-3xl p-8 sm:p-12`}
        >
          {/* inner dispersion accent */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full"
            style={{
              background:
                "radial-gradient(circle,rgba(154,107,255,0.18),transparent 70%)",
            }}
          />
          <span
            className="text-[12px] uppercase tracking-[0.35em] text-[#6E7AA0]"
            style={mono}
          >
            the honest part
          </span>
          <h2
            className="mt-5 max-w-[720px] text-[clamp(1.7rem,3.6vw,2.6rem)] font-bold leading-[1.06] text-[#EAECF6]"
            style={display}
          >
            A real edge, not a bet on the room staying{" "}
            <span className={styles.chroma} data-text="dumb">
              dumb
            </span>
            .
          </h2>
          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <p className="text-[15px] leading-relaxed text-[#A8B0D4]">
              Plenty of products sell a single number and call it an edge. The
              trouble with a number everyone can hit is simple: the market
              reprices and the edge quietly disappears.
            </p>
            <p className="text-[15px] leading-relaxed text-[#A8B0D4]">
              We build on advantages that don&apos;t depend on someone else
              playing badly. Pooling lowers your variance. Holding compounds
              your yield. Flexible claims let you take profit without giving up
              your position.
            </p>
          </div>
          <div className="mt-8 inline-flex items-center gap-3">
            <span
              className="h-px w-10"
              style={{ background: "linear-gradient(90deg,transparent,#9A6BFF)" }}
            />
            <span
              className={`${styles.spectralText} text-[15px] font-semibold tracking-wide`}
              style={display}
            >
              Structure over hopium.
            </span>
          </div>

          {/* transparency — blended in from the onchain section */}
          <div className="mt-10 border-t border-[rgba(255,255,255,0.08)] pt-8">
            <h2
              className="max-w-[720px] text-[clamp(1.5rem,3vw,2.1rem)] font-bold leading-[1.08] text-[#EAECF6]"
              style={display}
            >
              Fully transparent, not a red box.
            </h2>
            <p className="mt-5 max-w-[680px] text-[15px] leading-relaxed text-[#A8B0D4]">
              Every deposit, balance, and flow lives on Solana, readable by any
              explorer at any time. The vault holds the SOL, the program mines it,
              and funds only ever move{" "}
              <span className="text-[#EAECF6]" style={mono}>
                vault → ORE → back
              </span>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ══ POOLS — two crystal shards ═════════════════════════════ */}
      <section className="mt-28">
        <SectionLabel k="pools" t="Two shards. One lit, one forming." />
        <div className="mt-9 grid gap-6 md:grid-cols-2">
          {/* Simple — LIVE */}
          <Tilt>
            <div
              className={`${styles.glass} ${styles.spectralEdge} ${styles.cutTR} relative h-full overflow-hidden rounded-3xl p-8`}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle,rgba(34,224,230,0.18),transparent 70%)",
                }}
              />
              <div className="flex items-center justify-between">
                <h3 className="text-[24px] font-bold text-[#EAECF6]" style={display}>
                  Simple
                </h3>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] tracking-[0.2em]"
                  style={{
                    ...mono,
                    background: "rgba(34,224,230,0.12)",
                    boxShadow: "inset 0 0 0 1px rgba(34,224,230,0.4)",
                    color: "#7FF0F4",
                  }}
                >
                  <span className={`${styles.liveDot} h-1.5 w-1.5 rounded-full bg-[#22E0E6]`} />
                  LIVE
                </span>
              </div>
              <p className="mt-4 text-[14.5px] leading-relaxed text-[#A8B0D4]">
                Disciplined 25-tile mining, no lockup. The engine commits only on
                rounds it likes; withdraw any open window.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "deposit SOL, mint CWR",
                  "1% on volume, nothing on idle",
                  "claim SOL plus stORE any open window",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-3 text-[14px] text-[#C6CCEC]">
                    <span
                      className="h-2 w-2 rotate-45"
                      style={{
                        background: "linear-gradient(135deg,#22E0E6,#9A6BFF)",
                      }}
                    />
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href="/pools"
                className={`${styles.ignite} mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-medium text-[#EAECF6]`}
              >
                Enter Simple <ArrowIcon className="h-4 w-4" />
              </Link>
            </div>
          </Tilt>

          {/* Refined — COMING SOON (frosted) */}
          <div
            className={`${styles.frosted} ${styles.cutBL} relative flex h-full flex-col rounded-3xl p-8`}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-[24px] font-bold text-[#8A92B4]"
                style={display}
              >
                Refined
              </h3>
              <span
                className="rounded-full px-3 py-1 text-[11px] tracking-[0.2em] text-[#7A82A4]"
                style={{
                  ...mono,
                  background: "rgba(154,167,216,0.08)",
                  boxShadow: "inset 0 0 0 1px rgba(154,167,216,0.18)",
                }}
              >
                COMING SOON
              </span>
            </div>
            <p className="mt-4 max-w-[360px] text-[14.5px] leading-relaxed text-[#7E86A8]">
              A higher-refinement strategy is taking shape. Frosted colorless
              now — it gains its spectrum when the engine goes live.
            </p>
            <div className="mt-auto pt-8">
              <div className="flex items-center gap-2 text-[12px] tracking-[0.18em] text-[#6E769A]" style={mono}>
                <span className="h-px flex-1 bg-[rgba(154,167,216,0.18)]" />
                no fire yet
                <span className="h-px flex-1 bg-[rgba(154,167,216,0.18)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TEAM ═══════════════════════════════════════════════════ */}
      <section className="mt-28">
        <SectionLabel k="the team" t="Built by ORE natives." />
        <div className="mt-9 grid gap-5 sm:grid-cols-2">
          {TEAM.map((m) => (
            <div
              key={m.name}
              className={`${styles.glass} ${styles.cutTR} flex items-start gap-5 rounded-2xl p-6`}
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-[rgba(154,167,216,0.3)]">
                <Image src={m.avatar} alt={m.name} fill sizes="56px" className="object-cover" />
              </span>
              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-[18px] font-semibold text-[#EAECF6]" style={display}>
                    {m.name}
                  </h3>
                  <span className="text-[12px] tracking-[0.16em] text-[#7FA0E0]" style={mono}>
                    {m.role}
                  </span>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-[#9AA3C8]">
                  {m.d}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ CTA BAND ═══════════════════════════════════════════════ */}
      <section id="live" className="mt-28">
        <div
          className={`${styles.glass} ${styles.spectralEdge} ${styles.cutTR} relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-12`}
        >
          <div className={styles.heroBeam} aria-hidden>
            <div
              className="absolute left-1/2 top-1/2 h-[200%] w-[60%] -translate-x-1/2 -translate-y-1/2"
              style={{
                background:
                  "conic-gradient(from 200deg at 50% 50%, transparent, rgba(34,224,230,0.12), rgba(91,108,255,0.14), rgba(154,107,255,0.14), rgba(255,90,200,0.1), transparent)",
                filter: "blur(30px)",
              }}
            />
          </div>
          <h2
            className="relative text-[clamp(1.8rem,4vw,3rem)] font-bold leading-[1.05] text-[#EAECF6]"
            style={display}
          >
            Pool your SOL. Mine ORE as one.
          </h2>
          <p className="relative mx-auto mt-4 max-w-[500px] text-[15px] text-[#A8B0D4]">
            One disciplined pool, a keeper that never sleeps, and a claim window
            that opens on your terms.
          </p>
          <Link
            href="/pools"
            className={`${styles.prismPill} relative mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-[16px] font-medium text-[#EAECF6]`}
          >
            Enter the pool <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}

/* ── local components ────────────────────────────────────────────── */
/* ── How-it-works: a tall step row with an animated graphic ───────── */
function HowRow({
  step,
  flip,
}: {
  step: (typeof STEPS)[number];
  flip: boolean;
}) {
  const { n, t, d, Graphic } = step;
  return (
    <div
      className={`${styles.glass} ${styles.spectralEdge} ${
        flip ? styles.cutBL : styles.cutTR
      } ${styles.rise} grid items-center gap-8 rounded-3xl p-8 sm:p-10 md:grid-cols-2 md:gap-14 md:p-14`}
    >
      <div className={`flex justify-center ${flip ? "md:order-2" : ""}`}>
        <div className={styles.howStage}>
          <Graphic />
        </div>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        <div className="flex items-center gap-3">
          <span className="text-[13px] tracking-[0.34em] text-[#7FA0E0]" style={mono}>
            {n}
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-[rgba(127,160,224,0.45)] to-transparent" />
        </div>
        <h3
          className="mt-5 text-[26px] font-semibold leading-tight text-[#EAECF6] sm:text-[30px]"
          style={display}
        >
          {t}
        </h3>
        <p className="mt-4 max-w-[44ch] text-[16px] leading-relaxed text-[#9AA3C8]">{d}</p>
      </div>
    </div>
  );
}

/* Step 1 — SOL streams in and refracts into a dOre share token */
function StepTokenGraphic() {
  const feeds = [
    { fx: "-94px", fy: "-66px", delay: "0s" },
    { fx: "96px", fy: "-54px", delay: "0.7s" },
    { fx: "-78px", fy: "80px", delay: "1.4s" },
    { fx: "86px", fy: "84px", delay: "2.1s" },
  ];
  return (
    <>
      <div className={styles.howOrbit} />
      {feeds.map((f, i) => (
        <span
          key={i}
          className={styles.howFeed}
          style={
            { "--fx": f.fx, "--fy": f.fy, animationDelay: f.delay } as React.CSSProperties
          }
        />
      ))}
      <div className={styles.howToken}>
        <svg width="120" height="120" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <linearGradient id="doreToken" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#22E0E6" />
              <stop offset="0.5" stopColor="#5B6CFF" />
              <stop offset="1" stopColor="#9A6BFF" />
            </linearGradient>
          </defs>
          <path d="M50 6 L86 38 L50 94 L14 38 Z" fill="url(#doreToken)" opacity="0.92" />
          <path d="M50 6 L86 38 L50 38 Z" fill="#FFFFFF" opacity="0.18" />
          <path d="M14 38 L50 38 L50 94 Z" fill="#000000" opacity="0.12" />
          <path
            d="M14 38 L86 38 M50 6 L50 94 M32 38 L50 22 L68 38"
            stroke="#EAF6FF"
            strokeWidth="0.8"
            opacity="0.4"
            fill="none"
          />
        </svg>
      </div>
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[56px] text-[11px] uppercase tracking-[0.32em] text-[#9AA3C8]"
        style={mono}
      >
        dOre
      </span>
    </>
  );
}

/* Step 2 — the keeper mines all 25 tiles, only when EV-positive */
function StepBoardGraphic() {
  return (
    <>
      <div className={styles.howBoard}>
        {Array.from({ length: 25 }).map((_, i) => {
          const delay = ((Math.floor(i / 5) + (i % 5)) * 0.13).toFixed(2); // diagonal wave
          return (
            <span key={i} className={styles.howTile} style={{ animationDelay: `${delay}s` }} />
          );
        })}
      </div>
      <span
        className={`${styles.howEv} rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#070912]`}
        style={{
          ...mono,
          background: "linear-gradient(135deg,#22E0E6,#9A6BFF)",
          boxShadow: "0 0 14px rgba(91,108,255,0.6)",
        }}
      >
        EV+
      </span>
    </>
  );
}

/* Step 3 — value compounds upward into APY */
function StepYieldGraphic() {
  return (
    <svg className={styles.howChart} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="apyLine" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#22E0E6" />
          <stop offset="0.5" stopColor="#5B6CFF" />
          <stop offset="1" stopColor="#FF5AC8" />
        </linearGradient>
        <linearGradient id="apyArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B6CFF" stopOpacity="0.4" />
          <stop offset="1" stopColor="#5B6CFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="6" y1="84" x2="94" y2="84" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
      <path
        className={styles.howArea}
        d="M6 82 C 28 80, 40 62, 56 50 S 80 22, 94 10 L94 84 L6 84 Z"
        fill="url(#apyArea)"
      />
      <path
        className={styles.howLine}
        d="M6 82 C 28 80, 40 62, 56 50 S 80 22, 94 10"
        stroke="url(#apyLine)"
        strokeWidth="2.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: "drop-shadow(0 0 3px rgba(91,108,255,0.7))" }}
      />
      <circle
        className={styles.howSpark}
        cx="94"
        cy="10"
        r="2.6"
        fill="#EAF6FF"
        style={{ filter: "drop-shadow(0 0 5px rgba(255,90,200,0.9))" }}
      />
    </svg>
  );
}

function SectionLabel({ k, t }: { k?: string; t: string }) {
  return (
    <div>
      {k && (
        <div className="flex items-center gap-3">
          <span
            className="h-2 w-2 rotate-45"
            style={{
              background: "linear-gradient(135deg,#22E0E6,#FF5AC8)",
              boxShadow: "0 0 8px rgba(91,108,255,0.7)",
            }}
          />
          <span
            className="text-[12px] uppercase tracking-[0.35em] text-[#6E7AA0]"
            style={{ fontFamily: "'JetBrains Mono Variable', monospace" }}
          >
            {k}
          </span>
        </div>
      )}
      <h2
        className={`${k ? "mt-4 " : ""}text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold leading-[1.05] text-[#EAECF6]`}
        style={{ fontFamily: "'Chakra Petch', sans-serif" }}
      >
        {t}
      </h2>
    </div>
  );
}

