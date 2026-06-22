"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../pressure.module.css";

const DISPLAY = "'Chakra Petch', sans-serif";
const MONO = "'JetBrains Mono Variable', monospace";
const BODY = "'Sora Variable', sans-serif";

/* ── pool data ────────────────────────────────────────────────── */
const STATS = [
  { label: "TVL", value: "1,284.50", unit: "SOL", hero: true },
  { label: "CWR price", value: "1.0772", unit: "SOL", sub: "value per share" },
  { label: "CWR supply", value: "1,192.37", unit: "" },
  { label: "Fee", value: "1.0", unit: "%", sub: "on deploy volume" },
];

const TILES = [
  0.42, 0.08, 0.91, 0.15, 0.33,
  0.77, 0.05, 0.61, 0.22, 0.49,
  0.13, 0.88, 0.04, 0.55, 0.71,
  0.29, 0.67, 0.18, 0.95, 0.07,
  0.51, 0.36, 0.82, 0.11, 0.44,
];
const MAX_TILE = Math.max(...TILES);

const MINT_CHIPS = ["0.1", "0.5", "1", "5"];

/* ── marks ────────────────────────────────────────────────────── */
function FacetMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M5 9 L12 3 L19 9 L12 21 Z" fill="#9DB7D8" fillOpacity="0.25" />
      <path d="M5 9 L19 9 L12 21 Z" fill="#1C2029" />
      <path d="M5 9 L12 3 L19 9" stroke="#C9D2DE" strokeOpacity="0.7" strokeWidth="1" />
      <path d="M5 9 L12 21 L19 9" stroke="#9DB7D8" strokeOpacity="0.5" strokeWidth="0.8" />
    </svg>
  );
}

export default function PressureDashboard() {
  return (
    <div className="min-h-screen w-full pb-28">
      {/* caustic sweep on load */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 top-32 z-[5] h-32 ${styles.causticSweep}`}
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(157,183,216,0.16) 45%, rgba(244,248,255,0.24) 50%, rgba(157,183,216,0.16) 55%, transparent)",
        }}
      />

      {/* ══ HEADER ══ */}
      <header className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 pb-8 pt-7 sm:px-10">
        <Link href="/1" className="flex items-center gap-3">
          <FacetMark className="h-7 w-7" />
          <span
            className="text-[16px] font-bold tracking-[0.22em] text-[#F4F8FF]"
            style={{ fontFamily: DISPLAY }}
          >
            CWR
          </span>
          <span className="mx-1 h-4 w-px bg-[rgba(201,210,222,0.18)]" />
          <span
            className="text-[18px] font-semibold tracking-[-0.01em] text-[#C9D2DE]"
            style={{ fontFamily: DISPLAY }}
          >
            Simple Pool
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`${styles.chip} flex items-center gap-2 border border-[rgba(157,183,216,0.4)] bg-[rgba(157,183,216,0.08)] px-3.5 py-1.5 text-[11px] tracking-[0.14em] text-[#C9D2DE]`}
            style={{ fontFamily: MONO }}
          >
            <span className={`h-1.5 w-1.5 rounded-full bg-[#F4F8FF] ${styles.gaugePulse}`} />
            deposit / claim open
          </span>
          <div
            className={`${styles.chip} flex items-center gap-2 border border-[rgba(201,210,222,0.2)] bg-[rgba(18,20,26,0.6)] px-3 py-1.5`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#9DB7D8]" />
            <span className="text-[12px] text-[#9AA7B8]" style={{ fontFamily: MONO }}>
              7G4k…dPq2
            </span>
          </div>
        </div>
      </header>

      {/* ══ STAT TILES ══ */}
      <section className="mx-auto max-w-[1280px] px-6 sm:px-10">
        <div className={`grid grid-cols-2 gap-4 lg:grid-cols-4 ${styles.rise}`}>
          {STATS.map((s) => (
            <div
              key={s.label}
              className={`${styles.slab} ${styles.slabHover} border border-[rgba(201,210,222,0.12)] bg-[linear-gradient(165deg,#12141A,#090A0F)] p-5 ${
                s.hero ? "lg:p-6" : ""
              }`}
              style={{ boxShadow: "0 24px 60px -28px rgba(0,0,0,0.85)" }}
            >
              <div
                className={`${styles.deboss} text-[11px] uppercase tracking-[0.18em] text-[#5A6E8C]`}
                style={{ fontFamily: MONO }}
              >
                {s.label}
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span
                  className={`${styles.embossNum} font-bold tabular-nums text-[#F4F8FF] ${
                    s.hero ? "text-[34px] lg:text-[42px]" : "text-[26px]"
                  }`}
                  style={{ fontFamily: MONO }}
                >
                  {s.value}
                </span>
                {s.unit && (
                  <span className="text-[13px] text-[#6A7689]" style={{ fontFamily: MONO }}>
                    {s.unit}
                  </span>
                )}
              </div>
              {s.sub && <div className="mt-1.5 text-[11.5px] text-[#6A7689]">{s.sub}</div>}
              {s.hero && (
                <div
                  className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[#3A4A63]"
                  style={{ fontFamily: MONO }}
                >
                  carat weight
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══ PHASE TIMERS — pressure gauges ══ */}
      <PhaseTimers />

      {/* ══ ACTION ROW: Mint / Claim / Position ══ */}
      <section className="mx-auto mt-6 grid max-w-[1280px] grid-cols-1 gap-5 px-6 sm:px-10 lg:grid-cols-3">
        <MintCard />
        <ClaimCard />
        <PositionCard />
      </section>

      {/* ══ LIVE CRANK PANEL ══ */}
      <CrankPanel />
    </div>
  );
}

/* ════════════════════════════ PHASE TIMERS ════════════════════════════ */
function PhaseTimers() {
  const [secs, setSecs] = useState(3 * 60 + 30); // 03:30
  const TOTAL = 5 * 60;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => {
      setSecs((s) => (s <= 0 ? 3 * 60 + 30 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const pct = Math.max(0, Math.min(100, (secs / TOTAL) * 100));

  return (
    <section className="mx-auto mt-6 max-w-[1280px] px-6 sm:px-10">
      <div
        className={`${styles.slab} border border-[rgba(201,210,222,0.12)] bg-[linear-gradient(160deg,#12141A,#080A0F)] p-6 sm:p-7`}
        style={{ boxShadow: "0 30px 80px -34px rgba(0,0,0,0.85)" }}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            className="text-[14px] font-semibold uppercase tracking-[0.16em] text-[#C9D2DE]"
            style={{ fontFamily: DISPLAY }}
          >
            Pool cycle
          </h2>
          <span
            className={`${styles.chip} flex items-center gap-2 border border-[rgba(157,183,216,0.4)] bg-[rgba(157,183,216,0.08)] px-3 py-1 text-[10.5px] tracking-[0.14em] text-[#C9D2DE]`}
            style={{ fontFamily: MONO }}
          >
            <span className={`h-1.5 w-1.5 rounded-full bg-[#F4F8FF] ${styles.gaugePulse}`} />
            deposit / claim open
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Deposit & Claim — ACTIVE (cold glow) */}
          <div
            className={`${styles.slab} relative overflow-hidden border border-[rgba(157,183,216,0.35)] bg-[linear-gradient(160deg,#0E1726,#0A0F1A)] p-5`}
            style={{ boxShadow: "inset 0 0 50px rgba(157,183,216,0.12)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#F4F8FF]"
                style={{ fontFamily: DISPLAY }}
              >
                Deposit &amp; Claim
              </span>
              <span
                className="text-[10px] tracking-[0.18em] text-[#9DB7D8]"
                style={{ fontFamily: MONO }}
              >
                ● ACTIVE
              </span>
            </div>
            <div
              className={`${styles.embossNum} mt-4 text-[40px] font-bold tabular-nums text-[#F4F8FF]`}
              style={{ fontFamily: MONO }}
            >
              {mm}:{ss}
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(201,210,222,0.08)]">
              <div
                className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg,#9DB7D8,#F4F8FF)",
                  boxShadow: "0 0 12px rgba(157,183,216,0.8)",
                }}
              />
            </div>
            <div className="mt-3 text-[12px] text-[#9AA7B8]">mint CWR or claim rewards</div>
          </div>

          {/* Cranking — IDLE (under pressure) */}
          <div
            className={`${styles.slab} relative overflow-hidden border border-[rgba(201,210,222,0.1)] bg-[linear-gradient(160deg,#0E1015,#080910)] p-5`}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9AA7B8]"
                style={{ fontFamily: DISPLAY }}
              >
                Cranking
              </span>
              <span
                className="text-[10px] tracking-[0.18em] text-[#5A6E8C]"
                style={{ fontFamily: MONO }}
              >
                ○ IDLE
              </span>
            </div>
            <div
              className="mt-4 text-[40px] font-bold tabular-nums text-[#3A4A63]"
              style={{ fontFamily: MONO }}
            >
              --:--
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(201,210,222,0.06)]">
              <div className="h-full w-0 rounded-full bg-[#3A4A63]" />
            </div>
            <div className="mt-3 text-[12px] text-[#6A7689]">
              capital working the 25 tiles — runs after the window closes
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════ MINT CARD ════════════════════════════ */
function MintCard() {
  const [amount, setAmount] = useState("");
  const receive = amount ? (parseFloat(amount) / 1.0772 || 0).toFixed(4) : "0.9284";

  return (
    <div
      className={`${styles.slab} flex flex-col border border-[rgba(201,210,222,0.14)] bg-[linear-gradient(165deg,#13151C,#090A0F)] p-6`}
      style={{ boxShadow: "0 30px 80px -34px rgba(0,0,0,0.85)" }}
    >
      <Chip>deposit SOL</Chip>
      <h3
        className="mt-4 text-[20px] font-bold tracking-[-0.01em] text-[#F4F8FF]"
        style={{ fontFamily: DISPLAY }}
      >
        Mint CWR
      </h3>

      <label className="mt-5 block">
        <span className="text-[11px] uppercase tracking-[0.16em] text-[#5A6E8C]" style={{ fontFamily: MONO }}>
          Amount
        </span>
        <div
          className={`${styles.well} mt-2 flex items-center gap-2 border border-[rgba(201,210,222,0.1)] bg-[#070810] px-4 py-3.5`}
        >
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            className="w-full bg-transparent text-[22px] font-semibold tabular-nums text-[#F4F8FF] outline-none placeholder:text-[#3A4A63]"
            style={{ fontFamily: MONO }}
          />
          <span className="text-[13px] text-[#6A7689]" style={{ fontFamily: MONO }}>
            SOL
          </span>
        </div>
      </label>

      <div className="mt-3 flex gap-2">
        {MINT_CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => setAmount(c)}
            className={`${styles.chip} flex-1 border border-[rgba(201,210,222,0.12)] bg-[rgba(18,20,26,0.6)] py-2 text-[12px] tabular-nums text-[#9AA7B8] transition-colors hover:border-[rgba(157,183,216,0.4)] hover:text-[#F4F8FF]`}
            style={{ fontFamily: MONO }}
          >
            {c}
          </button>
        ))}
      </div>

      <ReceiveLine label="you receive" value={`≈ ${receive}`} unit="CWR" />

      <button
        className={`${styles.facet} mt-5 w-full border border-[rgba(201,210,222,0.3)] bg-[linear-gradient(180deg,#1C2029,#0B0D13)] px-6 py-3.5 text-[14px] font-semibold tracking-[0.06em] text-[#F4F8FF]`}
        style={{ fontFamily: DISPLAY, boxShadow: "inset 0 1px 0 rgba(244,248,255,0.18)" }}
      >
        Mint CWR
      </button>
    </div>
  );
}

/* ════════════════════════════ CLAIM CARD ════════════════════════════ */
function ClaimCard() {
  const HELD = 84.21;
  const [pct, setPct] = useState(100);
  const sol = ((HELD * pct) / 100 * 1.0772).toFixed(4);

  return (
    <div
      className={`${styles.slab} flex flex-col border border-[rgba(201,210,222,0.14)] bg-[linear-gradient(165deg,#13151C,#090A0F)] p-6`}
      style={{ boxShadow: "0 30px 80px -34px rgba(0,0,0,0.85)" }}
    >
      <Chip>burn CWR</Chip>
      <h3
        className="mt-4 text-[20px] font-bold tracking-[-0.01em] text-[#F4F8FF]"
        style={{ fontFamily: DISPLAY }}
      >
        Claim rewards
      </h3>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.16em] text-[#5A6E8C]" style={{ fontFamily: MONO }}>
          your CWR
        </span>
        <span className="text-[16px] font-semibold tabular-nums text-[#C9D2DE]" style={{ fontFamily: MONO }}>
          84.2100
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        {[
          { l: "25%", v: 25 },
          { l: "50%", v: 50 },
          { l: "Max", v: 100 },
        ].map((o) => (
          <button
            key={o.l}
            onClick={() => setPct(o.v)}
            className={`${styles.chip} flex-1 border py-2 text-[12px] transition-colors ${
              pct === o.v
                ? "border-[rgba(157,183,216,0.5)] bg-[rgba(157,183,216,0.1)] text-[#F4F8FF]"
                : "border-[rgba(201,210,222,0.12)] bg-[rgba(18,20,26,0.6)] text-[#9AA7B8] hover:text-[#F4F8FF]"
            }`}
            style={{ fontFamily: MONO }}
          >
            {o.l}
          </button>
        ))}
      </div>

      <ReceiveLine label="you receive" value={`≈ ${sol}`} unit="SOL + stORE" />

      <button
        className={`${styles.facet} mt-5 w-full border border-[rgba(201,210,222,0.3)] bg-[linear-gradient(180deg,#1C2029,#0B0D13)] px-6 py-3.5 text-[14px] font-semibold tracking-[0.06em] text-[#F4F8FF]`}
        style={{ fontFamily: DISPLAY, boxShadow: "inset 0 1px 0 rgba(244,248,255,0.18)" }}
      >
        Claim
      </button>
    </div>
  );
}

/* ════════════════════════════ POSITION CARD ════════════════════════════ */
function PositionCard() {
  const rows = [
    { l: "CWR held", v: "84.2100", u: "" },
    { l: "Value", v: "90.72", u: "SOL" },
    { l: "Pool share", v: "7.06", u: "%" },
  ];
  return (
    <div
      className={`${styles.slab} flex flex-col border border-[rgba(201,210,222,0.14)] bg-[linear-gradient(165deg,#0E1726,#080A12)] p-6`}
      style={{ boxShadow: "0 30px 80px -34px rgba(0,0,0,0.85), inset 0 0 50px rgba(157,183,216,0.06)" }}
    >
      <Chip tone="cold">your position</Chip>
      <h3
        className="mt-4 text-[20px] font-bold tracking-[-0.01em] text-[#F4F8FF]"
        style={{ fontFamily: DISPLAY }}
      >
        The stone you hold
      </h3>

      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <div
            key={r.l}
            className="flex items-baseline justify-between border-b border-[rgba(201,210,222,0.08)] pb-4"
          >
            <span className="text-[12.5px] text-[#9AA7B8]">{r.l}</span>
            <span className="flex items-baseline gap-1">
              <span
                className={`${styles.embossNum} text-[22px] font-bold tabular-nums text-[#F4F8FF]`}
                style={{ fontFamily: MONO }}
              >
                {r.v}
              </span>
              {r.u && (
                <span className="text-[12px] text-[#6A7689]" style={{ fontFamily: MONO }}>
                  {r.u}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6">
        {/* pool-share facet meter */}
        <div className="text-[11px] uppercase tracking-[0.16em] text-[#5A6E8C]" style={{ fontFamily: MONO }}>
          share of pool
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgba(201,210,222,0.08)]">
          <div
            className="h-full rounded-full"
            style={{
              width: "7.06%",
              background: "linear-gradient(90deg,#9DB7D8,#F4F8FF)",
              boxShadow: "0 0 12px rgba(157,183,216,0.7)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════ LIVE CRANK PANEL ════════════════════════════ */
function CrankPanel() {
  const metrics = [
    { l: "ORE round", v: "#48213", u: "" },
    { l: "Motherlode", v: "218.6", u: "ORE" },
    { l: "Board deployed", v: "11.80", u: "SOL" },
    { l: "Miners", v: "1,347", u: "" },
  ];

  return (
    <section className="mx-auto mt-6 max-w-[1280px] px-6 sm:px-10">
      <div
        className={`${styles.slab} border border-[rgba(201,210,222,0.12)] bg-[linear-gradient(160deg,#101218,#070810)] p-6 sm:p-8`}
        style={{ boxShadow: "0 36px 100px -38px rgba(0,0,0,0.9)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              className="text-[16px] font-bold tracking-[-0.01em] text-[#F4F8FF]"
              style={{ fontFamily: DISPLAY }}
            >
              Live crank
            </h2>
            <p className="mt-1.5 text-[13px] text-[#9AA7B8]">
              what the keeper is doing on the board, right now
            </p>
          </div>
          <span
            className={`${styles.chip} flex items-center gap-2 border border-[rgba(157,183,216,0.4)] bg-[rgba(157,183,216,0.08)] px-3 py-1.5 text-[11px] tracking-[0.16em] text-[#C9D2DE]`}
            style={{ fontFamily: MONO }}
          >
            <span className={`h-1.5 w-1.5 rounded-full bg-[#F4F8FF] ${styles.gaugePulse}`} />
            live
          </span>
        </div>

        {/* metrics */}
        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden border border-[rgba(201,210,222,0.08)] bg-[rgba(201,210,222,0.08)] md:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.l} className="bg-[#0B0D13] p-4">
              <div
                className="text-[10.5px] uppercase tracking-[0.16em] text-[#5A6E8C]"
                style={{ fontFamily: MONO }}
              >
                {m.l}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className={`${styles.embossNum} text-[22px] font-bold tabular-nums text-[#F4F8FF]`}
                  style={{ fontFamily: MONO }}
                >
                  {m.v}
                </span>
                {m.u && (
                  <span className="text-[11px] text-[#6A7689]" style={{ fontFamily: MONO }}>
                    {m.u}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-[1fr_0.85fr]">
          {/* board */}
          <div>
            <div
              className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[#5A6E8C]"
              style={{ fontFamily: MONO }}
            >
              25-tile board · intensity ∝ SOL
            </div>
            <div className="grid grid-cols-5 gap-2.5">
              {TILES.map((v, i) => {
                const t = v / MAX_TILE; // 0..1
                const hottest = v === MAX_TILE;
                return (
                  <div key={i} className="relative aspect-square">
                    <div
                      className={`${styles.lattice} flex h-full w-full items-center justify-center ${
                        hottest ? styles.tileFlare : ""
                      }`}
                      style={{
                        background:
                          t > 0.15
                            ? `radial-gradient(circle at 50% 40%, rgba(244,248,255,${0.25 + t * 0.7}), rgba(28,32,41,${0.9 - t * 0.4}))`
                            : "linear-gradient(135deg,#161A22,#0B0D13)",
                        boxShadow: hottest
                          ? "0 0 24px rgba(244,248,255,0.85), inset 0 0 12px rgba(244,248,255,0.5)"
                          : t > 0.5
                          ? `0 0 ${10 * t}px rgba(157,183,216,${t * 0.6})`
                          : "none",
                        border: `1px solid rgba(201,210,222,${0.1 + t * 0.3})`,
                      }}
                    >
                      <span
                        className="text-[9.5px] tabular-nums"
                        style={{
                          fontFamily: MONO,
                          color: t > 0.45 ? "#05060A" : "#6A7689",
                          fontWeight: t > 0.45 ? 700 : 400,
                        }}
                      >
                        {v.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* keeper's last move — etched ticker */}
          <div className="flex flex-col">
            <div
              className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[#5A6E8C]"
              style={{ fontFamily: MONO }}
            >
              Keeper&apos;s last move
            </div>
            <div
              className={`${styles.slab} flex-1 border border-[rgba(201,210,222,0.1)] bg-[#070810] p-5`}
              style={{ boxShadow: "inset 0 2px 10px rgba(0,0,0,0.7)" }}
            >
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full bg-[#9DB7D8] ${styles.gaugePulse}`} />
                <span className="text-[11px] tracking-[0.14em] text-[#9DB7D8]" style={{ fontFamily: MONO }}>
                  8s ago
                </span>
              </div>
              <p
                className="mt-4 text-[15px] leading-relaxed text-[#C9D2DE]"
                style={{ fontFamily: MONO }}
              >
                deployed{" "}
                <span className="font-bold text-[#F4F8FF]">0.0472 SOL</span> × 25
                tiles
              </p>
              <div className="mt-5 flex items-center gap-3 border-t border-[rgba(201,210,222,0.08)] pt-4">
                <span className="text-[12px] text-[#6A7689]">edge</span>
                <span
                  className={`${styles.embossNum} text-[20px] font-bold tabular-nums text-[#F4F8FF]`}
                  style={{ fontFamily: MONO }}
                >
                  $3.27
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── shared bits ──────────────────────────────────────────────── */
function Chip({ children, tone }: { children: React.ReactNode; tone?: "cold" }) {
  return (
    <span
      className={`${styles.chip} inline-flex w-fit items-center gap-1.5 border px-3 py-1 text-[10.5px] uppercase tracking-[0.16em] ${
        tone === "cold"
          ? "border-[rgba(157,183,216,0.4)] bg-[rgba(157,183,216,0.08)] text-[#C9D2DE]"
          : "border-[rgba(201,210,222,0.14)] bg-[rgba(18,20,26,0.6)] text-[#9AA7B8]"
      }`}
      style={{ fontFamily: MONO }}
    >
      {children}
    </span>
  );
}

function ReceiveLine({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div
      className={`${styles.well} mt-5 flex items-center justify-between border border-[rgba(201,210,222,0.08)] bg-[#070810] px-4 py-3`}
    >
      <span className="text-[12px] text-[#6A7689]">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={`${styles.embossNum} text-[16px] font-bold tabular-nums text-[#F4F8FF]`}
          style={{ fontFamily: "'JetBrains Mono Variable', monospace" }}
        >
          {value}
        </span>
        <span className="text-[12px] text-[#9DB7D8]" style={{ fontFamily: "'JetBrains Mono Variable', monospace" }}>
          {unit}
        </span>
      </span>
    </div>
  );
}
