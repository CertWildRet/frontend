"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../loupe.module.css";

/* ===================== type helpers ===================== */
const mono = {
  fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
} as const;
const sora = {
  fontFamily: "'Sora Variable', system-ui, sans-serif",
} as const;

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      style={mono}
      className={`text-[12px] uppercase tracking-[0.18em] text-[#626E7E] ${className}`}
    >
      {children}
    </span>
  );
}

function Tick({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path d="M3 8.5l3.2 3.2L13 4.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/* ===================== board data ===================== */
const TILES = [
  0.42, 0.08, 0.91, 0.15, 0.33, 0.77, 0.05, 0.61, 0.22, 0.49, 0.13, 0.88, 0.04, 0.55, 0.71, 0.29,
  0.67, 0.18, 0.95, 0.07, 0.51, 0.36, 0.82, 0.11, 0.44,
];

/* ===================== page ===================== */
export default function LoupeDashboard() {
  const [amount, setAmount] = useState("0.50");
  const [pct, setPct] = useState<25 | 50 | 100>(50);

  const cwrPrice = 1.0772;
  const received = amount ? (parseFloat(amount) / cwrPrice || 0) : 0;
  const yourCwr = 84.21;
  const claimCwr = pct === 100 ? yourCwr : (yourCwr * pct) / 100;
  const claimSol = claimCwr * cwrPrice;

  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-28 pt-6 sm:px-8">
      {/* ---------- top bar ---------- */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAEEF4]/70 pb-4">
        <div className="flex items-center gap-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#EAEEF4]/70">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#EAEEF4" strokeWidth="1.6">
              <circle cx="10" cy="10" r="6" />
              <path d="M14.5 14.5L21 21" />
            </svg>
          </span>
          <div>
            <h1 style={sora} className="text-[16px] font-semibold tracking-tight leading-none text-[#EAEEF4]">
              Simple Pool
            </h1>
            <span style={mono} className="mt-1 block text-[12px] uppercase tracking-[0.2em] text-[#626E7E]">
              CWR-001 · live readout
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            style={mono}
            className="inline-flex items-center gap-2 rounded-[3px] border border-[#4D82FF]/40 bg-[#4D82FF]/10 px-3 py-1.5 text-[12px] uppercase tracking-[0.16em] text-[#4D82FF] shadow-[0_0_18px_-8px_rgba(77,130,255,0.6)]"
          >
            <span className={`h-1.5 w-1.5 rounded-full bg-[#4D82FF] ${styles.blink}`} />
            deposit / claim open
          </span>
          {/* wallet = certificate ID chip */}
          <span
            style={mono}
            className="inline-flex items-center gap-2 rounded-[3px] border border-[#EAEEF4]/70 bg-[#131926] px-3 py-1.5 text-[12px] text-[#EAEEF4]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#2BD4E0]" />
            ID · 7xKf…q39A
          </span>
        </div>
      </header>

      {/* snapping underline tabs */}
      <nav className="mt-5 flex items-center gap-1 border-b border-[rgba(180,200,225,0.14)]" style={sora}>
        {[
          { label: "Pool", active: true },
          { label: "Live crank", active: false },
          { label: "History", active: false },
        ].map((t) => (
          <span
            key={t.label}
            className={`relative px-3 py-2.5 text-[13px] ${
              t.active ? "text-[#EAEEF4]" : "text-[#626E7E]"
            }`}
          >
            {t.label}
            {t.active && (
              <span className={`absolute -bottom-px left-0 right-0 h-[2px] bg-[#4D82FF] ${styles.sweep}`} />
            )}
          </span>
        ))}
      </nav>

      {/* ---------- pool stat spec row ---------- */}
      <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-[rgba(180,200,225,0.14)] bg-[rgba(180,200,225,0.14)] lg:grid-cols-4">
        {[
          { k: "TVL · carat weight", v: "1,284.50", u: "SOL" },
          { k: "CWR price · per facet", v: "1.0772", u: "SOL" },
          { k: "CWR supply", v: "1,192.37", u: "CWR" },
          { k: "Fee · on deploy vol", v: "1.0", u: "%" },
        ].map((s) => (
          <div key={s.k} className={`bg-[#0F141D] px-5 py-5 ${styles.snapTarget}`}>
            <Label>{s.k}</Label>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span style={mono} className="text-[26px] font-medium tracking-tight text-[#EAEEF4]">
                {s.v}
              </span>
              <span style={mono} className="text-[12px] uppercase tracking-[0.1em] text-[#626E7E]">
                {s.u}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* ---------- phase gauges ---------- */}
      <section className="mt-5 grid gap-px overflow-hidden rounded-[4px] border border-[rgba(180,200,225,0.14)] bg-[rgba(180,200,225,0.14)] md:grid-cols-2">
        {/* deposit & claim - ACTIVE */}
        <div className="bg-[#0F141D] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#4D82FF]" />
              <h3 style={sora} className="text-[14px] font-medium tracking-tight text-[#EAEEF4]">
                Deposit &amp; Claim
              </h3>
            </div>
            <span style={mono} className="rounded-[3px] bg-[#4D82FF]/12 px-2 py-0.5 text-[12px] uppercase tracking-[0.16em] text-[#4D82FF]">
              active · the table
            </span>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <span style={mono} className="text-[40px] font-light leading-none tracking-tight text-[#EAEEF4]">
              03:30
            </span>
            <span style={mono} className="text-[12px] text-[#626E7E]">mm:ss</span>
          </div>
          {/* gauge with tick marks */}
          <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-[#131926]">
            <div className={`h-full w-[62%] bg-[#4D82FF] ${styles.sweep}`} />
          </div>
          <div className="mt-1.5 flex justify-between" style={mono}>
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="h-2 w-px bg-[rgba(180,200,225,0.14)]" />
            ))}
          </div>
          <p style={sora} className="mt-3 text-[12.5px] text-[#94A1B3]">
            mint CWR or claim rewards
          </p>
        </div>

        {/* cranking - IDLE */}
        <div className="bg-[#0F141D] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[rgba(180,200,225,0.2)]" />
              <h3 style={sora} className="text-[14px] font-medium tracking-tight text-[#626E7E]">
                Cranking
              </h3>
            </div>
            <span style={mono} className="rounded-[3px] border border-[rgba(180,200,225,0.14)] px-2 py-0.5 text-[12px] uppercase tracking-[0.16em] text-[#626E7E]">
              idle · in the press
            </span>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <span style={mono} className="text-[40px] font-light leading-none tracking-tight text-[#3A4252]">
              -:-
            </span>
            <span style={mono} className="text-[12px] text-[#626E7E]">queued</span>
          </div>
          <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-[#131926]">
            <div className="h-full w-0 bg-[rgba(180,200,225,0.14)]" />
          </div>
          <div className="mt-1.5 flex justify-between">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="h-2 w-px bg-[rgba(180,200,225,0.14)]" />
            ))}
          </div>
          <p style={sora} className="mt-3 text-[12.5px] text-[#94A1B3]">
            capital working the 25 tiles - runs after the window closes
          </p>
        </div>
      </section>

      {/* ---------- action grid: mint / claim / position ---------- */}
      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_0.9fr]">
        {/* MINT */}
        <div className="rounded-[4px] border border-[rgba(180,200,225,0.14)] bg-[#0F141D] p-6">
          <div className="flex items-center justify-between">
            <span style={mono} className="rounded-[3px] bg-[#131926] px-2.5 py-1 text-[12px] uppercase tracking-[0.16em] text-[#4D82FF]">
              deposit SOL
            </span>
            <Label>step 01</Label>
          </div>
          <h3 style={sora} className="mt-4 text-[16px] font-medium tracking-tight text-[#EAEEF4]">
            Mint CWR
          </h3>

          <div className="mt-5 rounded-[3px] border border-[rgba(180,200,225,0.14)] bg-[#131926] focus-within:border-[#4D82FF]">
            <div className="flex items-center justify-between px-4 pt-3">
              <Label>amount</Label>
              <Label>SOL</Label>
            </div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              style={mono}
              className="w-full bg-transparent px-4 pb-3 text-[28px] font-medium tracking-tight text-[#EAEEF4] outline-none"
            />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {["0.1", "0.5", "1", "5"].map((q) => (
              <button
                key={q}
                onClick={() => setAmount(q)}
                style={mono}
                className={`rounded-[3px] border px-2 py-2 text-[12px] transition ${
                  amount === q
                    ? "border-[#4D82FF] bg-[#4D82FF]/12 text-[#4D82FF]"
                    : "border-[rgba(180,200,225,0.14)] text-[#94A1B3] hover:border-[#4D82FF]/50 hover:text-[#4D82FF]"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-dashed border-[rgba(180,200,225,0.1)] pt-4">
            <Label>you receive ≈</Label>
            <span style={mono} className="text-[15px] text-[#EAEEF4]">
              {received.toFixed(4)} <span className="text-[#626E7E]">CWR</span>
            </span>
          </div>

          <button
            style={sora}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[3px] bg-[#4D82FF] px-5 py-3 text-[14px] font-medium text-[#0A0E15] transition hover:shadow-[0_0_24px_-8px_rgba(77,130,255,0.6)]"
          >
            Mint CWR
          </button>
        </div>

        {/* CLAIM */}
        <div className="rounded-[4px] border border-[rgba(180,200,225,0.14)] bg-[#0F141D] p-6">
          <div className="flex items-center justify-between">
            <span style={mono} className="rounded-[3px] bg-[#131926] px-2.5 py-1 text-[12px] uppercase tracking-[0.16em] text-[#2BD4E0]">
              burn CWR
            </span>
            <Label>step 02</Label>
          </div>
          <h3 style={sora} className="mt-4 text-[16px] font-medium tracking-tight text-[#EAEEF4]">
            Claim rewards
          </h3>

          <div className="mt-5 flex items-center justify-between rounded-[3px] bg-[#131926] px-4 py-3">
            <Label>your CWR</Label>
            <span style={mono} className="text-[15px] text-[#EAEEF4]">
              84.2100
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {([25, 50, 100] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPct(p)}
                style={mono}
                className={`rounded-[3px] border px-2 py-2 text-[12px] transition ${
                  pct === p
                    ? "border-[#2BD4E0] bg-[#2BD4E0]/12 text-[#2BD4E0]"
                    : "border-[rgba(180,200,225,0.14)] text-[#94A1B3] hover:border-[#2BD4E0]/50 hover:text-[#2BD4E0]"
                }`}
              >
                {p === 100 ? "Max" : `${p}%`}
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-dashed border-[rgba(180,200,225,0.1)] pt-4">
            <div className="flex items-center justify-between">
              <Label>you receive ≈</Label>
              <span style={mono} className="text-[15px] text-[#EAEEF4]">
                {claimSol.toFixed(4)} <span className="text-[#626E7E]">SOL</span>
              </span>
            </div>
            <div className="mt-1 flex items-center justify-end">
              <span style={mono} className="text-[12px] text-[#3DD68C]">+ stORE pro-rata</span>
            </div>
          </div>

          <button
            style={sora}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[3px] border border-[#2BD4E0] px-5 py-3 text-[14px] font-medium text-[#2BD4E0] transition hover:bg-[#2BD4E0] hover:text-[#0A0E15] hover:shadow-[0_0_24px_-8px_rgba(43,212,224,0.6)]"
          >
            Claim
          </button>
        </div>

        {/* POSITION - mini grading report */}
        <div className="rounded-[4px] border-2 border-[#EAEEF4]/70 bg-[#0F141D] p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between border-b border-dashed border-[rgba(180,200,225,0.14)] pb-3">
            <Label>your position</Label>
            <span style={mono} className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.14em] text-[#3DD68C]">
              <Tick className="h-3 w-3" /> graded
            </span>
          </div>

          <dl className="mt-2 divide-y divide-dashed divide-[rgba(180,200,225,0.14)]">
            {[
              { k: "CWR held", v: "84.2100", u: "CWR" },
              { k: "Value", v: "90.72", u: "SOL" },
              { k: "Pool share", v: "7.06", u: "%" },
            ].map((f) => (
              <div key={f.k} className="flex items-center justify-between py-3.5">
                <Label>{f.k}</Label>
                <span style={mono} className="text-[16px] text-[#EAEEF4]">
                  {f.v} <span className="text-[12px] text-[#626E7E]">{f.u}</span>
                </span>
              </div>
            ))}
          </dl>

          <div className="mt-2 rounded-[3px] border border-[#3DD68C]/30 bg-[#131926] px-4 py-3 shadow-[0_0_18px_-10px_rgba(61,214,140,0.5)]">
            <Label className="text-[#626E7E]">grade</Label>
            <div style={sora} className="mt-1 text-[15px] font-medium text-[#EAEEF4]">
              Holder · in good standing
            </div>
          </div>
        </div>
      </section>

      {/* ---------- LIVE CRANK PANEL ---------- */}
      <section className="mt-5 overflow-hidden rounded-[4px] border border-[rgba(180,200,225,0.14)] bg-[#0F141D]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(180,200,225,0.14)] px-6 py-4">
          <div>
            <h3 style={sora} className="text-[15px] font-medium tracking-tight text-[#EAEEF4]">
              Live crank
            </h3>
            <span style={sora} className="mt-0.5 block text-[12.5px] text-[#94A1B3]">
              what the keeper is doing on the board, right now
            </span>
          </div>
          <span
            style={mono}
            className="inline-flex items-center gap-2 rounded-[3px] bg-[#2BD4E0]/12 px-2.5 py-1 text-[12px] uppercase tracking-[0.18em] text-[#2BD4E0] shadow-[0_0_18px_-8px_rgba(43,212,224,0.6)]"
          >
            <span className={`h-1.5 w-1.5 rounded-full bg-[#2BD4E0] ${styles.blink}`} /> live
          </span>
        </div>

        <div className="grid gap-px bg-[rgba(180,200,225,0.14)] lg:grid-cols-[1fr_1.05fr]">
          {/* metrics + log */}
          <div className="bg-[#0F141D] p-6">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-[rgba(180,200,225,0.14)] bg-[rgba(180,200,225,0.14)]">
              {[
                { k: "ORE round", v: "#48213" },
                { k: "Motherlode", v: "218.6", u: "ORE" },
                { k: "Board deployed", v: "11.80", u: "SOL" },
                { k: "Miners", v: "1,347" },
              ].map((m) => (
                <div key={m.k} className="bg-[#0F141D] px-4 py-4">
                  <Label>{m.k}</Label>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span style={mono} className="text-[20px] font-medium tracking-tight text-[#EAEEF4]">
                      {m.v}
                    </span>
                    {m.u && (
                      <span style={mono} className="text-[12px] uppercase tracking-[0.1em] text-[#626E7E]">
                        {m.u}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* keeper last move - mono log line */}
            <div className="mt-5">
              <Label>keeper&apos;s last move</Label>
              <div className="mt-2 rounded-[3px] border border-[rgba(180,200,225,0.14)] bg-[#0A0E15] px-4 py-3.5">
                <div style={mono} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[#94A1B3]">
                  <span className="text-[#2BD4E0]">›</span>
                  <span className="text-[#EAEEF4]">deployed 0.0472 SOL × 25 tiles</span>
                  <span className="text-[#626E7E]">·</span>
                  <span className="text-[#4D82FF]">edge $3.27</span>
                  <span className="ml-auto text-[12px] text-[#626E7E]">8s ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* 25-tile measurement matrix */}
          <div className="bg-[#0F141D] p-6">
            <div className="mb-4 flex items-center justify-between">
              <Label>25-tile board · measurement matrix</Label>
              <Label>SOL / tile</Label>
            </div>
            <div className="grid grid-cols-5 gap-px overflow-hidden rounded-[3px] border border-[rgba(180,200,225,0.14)] bg-[rgba(180,200,225,0.14)]">
              {TILES.map((t, i) => {
                // intensity ∝ SOL: cool blue→cyan ramp on dark, brighter = hotter
                const intensity = Math.min(t / 0.95, 1);
                // blend deep navy base → spectral blue → instrument cyan
                const r = Math.round(15 + intensity * 28);
                const g = Math.round(20 + intensity * 192);
                const b = Math.round(29 + intensity * 195);
                const bg = `rgb(${r}, ${g}, ${b})`;
                const ink = intensity > 0.5 ? "#0A0E15" : "#94A1B3";
                return (
                  <div
                    key={i}
                    className="relative flex aspect-square flex-col items-center justify-center"
                    style={{ background: bg }}
                  >
                    <span style={{ ...mono, color: ink }} className="text-[12px] font-medium tabular-nums">
                      {t.toFixed(2)}
                    </span>
                    <span
                      style={{ ...mono, color: ink, opacity: 0.55 }}
                      className="absolute left-1 top-0.5 text-[12px]"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between" style={mono}>
              <span className="text-[12px] text-[#626E7E]">intensity ∝ SOL deployed</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#626E7E]">0.00</span>
                <span
                  className="h-2 w-24 rounded-full"
                  style={{ background: "linear-gradient(90deg, rgb(15,20,29), rgb(43,212,224))" }}
                />
                <span className="text-[12px] text-[#626E7E]">0.95</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* footer return link */}
      <div className="mt-8 flex items-center justify-between border-t border-[rgba(180,200,225,0.14)] pt-5">
        <Link
          href="/2"
          style={mono}
          className="text-[12px] uppercase tracking-[0.18em] text-[#626E7E] transition hover:text-[#4D82FF]"
        >
          ← back to report
        </Link>
        <span style={mono} className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-[#626E7E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4D82FF]" /> readout verified onchain
        </span>
      </div>
    </main>
  );
}
