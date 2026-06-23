import Link from "next/link";
import styles from "./loupe.module.css";
import { DiamondWireframe } from "./diamond";

/* ===================== type helpers ===================== */
const mono = {
  fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
} as const;
const sora = {
  fontFamily: "'Sora Variable', system-ui, sans-serif",
} as const;

/* tiny mono label, certificate-field style */
function Field({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      style={mono}
      className={`text-[12px] uppercase tracking-[0.2em] text-[#626E7E] ${className}`}
    >
      {children}
    </span>
  );
}

/* numbered clause header */
function Clause({
  no,
  kicker,
  title,
}: {
  no: string;
  kicker: string;
  title: string;
}) {
  return (
    <div className="mb-10 flex items-end justify-between gap-6 border-b border-[rgba(180,200,225,0.14)] pb-5">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <span
            style={mono}
            className="rounded-[3px] border border-[rgba(180,200,225,0.14)] px-1.5 py-0.5 text-[12px] text-[#4D82FF]"
          >
            §{no}
          </span>
          <Field>{kicker}</Field>
        </div>
        <h2
          style={sora}
          className="max-w-2xl text-2xl font-medium leading-tight tracking-tight text-[#EAEEF4] sm:text-[28px]"
        >
          {title}
        </h2>
      </div>
      <span style={mono} className="hidden shrink-0 text-[12px] text-[#4A5563] sm:block">
        FIG. {no}
      </span>
    </div>
  );
}

/* drafting checkmark / tick icon */
function Tick({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path d="M3 8.5l3.2 3.2L13 4.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/* monoline drafting icons */
function Icon({ name, className = "" }: { name: string; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    className,
  } as const;
  switch (name) {
    case "deposit":
      return (
        <svg {...common}>
          <rect x="4" y="9" width="16" height="11" rx="1" />
          <path d="M12 3v8m0 0l3-3m-3 3L9 8" />
        </svg>
      );
    case "engine":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </svg>
      );
    case "compound":
      return (
        <svg {...common}>
          <path d="M4 20V8M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "vault":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="1.5" />
          <circle cx="12" cy="12" r="3.4" />
          <path d="M12 12v-2M12 12l1.6 1" />
        </svg>
      );
    case "authority":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "verify":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6" />
          <path d="M15.5 15.5L21 21" />
          <path d="M8.5 11l1.8 1.8L14 9" />
        </svg>
      );
    default:
      return null;
  }
}

/* ===================== data ===================== */
const STEPS = [
  {
    no: "01",
    icon: "deposit",
    title: "Deposit SOL, mint CWR",
    body: "Your SOL joins the pool and you receive CWR, a streamlined share of everything the pool mines. Burn it any open window to walk away.",
    spec: "SOL → CWR · burn any window",
  },
  {
    no: "02",
    icon: "engine",
    title: "The engine works the board",
    body: "A keeper runs the 25-tile ORE board nonstop, committing capital only when conditions line up in the pool's favor. You never sign a thing in between.",
    spec: "25 tiles · 24/7 · 0 signatures",
  },
  {
    no: "03",
    icon: "compound",
    title: "ORE compounds into stORE",
    body: "Winnings ride instead of cashing out early, sidestepping the claim fee and stacking refining yield, then settle into stORE. Claim to take SOL plus your pro-rata stORE.",
    spec: "ORE → stORE · refine + compound",
  },
];

const EDGE = [
  {
    grade: "VVS1",
    title: "Mine as one.",
    body: "Pooled capital behaves like a whale. Smoother outcomes, less variance, a faster path to the exposure that actually matters.",
    metric: "variance ↓",
  },
  {
    grade: "VVS2",
    title: "Hold to compound.",
    body: "Winnings stay in and refine instead of cashing out early. The patient capture yield the impatient leave behind.",
    metric: "yield ↑",
  },
  {
    grade: "VS1",
    title: "Claim on your terms.",
    body: "Take profit any open window without unwinding your whole position. Whatever you leave behind keeps working.",
    metric: "flexible exit",
  },
];

const PROOF = [
  {
    icon: "vault",
    title: "Vault treasury",
    body: "where pooled SOL lives onchain before each round.",
  },
  {
    icon: "authority",
    title: "Mining authority",
    body: "a program-owned signer. It can mine, never withdraw to a human.",
  },
  {
    icon: "verify",
    title: "Verifiable claims",
    body: "mint, burn, and payout are all onchain. Read them yourself.",
  },
];

const FOUR_CS = [
  { c: "Clarity", maps: "transparency", val: "FL" },
  { c: "Cut", maps: "structure", val: "Excellent" },
  { c: "Carat", maps: "TVL", val: "1,284.50" },
  { c: "Certified", maps: "onchain", val: "Solana" },
];

const TEAM = [
  {
    handle: "br0wnD3v",
    role: "Infrastructure",
    body: "Contracts, keeper, and the rails. Builds the machine that runs the board nonstop.",
  },
  {
    handle: "Willd",
    role: "Product Manager",
    body: "Product, brand, and direction. Makes pooled mining read clean and feel serious.",
  },
];

/* ===================== page ===================== */
export default function LoupeLanding() {
  return (
    <main className="mx-auto max-w-[1180px] px-5 pb-28 pt-6 sm:px-8">
      {/* ---------- certificate masthead ---------- */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAEEF4]/70 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#EAEEF4]/70">
            {/* loupe mark */}
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#EAEEF4" strokeWidth="1.6">
              <circle cx="10" cy="10" r="6" />
              <path d="M14.5 14.5L21 21" />
            </svg>
          </span>
          <div className="leading-none">
            <div style={sora} className="text-[15px] font-semibold tracking-tight text-[#EAEEF4]">
              CWR
            </div>
            <div style={mono} className="mt-0.5 text-[12px] uppercase tracking-[0.22em] text-[#626E7E]">
              grading report
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            style={mono}
            className="inline-flex items-center gap-2 rounded-[3px] border border-[#2BD4E0]/40 bg-[#2BD4E0]/10 px-2.5 py-1 text-[12px] uppercase tracking-[0.18em] text-[#2BD4E0] shadow-[0_0_18px_-8px_rgba(43,212,224,0.6)]"
          >
            <span className={`h-1.5 w-1.5 rounded-full bg-[#2BD4E0] ${styles.blink}`} />
            keeper online · 24/7
          </span>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:py-20">
        <div className={styles.rise}>
          <Field className="mb-5 block">report no. CWR-001 · solana mainnet</Field>
          <h1
            style={sora}
            className="text-[40px] font-semibold leading-[1.02] tracking-tight text-[#EAEEF4] sm:text-[56px] lg:text-[60px]"
          >
            Pool your SOL.
            <br />
            Mine ORE as one.
          </h1>
          <p style={sora} className="mt-6 max-w-xl text-[16px] leading-relaxed text-[#94A1B3]">
            Drop in SOL, mint CWR, and a tireless keeper works the ORE board for you. Pooled
            capital, smoother outcomes, and you never sign a single round.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/2/app"
              className="group inline-flex items-center gap-2.5 rounded-[3px] border border-[#4D82FF] bg-transparent px-5 py-3 text-[14px] font-medium text-[#EAEEF4] transition-colors hover:bg-[#4D82FF] hover:text-[#0A0E15] hover:shadow-[0_0_24px_-8px_rgba(77,130,255,0.6)]"
              style={sora}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current">
                <Tick className="h-2.5 w-2.5" />
              </span>
              Enter the pool
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <a
              href="#live"
              style={sora}
              className="inline-flex items-center gap-2 rounded-[3px] px-4 py-3 text-[14px] text-[#94A1B3] underline decoration-[rgba(180,200,225,0.2)] decoration-1 underline-offset-4 transition hover:text-[#4D82FF] hover:decoration-[#4D82FF]"
            >
              Watch it live
            </a>
          </div>

          {/* hero spec row */}
          <dl className="mt-12 grid max-w-xl grid-cols-1 gap-px overflow-hidden rounded-[3px] border border-[rgba(180,200,225,0.14)] bg-[rgba(180,200,225,0.14)] sm:grid-cols-3">
            {[
              ["non-custodial", "funds never leave the vault"],
              ["no lockup", "leave any open window"],
              ["hands-off", "zero transactions to sign"],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#0F141D] px-4 py-3.5">
                <dt style={mono} className="text-[12px] uppercase tracking-[0.16em] text-[#4D82FF]">
                  {k}
                </dt>
                <dd style={sora} className="mt-1 text-[12.5px] leading-snug text-[#94A1B3]">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* wireframe blueprint plate */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-[4px] border border-[rgba(180,200,225,0.14)] bg-[#0F141D] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
            {/* plate header */}
            <div className="flex items-center justify-between border-b border-[rgba(180,200,225,0.14)] px-4 py-2.5">
              <Field>cut · emerald / step</Field>
              <Field>scale 1:1</Field>
            </div>
            <div className="relative bg-[#0F141D] px-2">
              <DiamondWireframe className="mx-auto h-auto w-full max-w-[400px]" />
            </div>
            <div className="flex items-center justify-between border-t border-[rgba(180,200,225,0.14)] px-4 py-2.5">
              <span style={mono} className="text-[12px] text-[#626E7E]">
                proportions verified
              </span>
              <span style={mono} className="inline-flex items-center gap-1.5 text-[12px] text-[#3DD68C]">
                <Tick className="h-3 w-3" /> graded onchain
              </span>
            </div>
          </div>
          {/* corner annotation */}
          <span
            style={mono}
            className="absolute -left-2 -top-3 hidden rounded-[2px] bg-[#4D82FF] px-1.5 py-0.5 text-[12px] uppercase tracking-[0.16em] text-white sm:block"
          >
            fig. A
          </span>
        </div>
      </section>

      {/* ---------- HOW IT WORKS — spec sheet ---------- */}
      <section className="py-12">
        <Clause no="01" kicker="procedure" title="How it works — three certified steps." />
        <div className="grid gap-px overflow-hidden rounded-[4px] border border-[rgba(180,200,225,0.14)] bg-[rgba(180,200,225,0.14)] md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.no}
              className={`group bg-[#0F141D] p-6 transition-colors hover:bg-[#131926] ${styles.snapTarget}`}
            >
              <div className="flex items-center justify-between">
                <span style={mono} className="text-[28px] font-light leading-none text-[#2A3242] transition-colors group-hover:text-[#4D82FF]">
                  {s.no}
                </span>
                <Icon name={s.icon} className="h-6 w-6 text-[#4D82FF]" />
              </div>
              <h3 style={sora} className="mt-6 text-[17px] font-medium tracking-tight text-[#EAEEF4]">
                {s.title}
              </h3>
              <p style={sora} className="mt-3 text-[13.5px] leading-relaxed text-[#94A1B3]">
                {s.body}
              </p>
              <div className="mt-5 border-t border-dashed border-[rgba(180,200,225,0.1)] pt-3">
                <span style={mono} className="text-[12px] uppercase tracking-[0.12em] text-[#626E7E]">
                  {s.spec}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- THE EDGE — comparison table ---------- */}
      <section className="py-12">
        <Clause no="02" kicker="evaluation" title="The edge — graded, not guessed." />
        <div className="overflow-hidden rounded-[4px] border border-[rgba(180,200,225,0.14)]">
          {/* table head */}
          <div
            className="grid grid-cols-[88px_1fr_120px] items-center border-b border-[rgba(180,200,225,0.14)] bg-[#131926] px-5 py-3"
            style={mono}
          >
            <span className="text-[12px] uppercase tracking-[0.16em] text-[#626E7E]">grade</span>
            <span className="text-[12px] uppercase tracking-[0.16em] text-[#626E7E]">property</span>
            <span className="text-right text-[12px] uppercase tracking-[0.16em] text-[#626E7E]">
              reading
            </span>
          </div>
          {EDGE.map((e, i) => (
            <div
              key={e.title}
              className={`grid grid-cols-[88px_1fr_120px] items-center bg-[#0F141D] px-5 py-5 transition-colors hover:bg-[#131926] ${
                i < EDGE.length - 1 ? "border-b border-[rgba(180,200,225,0.14)]" : ""
              }`}
            >
              <span
                style={mono}
                className="w-fit rounded-[3px] border border-[#4D82FF]/40 bg-[#4D82FF]/10 px-2 py-1 text-[12px] text-[#4D82FF]"
              >
                {e.grade}
              </span>
              <div className="pr-6">
                <h3 style={sora} className="text-[16px] font-medium tracking-tight text-[#EAEEF4]">
                  {e.title}
                </h3>
                <p style={sora} className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-[#94A1B3]">
                  {e.body}
                </p>
              </div>
              <span style={mono} className="text-right text-[12px] text-[#2BD4E0]">
                {e.metric}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- THE HONEST PART ---------- */}
      <section className="py-12">
        <Clause no="03" kicker="disclosure" title="A real edge, not a bet on the room staying dumb." />
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <p style={sora} className="max-w-2xl text-[15px] leading-relaxed text-[#94A1B3]">
              Plenty of products sell a single number and call it an edge. The trouble with a number
              everyone can hit is simple: the market reprices and the edge quietly disappears.
            </p>
            <p style={sora} className="max-w-2xl text-[15px] leading-relaxed text-[#94A1B3]">
              We build on advantages that don't depend on someone else playing badly. Pooling lowers
              your variance. Holding compounds your yield. Flexible claims let you take profit without
              giving up your position.
            </p>
          </div>
          <div className="flex items-center">
            <div className="w-full rounded-[4px] border border-[#4D82FF]/45 bg-[#131926] px-6 py-8 text-center shadow-[0_0_0_1px_rgba(77,130,255,0.2),0_0_24px_-8px_rgba(77,130,255,0.45)]">
              <Field className="text-[#626E7E]">conclusion</Field>
              <p style={sora} className="mt-3 text-[22px] font-medium tracking-tight text-[#EAEEF4]">
                Structure over hopium.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- ONCHAIN — grading certificate ---------- */}
      <section className="py-12">
        <Clause no="04" kicker="custody" title="You keep custody. Always." />
        <div className="relative overflow-hidden rounded-[4px] border-2 border-[#EAEEF4]/70 bg-[#0F141D] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          {/* certificate inner border */}
          <div className="m-2 rounded-[2px] border border-[rgba(180,200,225,0.14)] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[rgba(180,200,225,0.14)] pb-5">
              <div>
                <Field>certificate of custody</Field>
                <p style={sora} className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#94A1B3]">
                  Every deposit, balance, and flow lives on Solana, readable by any explorer at any
                  time. The vault holds the SOL, the program mines it, and funds only ever move{" "}
                  <span style={mono} className="rounded-[2px] bg-[#131926] px-1.5 py-0.5 text-[12px] text-[#4D82FF]">
                    vault → ORE → back
                  </span>
                  .
                </p>
              </div>
              {/* stamp */}
              <div className="relative h-24 w-24 shrink-0">
                <div
                  className={`absolute inset-0 ${styles.stamp}`}
                  style={{ filter: "drop-shadow(0 0 8px rgba(61,214,140,0.45))" }}
                >
                  <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
                    <circle cx="60" cy="60" r="56" stroke="#3DD68C" strokeWidth="2" />
                    <circle cx="60" cy="60" r="44" stroke="#3DD68C" strokeWidth="1" strokeDasharray="2 3" />
                    <text
                      x="60"
                      y="56"
                      textAnchor="middle"
                      fill="#3DD68C"
                      fontSize="13"
                      fontWeight="700"
                      style={{ fontFamily: "'JetBrains Mono Variable', monospace", letterSpacing: "0.04em" }}
                    >
                      GRADED
                    </text>
                    <text
                      x="60"
                      y="74"
                      textAnchor="middle"
                      fill="#3DD68C"
                      fontSize="13"
                      fontWeight="700"
                      style={{ fontFamily: "'JetBrains Mono Variable', monospace", letterSpacing: "0.04em" }}
                    >
                      ONCHAIN
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-px overflow-hidden rounded-[3px] border border-[rgba(180,200,225,0.14)] bg-[rgba(180,200,225,0.14)] md:grid-cols-3">
              {PROOF.map((p) => (
                <div key={p.title} className={`group bg-[#0F141D] p-5 ${styles.snapTarget}`}>
                  <Icon name={p.icon} className="h-6 w-6 text-[#4D82FF]" />
                  <h3 style={sora} className="mt-4 text-[15px] font-medium tracking-tight text-[#EAEEF4]">
                    {p.title}
                  </h3>
                  <p style={sora} className="mt-1.5 text-[13px] leading-relaxed text-[#94A1B3]">
                    {p.body}
                  </p>
                  <span style={mono} className="mt-4 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.14em] text-[#3DD68C]">
                    <Tick className="h-3 w-3" /> graded onchain
                  </span>
                </div>
              ))}
            </div>

            {/* 4Cs reframed */}
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-[rgba(180,200,225,0.14)] bg-[rgba(180,200,225,0.14)] sm:grid-cols-4">
              {FOUR_CS.map((f) => (
                <div key={f.c} className="bg-[#0F141D] px-4 py-4">
                  <div style={sora} className="text-[15px] font-semibold tracking-tight text-[#EAEEF4]">
                    {f.c}
                  </div>
                  <div style={mono} className="mt-1 text-[12px] uppercase tracking-[0.14em] text-[#626E7E]">
                    = {f.maps}
                  </div>
                  <div style={mono} className="mt-3 text-[13px] text-[#4D82FF]">
                    {f.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- POOLS — two certificates ---------- */}
      <section id="live" className="py-12">
        <Clause no="05" kicker="instruments" title="Pools — issued and pending." />
        <div className="grid gap-5 md:grid-cols-2">
          {/* Simple — ISSUED */}
          <div className="relative overflow-hidden rounded-[4px] border border-[#EAEEF4]/70 bg-[#0F141D] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-[#EAEEF4]/70 px-6 py-4">
              <div>
                <h3 style={sora} className="text-[19px] font-semibold tracking-tight text-[#EAEEF4]">
                  Simple
                </h3>
                <Field className="mt-1 block">certificate · issued</Field>
              </div>
              <span
                style={mono}
                className="inline-flex items-center gap-2 rounded-[3px] bg-[#2BD4E0]/12 px-2.5 py-1 text-[12px] uppercase tracking-[0.18em] text-[#2BD4E0]"
              >
                <span className={`h-1.5 w-1.5 rounded-full bg-[#2BD4E0] ${styles.blink}`} /> live
              </span>
            </div>
            <div className="p-6">
              <p style={sora} className="text-[14px] leading-relaxed text-[#94A1B3]">
                Disciplined 25-tile mining, no lockup. The engine commits only on rounds it likes;
                withdraw any open window.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "deposit SOL, mint CWR",
                  "1% on volume, nothing on idle",
                  "claim SOL plus stORE any open window",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#4D82FF] text-white">
                      <Tick className="h-2.5 w-2.5" />
                    </span>
                    <span style={sora} className="text-[14px] text-[#C2CBD8]">
                      {b}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/2/app"
                style={sora}
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[3px] bg-[#4D82FF] px-5 py-3 text-[14px] font-medium text-[#0A0E15] transition hover:shadow-[0_0_24px_-8px_rgba(77,130,255,0.6)]"
              >
                Enter the pool →
              </Link>
            </div>
          </div>

          {/* Refined — PENDING (frosted) */}
          <div className="relative overflow-hidden rounded-[4px] border border-dashed border-[rgba(180,200,225,0.12)] bg-[#0C111A]">
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_11px,rgba(120,160,210,0.05)_11px,rgba(120,160,210,0.05)_12px)]" />
            <div className="relative flex items-center justify-between border-b border-dashed border-[rgba(180,200,225,0.12)] px-6 py-4">
              <div>
                <h3 style={sora} className="text-[19px] font-semibold tracking-tight text-[#626E7E]">
                  Refined
                </h3>
                <Field className="mt-1 block">certificate · pending</Field>
              </div>
              <span
                style={mono}
                className="rounded-[3px] border border-[rgba(180,200,225,0.12)] bg-[#131926] px-2.5 py-1 text-[12px] uppercase tracking-[0.18em] text-[#626E7E]"
              >
                coming soon
              </span>
            </div>
            <div className="relative p-6">
              <p style={sora} className="text-[14px] leading-relaxed text-[#626E7E]">
                A higher-grade instrument is under review. Proportions are being measured; the
                certificate will issue once verified onchain.
              </p>
              <div className="mt-6 flex h-[148px] items-center justify-center rounded-[3px] border border-dashed border-[rgba(180,200,225,0.12)]">
                <DiamondWireframe className="h-[120px] w-auto opacity-20" animate={false} />
              </div>
              <button
                disabled
                style={sora}
                className="mt-7 inline-flex w-full cursor-not-allowed items-center justify-center rounded-[3px] border border-[rgba(180,200,225,0.12)] px-5 py-3 text-[14px] font-medium text-[#4A5563]"
              >
                Awaiting certification
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- TEAM ---------- */}
      <section className="py-12">
        <Clause no="06" kicker="graders" title="Built by ORE natives." />
        <div className="grid gap-5 md:grid-cols-2">
          {TEAM.map((t) => (
            <div
              key={t.handle}
              className={`flex items-start gap-5 rounded-[4px] border border-[rgba(180,200,225,0.14)] bg-[#0F141D] p-6 transition-colors hover:border-[#4D82FF]/45 ${styles.snapTarget}`}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[3px] border border-[#EAEEF4]/70">
                {/* facet monogram */}
                <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none" stroke="#4D82FF" strokeWidth="1.4">
                  <polygon points="20,5 32,15 27,32 13,32 8,15" />
                  <line x1="8" y1="15" x2="32" y2="15" />
                  <line x1="20" y1="5" x2="20" y2="32" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 style={sora} className="text-[17px] font-semibold tracking-tight text-[#EAEEF4]">
                    {t.handle}
                  </h3>
                  <span style={mono} className="rounded-[2px] bg-[#131926] px-2 py-0.5 text-[12px] uppercase tracking-[0.14em] text-[#4D82FF]">
                    {t.role}
                  </span>
                </div>
                <p style={sora} className="mt-2.5 text-[13.5px] leading-relaxed text-[#94A1B3]">
                  {t.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="mt-12 border-t border-[#EAEEF4]/70 pt-10">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[#EAEEF4]/70">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="#EAEEF4" strokeWidth="1.6">
                  <circle cx="10" cy="10" r="6" />
                  <path d="M14.5 14.5L21 21" />
                </svg>
              </span>
              <span style={sora} className="text-[15px] font-semibold tracking-tight text-[#EAEEF4]">
                CWR
              </span>
            </div>
            <p style={sora} className="mt-4 max-w-xs text-[13px] leading-relaxed text-[#94A1B3]">
              Pooled, non-custodial ORE mining on Solana.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {["X", "Discord"].map((s) => (
                <a
                  key={s}
                  href="#"
                  style={mono}
                  className="rounded-[3px] border border-[rgba(180,200,225,0.14)] px-3 py-1.5 text-[12px] text-[#94A1B3] transition hover:border-[#4D82FF] hover:text-[#4D82FF]"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
          <div>
            <Field className="block">product</Field>
            <ul style={sora} className="mt-4 space-y-2.5 text-[13px] text-[#94A1B3]">
              <li><Link href="/2/app" className="transition hover:text-[#4D82FF]">Dashboard</Link></li>
              <li><a href="#live" className="transition hover:text-[#4D82FF]">Live crank</a></li>
              <li><a href="#" className="transition hover:text-[#4D82FF]">Pools</a></li>
            </ul>
          </div>
          <div>
            <Field className="block">legal</Field>
            <ul style={sora} className="mt-4 space-y-2.5 text-[13px] text-[#94A1B3]">
              <li><a href="#" className="transition hover:text-[#4D82FF]">Terms</a></li>
              <li><a href="#" className="transition hover:text-[#4D82FF]">Privacy</a></li>
              <li><a href="#" className="transition hover:text-[#4D82FF]">Disclosures</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(180,200,225,0.14)] pt-5">
          <span style={mono} className="text-[12px] uppercase tracking-[0.18em] text-[#626E7E]">
            CWR-001 · graded onchain
          </span>
          <span style={mono} className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-[#626E7E]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4D82FF]" /> built on Solana
          </span>
        </div>
      </footer>
    </main>
  );
}
