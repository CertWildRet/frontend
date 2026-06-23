"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../dispersion.module.css";
import {
  SpectralDefs,
  PrismIcon,
  ArrowIcon,
  VaultIcon,
  Tilt,
} from "../parts";

const display = { fontFamily: "'Chakra Petch', sans-serif" } as const;
const mono = { fontFamily: "'JetBrains Mono Variable', monospace" } as const;

/* ── inline mock data ────────────────────────────────────────────── */
const STATS = [
  { k: "TVL", v: "1,284.50", u: "SOL", hero: true },
  { k: "CWR price", v: "1.0772", u: "SOL", sub: "value per share" },
  { k: "CWR supply", v: "1,192.37", u: "" },
  { k: "Fee", v: "1.0", u: "%", sub: "on deploy volume" },
];

const BOARD = [
  0.42, 0.08, 0.91, 0.15, 0.33, 0.77, 0.05, 0.61, 0.22, 0.49, 0.13, 0.88, 0.04,
  0.55, 0.71, 0.29, 0.67, 0.18, 0.95, 0.07, 0.51, 0.36, 0.82, 0.11, 0.44,
];
const HOT_IDX = BOARD.indexOf(Math.max(...BOARD));

/** map 0..1 cool→hot across the spectral ramp */
function tileColor(t: number) {
  // cyan -> blue -> violet -> magenta -> amber
  const stops = [
    [34, 224, 230], // #22E0E6
    [91, 108, 255], // #5B6CFF
    [154, 107, 255], // #9A6BFF
    [255, 90, 200], // #FF5AC8
    [255, 192, 97], // #FFC061
  ];
  const x = t * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  const c = a.map((v, j) => Math.round(v + (b[j] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const CRANK = [
  { k: "ORE round", v: "#48213" },
  { k: "Motherlode", v: "218.6", u: "ORE" },
  { k: "Board deployed", v: "11.80", u: "SOL" },
  { k: "Miners", v: "1,347" },
];

export default function DispersionDashboard() {
  const [solAmt, setSolAmt] = useState("1");
  const [claimPct, setClaimPct] = useState(50);

  const cwrHeld = 84.21;
  const claimSol = ((cwrHeld * (claimPct / 100)) * 1.0772).toFixed(4);

  return (
    <main className="relative mx-auto w-full max-w-[1240px] px-5 pb-28 pt-6 sm:px-8">
      <SpectralDefs />

      {/* ══ TOP BAR ════════════════════════════════════════════════ */}
      <header
        className={`${styles.glass} relative flex items-center justify-between rounded-2xl px-5 py-3.5`}
      >
        {/* iridescent underline */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-5 bottom-0 h-px"
          style={{
            background:
              "linear-gradient(90deg,transparent,#22E0E6,#5B6CFF,#9A6BFF,#FF5AC8,transparent)",
            opacity: 0.55,
          }}
        />
        <Link href="/3" className="flex items-center gap-3">
          <span className={`${styles.glass} ${styles.cutTR} grid h-9 w-9 place-items-center rounded-lg`}>
            <PrismIcon className="h-4.5 w-4.5" />
          </span>
          <span className="text-[17px] font-semibold tracking-[0.14em]" style={display}>
            CWR
          </span>
        </Link>

        <div className="flex items-center gap-2.5">
          <span
            className="hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] tracking-[0.16em] sm:inline-flex"
            style={{
              ...mono,
              background: "rgba(34,224,230,0.1)",
              boxShadow: "inset 0 0 0 1px rgba(34,224,230,0.35)",
              color: "#8FF0F4",
            }}
          >
            <span className={`${styles.liveDot} h-1.5 w-1.5 rounded-full bg-[#22E0E6]`} />
            deposit / claim open
          </span>
          {/* wallet pill — glass chip with spectral rim */}
          <span
            className={`${styles.glass} ${styles.spectralEdge} inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px]`}
            style={mono}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: "linear-gradient(135deg,#9A6BFF,#FF5AC8)",
                boxShadow: "0 0 6px rgba(154,107,255,0.9)",
              }}
            />
            7xZq…4k2P
          </span>
        </div>
      </header>

      {/* ══ TITLE ROW ══════════════════════════════════════════════ */}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.01em] text-[#EAECF6]" style={display}>
            Simple Pool
          </h1>
          <p className="mt-1.5 text-[14px] text-[#9AA3C8]">
            Disciplined 25-tile ORE mining · no lockup
          </p>
        </div>
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] tracking-[0.18em]"
          style={{
            ...mono,
            background: "rgba(34,224,230,0.1)",
            boxShadow: "inset 0 0 0 1px rgba(34,224,230,0.35)",
            color: "#8FF0F4",
          }}
        >
          <span className={`${styles.liveDot} h-1.5 w-1.5 rounded-full bg-[#22E0E6]`} />
          deposit / claim open
        </span>
      </div>

      {/* ══ STAT TILES ═════════════════════════════════════════════ */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.k}
            className={`${styles.glass} ${s.hero ? styles.spectralEdge : ""} ${styles.cutTR} relative overflow-hidden rounded-2xl p-5`}
          >
            {s.hero && (
              <div
                aria-hidden
                className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle,rgba(91,108,255,0.28),transparent 70%)",
                }}
              />
            )}
            <span
              className="relative text-[12px] uppercase tracking-[0.22em] text-[#6E7AA0]"
              style={mono}
            >
              {s.k}
            </span>
            <div className="relative mt-3 flex items-baseline gap-1.5">
              <span
                className={`${s.hero ? styles.spectralText : "text-[#EAECF6]"} text-[28px] font-semibold leading-none`}
                style={mono}
              >
                {s.v}
              </span>
              {s.u && (
                <span className="text-[13px] text-[#7E86A8]" style={mono}>
                  {s.u}
                </span>
              )}
            </div>
            {s.sub && (
              <span className="relative mt-2 block text-[11.5px] text-[#7E86A8]">
                {s.sub}
              </span>
            )}
            {s.hero && (
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-[2px] w-full"
                style={{
                  background:
                    "linear-gradient(90deg,#22E0E6,#5B6CFF,#9A6BFF,#FF5AC8)",
                  opacity: 0.7,
                }}
              />
            )}
          </div>
        ))}
      </section>

      {/* ══ PHASE TIMERS ═══════════════════════════════════════════ */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Deposit & Claim — ACTIVE (disperses into spectrum) */}
        <div className={`${styles.glass} ${styles.spectralEdge} ${styles.cutBL} rounded-2xl p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`${styles.liveDot} h-2 w-2 rounded-full bg-[#22E0E6]`} />
              <span className="text-[15px] font-semibold text-[#EAECF6]" style={display}>
                Deposit &amp; Claim
              </span>
            </div>
            <span
              className="rounded-full px-2.5 py-0.5 text-[12px] tracking-[0.2em]"
              style={{
                ...mono,
                background: "rgba(34,224,230,0.12)",
                color: "#8FF0F4",
                boxShadow: "inset 0 0 0 1px rgba(34,224,230,0.4)",
              }}
            >
              ACTIVE
            </span>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <span className={`${styles.spectralText} text-[40px] font-bold leading-none`} style={mono}>
              03:30
            </span>
            <span className="text-[12px] text-[#9AA3C8]">mint CWR or claim rewards</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[rgba(154,167,216,0.12)]">
            <div className={`${styles.spectralBar} h-full rounded-full`} style={{ width: "62%" }} />
          </div>
        </div>

        {/* Cranking — IDLE (compressed white) */}
        <div className={`${styles.glass} ${styles.cutTR} rounded-2xl p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[rgba(234,236,246,0.55)]" />
              <span className="text-[15px] font-semibold text-[#C6CCEC]" style={display}>
                Cranking
              </span>
            </div>
            <span
              className="rounded-full px-2.5 py-0.5 text-[12px] tracking-[0.2em] text-[#8A92B4]"
              style={{
                ...mono,
                background: "rgba(154,167,216,0.08)",
                boxShadow: "inset 0 0 0 1px rgba(154,167,216,0.2)",
              }}
            >
              IDLE
            </span>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <span className="text-[40px] font-bold leading-none text-[#8A92B4]" style={mono}>
              —:—
            </span>
            <span className="max-w-[170px] text-right text-[12px] text-[#7E86A8]">
              capital working the 25 tiles — runs after the window closes
            </span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[rgba(154,167,216,0.1)]">
            <div className={`${styles.whiteBar} h-full rounded-full`} style={{ width: "18%" }} />
          </div>
        </div>
      </section>

      {/* ══ ACTION GRID: mint / claim / position ═══════════════════ */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* MINT */}
        <Tilt>
          <div className={`${styles.glass} ${styles.spectralEdge} ${styles.cutTR} h-full rounded-2xl p-6`}>
            <Chip color="#22E0E6">deposit SOL</Chip>
            <h3 className="mt-4 text-[18px] font-semibold text-[#EAECF6]" style={display}>
              Mint CWR
            </h3>

            <div
              className={`${styles.focusBloom} mt-5 flex items-center gap-2 rounded-xl px-4 py-3.5`}
              style={{
                background: "rgba(7,9,18,0.5)",
                boxShadow: "inset 0 0 0 1px rgba(154,167,216,0.16)",
              }}
            >
              <input
                value={solAmt}
                onChange={(e) =>
                  setSolAmt(e.target.value.replace(/[^0-9.]/g, ""))
                }
                inputMode="decimal"
                className="w-full bg-transparent text-[22px] text-[#EAECF6] outline-none placeholder:text-[#5A6390]"
                style={mono}
                placeholder="0.0"
                aria-label="SOL amount"
              />
              <span className="text-[14px] text-[#7E86A8]" style={mono}>
                SOL
              </span>
            </div>

            <div className="mt-3 flex gap-2">
              {["0.1", "0.5", "1", "5"].map((q) => (
                <button
                  key={q}
                  onClick={() => setSolAmt(q)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] transition-colors ${
                    solAmt === q ? "text-[#070912]" : "text-[#9AA3C8] hover:text-[#EAECF6]"
                  }`}
                  style={{
                    ...mono,
                    background:
                      solAmt === q
                        ? "linear-gradient(135deg,#22E0E6,#9A6BFF)"
                        : "rgba(154,167,216,0.08)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "rgba(91,108,255,0.07)" }}>
              <span className="text-[12.5px] text-[#9AA3C8]">you receive ≈</span>
              <span className={`${styles.dataLit} text-[15px] font-semibold text-[#EAECF6]`} style={mono}>
                0.9284 CWR
              </span>
            </div>

            <button
              className={`${styles.ignite} mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-medium text-[#EAECF6]`}
            >
              Mint CWR <ArrowIcon className="h-4 w-4" />
            </button>
          </div>
        </Tilt>

        {/* CLAIM */}
        <Tilt>
          <div className={`${styles.glass} ${styles.cutBL} h-full rounded-2xl p-6`}>
            <Chip color="#FF5AC8">burn CWR</Chip>
            <h3 className="mt-4 text-[18px] font-semibold text-[#EAECF6]" style={display}>
              Claim rewards
            </h3>

            <div className="mt-5 flex items-center justify-between rounded-xl px-4 py-3.5" style={{ background: "rgba(7,9,18,0.5)", boxShadow: "inset 0 0 0 1px rgba(154,167,216,0.16)" }}>
              <span className="text-[12.5px] text-[#9AA3C8]">your CWR</span>
              <span className="text-[18px] font-semibold text-[#EAECF6]" style={mono}>
                84.2100
              </span>
            </div>

            <div className="mt-3 flex gap-2">
              {[
                { l: "25%", v: 25 },
                { l: "50%", v: 50 },
                { l: "Max", v: 100 },
              ].map((p) => (
                <button
                  key={p.l}
                  onClick={() => setClaimPct(p.v)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] transition-colors ${
                    claimPct === p.v ? "text-[#070912]" : "text-[#9AA3C8] hover:text-[#EAECF6]"
                  }`}
                  style={{
                    ...mono,
                    background:
                      claimPct === p.v
                        ? "linear-gradient(135deg,#FF5AC8,#FFC061)"
                        : "rgba(154,167,216,0.08)",
                  }}
                >
                  {p.l}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-xl px-4 py-3" style={{ background: "rgba(255,90,200,0.07)" }}>
              <span className="text-[12.5px] text-[#9AA3C8]">you receive ≈</span>
              <div className={`${styles.dataLit} mt-1 text-[15px] font-semibold text-[#EAECF6]`} style={mono}>
                {claimSol} SOL <span className="text-[#C99BFF]">+ stORE</span>
              </div>
            </div>

            <button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-medium text-[#EAECF6] transition-transform hover:-translate-y-px active:translate-y-0"
              style={{
                background: "linear-gradient(110deg,rgba(255,90,200,0.18),rgba(255,192,97,0.14))",
                boxShadow: "inset 0 0 0 1px rgba(255,90,200,0.4)",
              }}
            >
              Claim <ArrowIcon className="h-4 w-4" />
            </button>
          </div>
        </Tilt>

        {/* POSITION */}
        <Tilt>
          <div className={`${styles.glass} ${styles.cutTR} flex h-full flex-col rounded-2xl p-6`}>
            <div className="flex items-center gap-2.5">
              <span className={`${styles.glass} grid h-9 w-9 place-items-center rounded-lg`}>
                <VaultIcon className="h-5 w-5" />
              </span>
              <h3 className="text-[18px] font-semibold text-[#EAECF6]" style={display}>
                Your position
              </h3>
            </div>

            <div className="mt-6 space-y-4">
              {[
                { k: "CWR held", v: "84.2100", u: "" },
                { k: "Value", v: "90.72", u: "SOL" },
                { k: "Pool share", v: "7.06", u: "%", spectral: true },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-center justify-between border-b border-[rgba(154,167,216,0.1)] pb-3 last:border-0"
                >
                  <span className="text-[13px] text-[#9AA3C8]">{row.k}</span>
                  <span className="flex items-baseline gap-1">
                    <span
                      className={`${row.spectral ? styles.spectralText : "text-[#EAECF6]"} text-[18px] font-semibold`}
                      style={mono}
                    >
                      {row.v}
                    </span>
                    {row.u && (
                      <span className="text-[12px] text-[#7E86A8]" style={mono}>
                        {row.u}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* pool share visual */}
            <div className="mt-auto pt-6">
              <div className="h-2 overflow-hidden rounded-full bg-[rgba(154,167,216,0.12)]">
                <div className={`${styles.spectralBar} h-full rounded-full`} style={{ width: "7.06%" }} />
              </div>
              <span className="mt-2 block text-[12px] text-[#7E86A8]" style={mono}>
                your slice of the pool
              </span>
            </div>
          </div>
        </Tilt>
      </section>

      {/* ══ LIVE CRANK PANEL ═══════════════════════════════════════ */}
      <section className="mt-4">
        <div className={`${styles.glass} ${styles.spectralEdge} ${styles.cutBL} rounded-2xl p-6 sm:p-7`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className={`${styles.liveDot} h-2 w-2 rounded-full bg-[#22E0E6]`} />
                <h3 className="text-[18px] font-semibold text-[#EAECF6]" style={display}>
                  Live crank
                </h3>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[12px] tracking-[0.22em]"
                  style={{
                    ...mono,
                    background: "rgba(34,224,230,0.12)",
                    color: "#8FF0F4",
                    boxShadow: "inset 0 0 0 1px rgba(34,224,230,0.4)",
                  }}
                >
                  LIVE
                </span>
              </div>
              <p className="mt-1.5 text-[13px] text-[#9AA3C8]">
                what the keeper is doing on the board, right now
              </p>
            </div>
            {/* metrics */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {CRANK.map((c) => (
                <div key={c.k}>
                  <span className="block text-[12px] uppercase tracking-[0.2em] text-[#6E7AA0]" style={mono}>
                    {c.k}
                  </span>
                  <span className="text-[15px] font-semibold text-[#EAECF6]" style={mono}>
                    {c.v}
                    {c.u && <span className="ml-1 text-[12px] text-[#7E86A8]">{c.u}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr]">
            {/* 25-tile crystal board */}
            <div>
              <div className="grid w-[284px] max-w-full grid-cols-5 gap-2">
                {BOARD.map((t, i) => {
                  const col = tileColor(t);
                  const isHot = i === HOT_IDX;
                  return (
                    <div
                      key={i}
                      className={`${styles.tile} relative grid aspect-square place-items-center overflow-visible rounded-lg`}
                      style={{
                        background: `linear-gradient(150deg, ${col}38, rgba(7,9,18,0.55))`,
                        boxShadow: `inset 0 0 0 1px ${col}66, 0 0 ${(6 + t * 22).toFixed(0)}px -6px ${col}`,
                      }}
                      title={`${t.toFixed(2)} SOL`}
                    >
                      {isHot && (
                        <>
                          <span className={styles.flare} />
                          <span className={styles.flareCross} />
                        </>
                      )}
                      <span
                        className="relative text-[10.5px] font-medium"
                        style={{ ...mono, color: t > 0.5 ? "#EAECF6" : "#C6CCEC" }}
                      >
                        {t.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* spectrum legend */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[12px] text-[#7E86A8]" style={mono}>cool</span>
                <span
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg,#22E0E6,#5B6CFF,#9A6BFF,#FF5AC8,#FFC061)",
                  }}
                />
                <span className="text-[12px] text-[#7E86A8]" style={mono}>hot</span>
              </div>
            </div>

            {/* keeper's last move */}
            <div className="flex flex-col justify-between gap-4">
              <div
                className={`${styles.glass} ${styles.cutTR} rounded-xl p-5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] uppercase tracking-[0.2em] text-[#6E7AA0]" style={mono}>
                    Keeper&apos;s last move
                  </span>
                  <span className="text-[12px] text-[#7E86A8]" style={mono}>
                    8s ago
                  </span>
                </div>
                <p className={`${styles.chromaTrail} mt-3 inline-block text-[15px] text-[#EAECF6]`} style={mono}>
                  deployed 0.0472 SOL × 25 tiles
                </p>
                <p className="mt-3 flex items-center gap-2 text-[13px] text-[#9AA3C8]">
                  edge
                  <span
                    className={`${styles.spectralText} text-[16px] font-semibold`}
                    style={mono}
                  >
                    $3.27
                  </span>
                </p>
              </div>

              {/* round detail strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {[
                  { k: "Hottest tile", v: "0.95", u: "SOL" },
                  { k: "Tiles lit", v: "25", u: "/25" },
                  { k: "Avg / tile", v: "0.47", u: "SOL" },
                  { k: "Window", v: "open", u: "" },
                ].map((d) => (
                  <div
                    key={d.k}
                    className="rounded-lg px-3 py-2.5"
                    style={{ background: "rgba(154,167,216,0.06)", boxShadow: "inset 0 0 0 1px rgba(154,167,216,0.1)" }}
                  >
                    <span className="block text-[12px] uppercase tracking-[0.16em] text-[#6E7AA0]" style={mono}>
                      {d.k}
                    </span>
                    <span className="text-[14px] font-semibold text-[#EAECF6]" style={mono}>
                      {d.v}
                      {d.u && <span className="ml-0.5 text-[12px] text-[#7E86A8]">{d.u}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* footer note */}
      <p className="mt-10 text-center text-[12px] tracking-[0.2em] text-[#6E769A]" style={mono}>
        static mockup · non-custodial ORE mining on Solana
      </p>
    </main>
  );
}

/* ── local components ────────────────────────────────────────────── */
function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] tracking-[0.16em]"
      style={{
        fontFamily: "'JetBrains Mono Variable', monospace",
        background: `${color}1A`,
        color,
        boxShadow: `inset 0 0 0 1px ${color}55`,
      }}
    >
      <span className="h-1.5 w-1.5 rotate-45" style={{ background: color }} />
      {children}
    </span>
  );
}
