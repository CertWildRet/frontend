"use client";

/** Shared helpers for Ore Data tabs. */
import { createContext } from "react";
import { compactNum } from "@/components/stats/Charts";
import { oreGramsToOre, lamportsToSol, type OreMotherlodeHit } from "@/lib/oreStats";
import { formatNum, formatPct } from "@/lib/format";
import styles from "./stats.module.css";

export type Tab = "trends" | "protocol" | "ecosystem" | "round_analysis" | "miners" | "motherlode" | "rounds" | "cohort";

// Cross-tab jump: any row (e.g. a motherlode sharer) can send a pubkey to the
// Search Miners tab and pre-fill its search bar. `n` bumps each call so re-clicking
// the same wallet still re-triggers the seed effect.
export type MinerSeed = { pubkey: string; n: number };
export const MinerNavContext = createContext<(pubkey: string) => void>(() => {});

export const TABS: { id: Tab; label: string }[] = [
  { id: "trends", label: "Trends" },
  { id: "protocol", label: "Protocol" },
  { id: "ecosystem", label: "Ecosystem" },
  { id: "round_analysis", label: "Round Analysis" },
  { id: "miners", label: "Search Miners" },
  { id: "motherlode", label: "Motherlode" },
  { id: "rounds", label: "Rounds" },
  { id: "cohort", label: "Cohort" },
];

export const short = (a?: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "·");

// Table styling mirrors the Position page's WalletAnalytics tables 1:1.
export const tableWrap = styles.tableWrap;
export const theadRow = `${styles.tableHead} text-left`;
export const th = "px-2 py-2 font-bold sm:px-3";
export const td = "px-2 py-2 sm:px-3";
export const bodyRow = styles.tableRow;
export const oursRow = `${styles.tableRow} ${styles.oursRow}`;

export const solOf = (grams?: string | null) => oreGramsToOre(grams); // ORE grams -> ORE
export const netTone = (v: number) => (v > 0 ? "text-pos" : v < 0 ? "text-red" : "text-gray-300");

export const PAGE = 50; // shared page size for every paginated table
export const POP_PAGE = 20; // sharers/participants revealed per "Load More"

// One pagination control for every table (rows N–M of TOTAL + Prev/Next).
export function Pager({ offset, total, onPage, unit = "rows", loading = false }: { offset: number; total: number; onPage: (o: number) => void; unit?: string; loading?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.floor(offset / PAGE) + 1;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[13px] text-fog-muted">
      <span>{loading ? "loading…" : `${formatNum(from)}–${formatNum(to)} of ${formatNum(total)} ${unit} · page ${formatNum(page)} / ${formatNum(pages)}`}</span>
      <div className="flex gap-2">
        <button disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - PAGE))}
          className="rounded border border-line px-3 py-1.5 disabled:opacity-40 enabled:hover:border-steel enabled:hover:text-white">Prev</button>
        <button disabled={page >= pages} onClick={() => onPage(offset + PAGE)}
          className="rounded border border-line px-3 py-1.5 disabled:opacity-40 enabled:hover:border-steel enabled:hover:text-white">Next</button>
      </div>
    </div>
  );
}

/** Shimmer placeholder rows for a table's first load (never on background polls). */
export function SkeletonRows({ cols, rows = 8 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`sk-${i}`}>
          <td colSpan={cols} className="px-2 py-2 sm:px-3">
            <div className="h-4 animate-pulse-thrice rounded bg-white/[0.05]" style={{ opacity: 1 - i * 0.09 }} />
          </td>
        </tr>
      ))}
    </>
  );
}

// $ compact, e.g. $82k / $1,240 / $0. USD legs are null before price history.
// $ compact. Sub-$1 non-zero shows "<$1" so dust reads as tiny-but-real, not "$0".
export const fmtUsd = (n?: number | null) =>
  n == null ? "·" : n === 0 ? "$0" : n < 1 ? "<$1" : n >= 1000 ? `$${compactNum(n)}` : `$${formatNum(n, 0)}`;
// A non-zero value below the display precision shows "<0.01" (etc.) instead of a
// misleading "0.00" — so a dust sharer's row reads honestly (tiny stake, tiny
// take, big ROI ratio) rather than looking broken (all zeros, yet 97x).
export const fmtDust = (v: number, decimals: number): string => {
  if (v === 0) return "0";
  const floor = Math.pow(10, -decimals);
  return v > 0 && v < floor ? `<${floor.toFixed(decimals)}` : formatNum(v, decimals);
};
export const fmtPctDust = (frac: number): string => {
  if (frac === 0) return "0%";
  const pct = frac * 100;
  return pct > 0 && pct < 0.01 ? "<0.01%" : formatPct(frac);
};
export const fmtWhen = (ts?: number | null) =>
  ts == null ? "·" : new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// derive the USD + profitability view of one pop hit
export function popEcon(h: OreMotherlodeHit) {
  const mlOre = solOf(h.motherlode_paid);
  const depSol = h.total_deployed ? lamportsToSol(h.total_deployed) : null;
  const mlUsd = h.ore_usd != null ? mlOre * h.ore_usd : null;
  const depUsd = depSol != null && h.sol_usd != null ? depSol * h.sol_usd : null;
  const underwater = mlUsd != null && depUsd != null ? mlUsd < depUsd : false;
  return { mlOre, mlUsd, depSol, depUsd, underwater };
}

// ── caveats / provenance footer ──────────────────────────────────────────────
export function Caveats({ provenance, error, onRetry }: { provenance: any; error: string | null; onRetry?: () => void }) {
  if (error) {
    return (
      <div className="card flex flex-wrap items-center gap-x-3 gap-y-2 border-amber/30 px-4 py-3 font-mono text-[13px] text-amber">
        <span>{error} The ORE ingest may be disabled or the free-tier host may be waking up.</span>
        {onRetry && (
          <button onClick={onRetry}
            className="rounded border border-amber/40 px-2.5 py-1 text-[12px] text-amber transition-colors hover:border-amber hover:text-white">
            retry
          </button>
        )}
      </div>
    );
  }
  if (!provenance) return null;
  return (
    <details className="card px-4 py-3">
      <summary className="cursor-pointer select-none font-mono text-[13px] text-fog-muted">
        data &amp; caveats · spine → #{formatNum(Number(provenance.ore_max_round || 0))}
        {provenance.census_snapshot_ts ? ` · census ${new Date(provenance.census_snapshot_ts).toLocaleDateString()}` : ""}
        {provenance.ingest_enabled ? "" : " · ingest OFF"}
      </summary>
      <ul className="mt-2 space-y-1.5">
        {(provenance.caveats ?? []).map((c: string, i: number) => (
          <li key={i} className="font-mono text-[13px] leading-snug text-fog-muted">• {c}</li>
        ))}
      </ul>
    </details>
  );
}
