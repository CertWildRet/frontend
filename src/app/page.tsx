import Link from "next/link";
import Image from "next/image";
import styles from "./dispersion.module.css";
import {
  SpectralDefs,
  ArrowIcon,
} from "./parts";
import { PauseWhenOffscreen } from "@/components/PauseWhenOffscreen";
import { HeroLiveStrip } from "@/components/HeroLiveStrip";
import { SPECTRAL_CHART } from "@/lib/spectral";
import { SpectralChartDefs } from "@/lib/SpectralChartDefs";

/* ── inline data ─────────────────────────────────────────────────── */
const STEPS = [
  {
    n: "01",
    t: "Get dORE tokens",
    d: "Your pro-rata share of the Diamond Pool — dORE tracks ORE.",
    Graphic: StepTokenGraphic,
  },
  {
    n: "02",
    t: "Let our algorithms do the work",
    d: "It mines the full ORE board (25 tiles), only on rounds that are EV-positive.",
    Graphic: StepBoardGraphic,
  },
  {
    n: "03",
    t: "Claim or let it keep working",
    d: "Pull out to SOL during any open claim window, or hold on. dORE compounds into stORE.",
    Graphic: StepYieldGraphic,
  },
];

const EDGE = [
  {
    grade: "VVS1",
    t: "Mine as one.",
    d: "Pooled capital behaves like a whale: smoother outcomes, less variance, and a faster path to the exposure that matters.",
    metric: "less variance",
  },
  {
    grade: "VVS2",
    t: "Hit more wins.",
    d: "On every round it mines, the pool covers the whole board, so it catches winning tiles a lone miner deploys too little to reach.",
    metric: "better odds",
  },
  {
    grade: "VS1",
    t: "Claim on your terms.",
    d: "Take profit any open window without unwinding your whole position. What you leave keeps working.",
    metric: "exit anytime",
  },
];

const TEAM = [
  {
    name: "br0wnD3v",
    role: "Infrastructure",
    avatar: "/brown.png",
    d: "Contracts, miner, and the rails. Builds the machine that runs the board nonstop. Also devs for Adrena DEX.",
    x: "https://x.com/anuj_tnr",
  },
  {
    name: "Willd",
    role: "Product",
    avatar: "/will.png",
    d: "Product, brand, and direction. Makes pooled mining read clean and feel serious. Ex-Minemore.",
    x: "https://x.com/willdxyz",
  },
  {
    name: "ZeDef_Koala",
    role: "Quant",
    avatar: "/koala.png",
    d: "Thats our quant. Our quantitative, our math specialist! Also maths for Adrena DEX.",
    x: "https://x.com/ZeDef_Koala",
  },
];

const HERO_SPECS = [
  "Non-custodial",
  "Transparent",
  "Lowest fees",
  "Built by miners for miners",
];

const display = { fontFamily: "'Chakra Petch', sans-serif" } as const;
const mono = { fontFamily: "'JetBrains Mono Variable', monospace" } as const;

export default function DispersionLanding() {
  return (
    <div className="relative mx-auto w-full max-w-[1180px] pb-28 pt-4 sm:px-8">
      <SpectralDefs />

      {/* ══ HERO ═══════════════════════════════════════════════════ */}
      <section className="relative mt-4 sm:mt-6">
        {/* floating 3D brilliant-cut diamond, top-right - the refractor */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[0%] top-1/2 hidden h-[291px] w-[336px] -translate-y-1/2 md:block lg:h-[374px] lg:w-[432px] xl:h-[416px] xl:w-[480px]"
        >
          {/* spectral halo */}
          <div
            className={`${styles.prismHalo} absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl`}
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

              {/* pavilion (lower point) - luminous, reflective facets */}
              <polygon points="30,72 100,72 100,180" fill="url(#d3-pavilion)" opacity="0.97" />
              <polygon points="170,72 100,72 100,180" fill="url(#d3-pavR)" opacity="0.95" />
              <polygon points="30,72 60,72 100,180" fill="url(#d3-pavOuterL)" opacity="0.95" />
              <polygon points="170,72 140,72 100,180" fill="url(#d3-pavOuterR)" opacity="0.93" />

              {/* specular shine - bright belt + glints converging to the culet */}
              <polygon points="30,72 170,72 138,99 62,99" fill="#FFFFFF" opacity="0.14" />
              <polygon points="60,73 67,73 100,180" fill="#CFFAFF" opacity="0.24" />
              <polygon points="86,73 97,73 100,180" fill="#FFFFFF" opacity="0.32" />
              <polygon points="104,73 116,73 100,180" fill="#FFE7F6" opacity="0.24" />

              {/* girdle band - bright reflective belt */}
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
              {/* bright kite facets - cyan + fire */}
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
            Join the Diamond Pool and mine ORE as one whale.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <span
              className={`${styles.prismPill} ${styles.prismPillMono} inline-flex cursor-default items-center rounded-full px-7 py-3.5 text-[15px] font-medium text-[#EAECF6] opacity-70`}
              aria-disabled="true"
            >
              Coming soon
            </span>
            <Link
              href="/stats"
              className={`${styles.prismPill} group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium text-[#EAECF6]`}
            >
              Browse Ore Data
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

      {/* live-proof strip fills the first-view negative space. Outside the hero
          section so the centered diamond doesn't drift. */}
      <div className="mt-12 sm:mt-14">
        <HeroLiveStrip />
      </div>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════ */}
      <section className="mt-20">
        <SectionLabel t="How it works" />
        <PauseWhenOffscreen className="mt-12 flex flex-col gap-6 sm:gap-7">
          {STEPS.map((step, i) => (
            <HowRow key={step.n} step={step} flip={i % 2 === 1} />
          ))}
        </PauseWhenOffscreen>
      </section>

      {/* ══ THE EDGE - graded comparison table ═════════════════════ */}
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
              playing badly. Pooling lowers your variance. Holding dORE
              compounds yield via stORE. Flexible claims let you take profit without giving up your position.
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

          {/* transparency - blended in from the onchain section */}
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

      {/* ══ TEAM ═══════════════════════════════════════════════════ */}
      <section className="mt-28">
        <SectionLabel k="the team" t="Built by Solana natives." />
        <div className="mt-9 grid gap-5 sm:grid-cols-3">
          {TEAM.map((m) => (
            <div
              key={m.name}
              className={`${styles.glass} ${styles.cutTR} flex items-start gap-5 rounded-2xl p-6`}
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-[rgba(154,167,216,0.3)]">
                <Image src={m.avatar} alt={m.name} fill sizes="56px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-[18px] font-semibold text-[#EAECF6]" style={display}>
                      {m.name}
                    </h3>
                    <span className="text-[12px] tracking-[0.16em] text-[#7FA0E0]" style={mono}>
                      {m.role}
                    </span>
                  </div>
                  <a
                    href={m.x}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${m.name} on X`}
                    className="mt-0.5 flex-shrink-0 text-[#9AA3C8] transition-colors hover:text-white"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
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
            Pool your SOL. Mine ORE like a whale.
          </h2>
          <p className="relative mx-auto mt-4 max-w-[500px] text-[15px] text-[#A8B0D4]">
            One disciplined pool, a miner that never sleeps, and a claim window
            that opens on your terms.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <span
              className={`${styles.prismPill} ${styles.prismPillMono} inline-flex cursor-default items-center rounded-full px-8 py-4 text-[16px] font-medium text-[#EAECF6] opacity-70`}
              aria-disabled="true"
            >
              Coming soon
            </span>
            <Link
              href="/stats"
              className={`${styles.prismPill} group inline-flex items-center gap-2 rounded-full px-8 py-4 text-[16px] font-medium text-[#EAECF6]`}
            >
              Browse Ore Data
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
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

/* Step 1 — SOL refracts into the dORE share token. */
function StepTokenGraphic() {
  const token = { id: "doreTok", label: "dORE", g: ["#22E0E6", "#5B6CFF", "#9A6BFF"], glow: "rgba(34,224,230,0.5)" };
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={styles.howDuo}>
        <span className={styles.howRing} aria-hidden />
        <span className={styles.howOrbiter} aria-hidden>
          <span className={styles.howOrbiterDot} />
        </span>
        <div className="relative flex flex-col items-center gap-3.5">
          <div className={styles.howShard}>
            <span
              className={styles.howWarmLeft}
              style={{ background: `radial-gradient(circle, ${token.glow} 0%, transparent 68%)` }}
              aria-hidden
            />
            <svg
              width="86"
              height="86"
              viewBox="0 0 100 100"
              aria-hidden
              style={{ filter: `drop-shadow(0 0 16px ${token.glow})` }}
            >
              <defs>
                <linearGradient id={token.id} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={token.g[0]} />
                  <stop offset="0.5" stopColor={token.g[1]} />
                  <stop offset="1" stopColor={token.g[2]} />
                </linearGradient>
              </defs>
              <path d="M50 6 L86 38 L50 94 L14 38 Z" fill={`url(#${token.id})`} opacity="0.92" />
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
          <span className="text-[11px] uppercase tracking-[0.28em] text-[#9AA3C8]" style={mono}>
            {token.label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* Reusable ORE 25-tile mining board (the dORE representation), sized. */
function OreBoard({ size, animated = true }: { size: number; animated?: boolean }) {
  return (
    <div
      className="relative grid grid-cols-5 grid-rows-5 gap-[7%]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {Array.from({ length: 25 }).map((_, i) => {
        const delay = ((Math.floor(i / 5) + (i % 5)) * 0.13).toFixed(2); // diagonal wave
        return (
          <span
            key={i}
            className={animated ? styles.howTile : `${styles.howTile} ${styles.howTileLit}`}
            style={animated ? { animationDelay: `${delay}s` } : undefined}
          />
        );
      })}
    </div>
  );
}

/* Step 2 — the miner mines the full ORE board, only on EV-positive rounds. */
function StepBoardGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-6 px-2">
      <div className="flex flex-col items-center gap-2.5">
        <OreBoard size={116} />
        <span className="text-[9.5px] uppercase tracking-[0.22em] text-[#8FA8E0]" style={mono}>
          ORE · 25
        </span>
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
    </div>
  );
}

/* Step 3 - value compounds upward into APY.
   FRAME-LOCK: the line draw, the area fade and the rider dot are ALL driven by
   SMIL <animate>/<animateMotion> inside this one <svg>, so they share the
   single SVG SMIL clock with identical dur/keyTimes/keySplines - no CSS-vs-SMIL
   drift. The dot rides the same #apyPath in user-space (keyPoints 0;1;1), so it
   scales 1:1 with the line at every render size and sits exactly on the painted
   tip, then parks there for the ~5s hold. */
function StepYieldGraphic() {
  const DUR = "8.5s";
  const KEYTIMES = "0;0.41;1"; // draw over first 41%, then hold to end
  const KEYSPLINES = "0.42 0 0.58 1;0 0 0 0"; // draw eased (ease-in-out), hold frozen
  return (
    <svg className={styles.howChart} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <SpectralChartDefs lineId="apyLine" areaId="apyArea" />
      </defs>
      <line x1="6" y1="84" x2="94" y2="84" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
      {/* AREA - fades in on the same SMIL clock as the draw. */}
      <path
        className={styles.howArea}
        d="M6 82 C 28 80, 40 62, 56 50 S 80 22, 94 10 L94 84 L6 84 Z"
        fill="url(#apyArea)"
        opacity="0"
      >
        <animate
          attributeName="opacity"
          dur={DUR}
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes={KEYTIMES}
          keySplines={KEYSPLINES}
          values="0;0.5;0.5"
          fill="freeze"
        />
      </path>
      {/* LINE - stroke-dashoffset animated by SMIL (NOT CSS) so it shares the
          dot's clock. pathLength=1 normalizes the dash at every render size. */}
      <path
        id="apyPath"
        className={styles.howLine}
        d="M6 82 C 28 80, 40 62, 56 50 S 80 22, 94 10"
        pathLength={1}
        stroke="url(#apyLine)"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="1"
        strokeDashoffset="1"
        style={{ filter: SPECTRAL_CHART.lineGlow }}
      >
        <animate
          attributeName="stroke-dashoffset"
          dur={DUR}
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes={KEYTIMES}
          keySplines={KEYSPLINES}
          values="1;0;0"
          fill="freeze"
        />
      </path>
      {/* DOT - same SVG SMIL clock + same dur/keyTimes/keySplines as the draw,
          so it is frame-locked to the painted tip. keyPoints 0;1;1 parks it at
          the tip during the hold. cx/cy stay 0 + r fixed => perfectly round at
          any size. Opacity fade is also SMIL (shared clock). */}
      <circle
        className={styles.howSpark}
        cx="0"
        cy="0"
        r="2.6"
        fill={SPECTRAL_CHART.mark}
        opacity="0"
        style={{ filter: SPECTRAL_CHART.markGlow }}
      >
        <animate
          attributeName="opacity"
          dur={DUR}
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.03;1"
          keySplines="0.42 0 0.58 1;0 0 0 0"
          values="0;1;1"
          fill="freeze"
        />
        <animateMotion
          dur={DUR}
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes={KEYTIMES}
          keyPoints="0;1;1"
          keySplines={KEYSPLINES}
          rotate="0"
        >
          <mpath href="#apyPath" />
        </animateMotion>
      </circle>
      {/* reduced-motion fallback: static dot parked at the curve tip (94,10).
          The SMIL above uses fill="freeze" and resolves to this same end state,
          and CSS reveals this static dot while hiding the rider. */}
      <circle
        className={styles.howSparkStatic}
        cx="94"
        cy="10"
        r="2.6"
        fill={SPECTRAL_CHART.mark}
        style={{ filter: SPECTRAL_CHART.markGlow }}
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

