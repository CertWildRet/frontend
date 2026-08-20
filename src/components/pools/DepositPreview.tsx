"use client";

/**
 * Mock deposit / withdraw quote + dORE value / play-skip preview for /pools.
 * NAV and round tape are placeholder series until the vault is live.
 */
import { useMemo, useState } from "react";
import { ChartCard } from "@/components/stats/Charts";
import { DualLine, type TPt } from "@/components/stats/TrendCharts";
import { SegmentedControl } from "@/components/primitives/TabBar";
import { formatNum, formatSol } from "@/lib/format";
import { CHART } from "@/lib/chartColors";

const QUICK = [0.5, 1, 5, 10];
const MOCK_NAV = 1.084; // SOL per dORE — fake until the vault quotes live
const TABS = [
  { id: "deposit", label: "Deposit" },
  { id: "withdraw", label: "Withdraw" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mockValueSeries(): { dore: TPt[]; sol: TPt[] } {
  const rand = mulberry32(20260820);
  const dore: TPt[] = [];
  const sol: TPt[] = [];
  let v = 1;
  const start = new Date("2026-05-22T00:00:00Z");
  for (let i = 0; i < 90; i++) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const label = day.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    // Slow grind up, two modest drawdowns (May/Jul analogue), noise.
    const dip = (i > 18 && i < 32) || (i > 62 && i < 74) ? -0.0042 : 0.0016;
    v = Math.max(0.94, v + dip + (rand() - 0.48) * 0.006);
    dore.push({ label, value: Number(v.toFixed(4)) });
    sol.push({ label, value: 1 });
  }
  dore[dore.length - 1]!.value = MOCK_NAV;
  return { dore, sol };
}

type RoundMark = { id: number; played: boolean };

function mockRoundTape(): RoundMark[] {
  const rand = mulberry32(371268);
  const rows: RoundMark[] = [];
  let id = 372_140;
  let sitOut = 0;
  for (let i = 0; i < 72; i++) {
    // Sit-out streaks are the design: skip more than half, cluster the plays.
    const play = sitOut > 2 ? rand() < 0.72 : rand() < 0.28;
    sitOut = play ? 0 : sitOut + 1;
    rows.push({ id: id++, played: play });
  }
  return rows;
}

const VALUE = mockValueSeries();
const ROUNDS = mockRoundTape();
const PLAYED = ROUNDS.filter((r) => r.played).length;

export function DepositPreview() {
  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("1");
  const qty = Number(amount);
  const valid = qty > 0 && Number.isFinite(qty);
  const depositing = tab === "deposit";
  const estOut = depositing ? qty / MOCK_NAV : qty * MOCK_NAV;
  const lastLabel = useMemo(() => VALUE.dore[VALUE.dore.length - 1]?.label ?? "", []);

  return (
    <ChartCard
      title={depositing ? "Deposit SOL" : "Withdraw dORE"}
      subtitle={`Mock Quote · ${formatSol(MOCK_NAV, 3)} SOL / dORE`}
    >
      <div className="mb-4">
        <SegmentedControl
          items={[...TABS]}
          value={tab}
          onChange={setTab}
          aria-label="Deposit or Withdraw"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8B93B4]">
            {depositing ? "Amount (SOL)" : "Amount (dORE)"}
          </label>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.0"
            aria-label={depositing ? "Deposit amount in SOL" : "Withdraw amount in dORE"}
            className="mt-2 w-full rounded-lg border border-[rgba(91,108,255,0.25)] bg-ink-900/40 px-3 py-2.5 font-mono text-lg text-white outline-none transition-colors placeholder:text-fog-muted focus:border-steel focus:bg-ink-800"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className="rounded-md border border-white/[0.08] px-2.5 py-1 font-mono text-[12px] text-[#C7D0EA] transition-colors hover:border-white/20 hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8B93B4]">
              {depositing ? "Estimated dORE" : "Estimated SOL"}
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span
                className="text-[2rem] font-bold leading-none tracking-tight text-[#EAECF6]"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                {valid ? (depositing ? formatNum(estOut, 3) : formatSol(estOut, 3)) : "—"}
              </span>
              <span className="font-mono text-[13px] text-[#8B93B4]">
                {depositing ? "dORE" : "SOL"}
              </span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-[#8B93B4]">
              {depositing
                ? `Placeholder quote at ${formatSol(MOCK_NAV, 3)} SOL per dORE. Live minting lands with the vault.`
                : `Swap dORE back to SOL at ${formatSol(MOCK_NAV, 3)} SOL per dORE. Redeem when a window is open.`}
            </p>
          </div>

          <button type="button" className="btn-primary mt-auto inline-flex w-full justify-center px-5 py-2.5">
            {depositing ? "Deposit SOL" : "Withdraw SOL"}
          </button>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <div>
            <h3
              className="mb-2 text-[15px] font-semibold tracking-tight text-[#EAECF6]"
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              dORE Value
            </h3>
            <DualLine
              a={VALUE.dore}
              b={VALUE.sol}
              aName="dORE Value"
              bName="SOL"
              aColor={CHART.cyan}
              bColor={CHART.steel}
              shared
              height={180}
              aFmt={(v) => `${v.toFixed(3)} SOL`}
              bFmt={(v) => `${v.toFixed(2)} SOL`}
            />
            <p className="mt-1 font-mono text-[11px] text-[#8B93B4]">
              Mock 90-day series · last {lastLabel} · {formatSol(MOCK_NAV, 3)} SOL
            </p>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3
                className="text-[15px] font-semibold tracking-tight text-[#EAECF6]"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                Rounds Played / Skipped
              </h3>
              <span className="font-mono text-[12px] text-[#8B93B4]">
                Last {ROUNDS.length} · {PLAYED} Played · {ROUNDS.length - PLAYED} Skipped
              </span>
            </div>
            <div className="grid grid-rows-3 grid-flow-col gap-[3px]" role="img" aria-label="Play and skip timeline">
              {ROUNDS.map((r) => (
                <span
                  key={r.id}
                  title={`Round #${r.id} · ${r.played ? "Played" : "Skipped"}`}
                  className={`h-4 w-1.5 rounded-[1px] sm:w-2 ${
                    r.played ? "bg-[#22E0E6]" : "bg-white/[0.12]"
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-4 font-mono text-[11px] text-[#8B93B4]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[1px] bg-[#22E0E6]" /> Played
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[1px] bg-white/[0.12]" /> Skipped
              </span>
            </div>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
