"use client";

/**
 * Solo / Split tab — the v4 per-tile reward mask (10 solo ✦ / 15 split) as a
 * paginated card gallery back to the v4 cutover (round 349,213). The mask is pure
 * (keccak + Fisher–Yates from round id); the outcome + per-tile SOL come from the
 * indexed rounds. Tapping a card opens the round detail in a modal so the grid
 * never reflows.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ServiceChip } from "@/components/primitives/ServiceChip";
import { ChartCard } from "@/components/stats/Charts";
import { DualLine, type TPt } from "@/components/stats/TrendCharts";
import { RefreshIconButton } from "@/components/primitives/RefreshIconButton";
import { RowsSkeleton } from "@/components/primitives/Skeleton";
import { usePolled } from "@/hooks/useOreStats";
import {
  roundTileModes, soloSplitDeployStats,
  type TileMode, type SoloSplitDeployStats,
} from "@/lib/distributionMask";
import { fetchOreRounds, fetchOreRound, fetchOreSoloSplitSeries, type OreRound, type OreRoundDetail } from "@/lib/oreStats";
import { formatNum, formatSol, formatPct } from "@/lib/format";
import { Pager, PAGE } from "./shared";

const V4_FIRST_ROUND = 349_213; // validated cutover: first round the solo/split mask governs
const WIN = "#FF5AC8"; // winning-tile highlight
const SPLIT_SENTINEL = "SpLiT1111111111111111111111111111111111111";

// Categorical solo/split palette — validated (dataviz): gold (solo) vs blue (split),
// worst-adjacent CVD ΔE 32. `rgb` = fill mark, `ink` = legible text tint on dark.
const MODE: Record<TileMode, { rgb: string; ink: string; label: string }> = {
  solo: { rgb: "251,191,36", ink: "#FDE08A", label: "Solo" },
  split: { rgb: "59,130,246", ink: "#93C5FD", label: "Split" },
};

/** Solo-vs-split over time (moved here from Trends, where it sat among charts
 *  about price and cost rather than beside the mask it describes). The long
 *  explainer subtitle is replaced by the lifetime tally — the number people
 *  actually come here for — with the prose kept underneath the chart. */
function SoloSplitTrend() {
  const series = usePolled(() => fetchOreSoloSplitSeries("all"), 60_000, []);
  const pts = series.data?.points ?? [];
  const t = series.data?.totals;
  const lbl = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
  };
  const pct = (v: number | null | undefined) => (v == null ? "···" : `${formatNum(v, 1)}%`);
  const deployLean: TPt[] = pts.map((p) => ({ label: lbl(p.ts), value: p.solo_deploy_share != null ? p.solo_deploy_share * 100 : null }));
  const outcomeRate: TPt[] = pts.map((p) => ({ label: lbl(p.ts), value: p.solo_outcome_rate != null ? p.solo_outcome_rate * 100 : null }));

  return (
    <ChartCard variant="dispersion" cutCorner="bl" title="Solo vs Split over time">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1.5 font-mono text-[13px]">
        <span style={{ color: MODE.solo.ink }}>
          Solo <span className="font-bold">{t ? formatNum(t.solo_rounds) : "···"}</span>
          <span className="text-fog-muted"> · </span>{pct(t?.solo_pct)}
        </span>
        <span style={{ color: MODE.split.ink }}>
          Split <span className="font-bold">{t ? formatNum(t.split_rounds) : "···"}</span>
          <span className="text-fog-muted"> · </span>{pct(t?.split_pct)}
        </span>
        <span className="text-[12px] text-fog-muted">
          all {t ? formatNum(t.rounds) : "···"} v4 rounds · expected 40% / 60%
        </span>
      </div>
      <DualLine a={deployLean} b={outcomeRate}
        aName="Deploy lean (SOL on solos)" bName="Outcome rate (rounds paid solo)"
        aColor="#FBBF24" bColor="#5B6CFF" shared
        refLine={{ value: 40, name: "expected 40% (10/25 tiles)", color: "#9094A0" }}
        aFmt={(v) => `${v.toFixed(0)}%`} bFmt={(v) => `${v.toFixed(0)}%`}
        height={250} loading={series.loading && !series.data}
        emptyText="Collecting v4 rounds…" />
      <p className="mt-2.5 font-mono text-[12px] leading-relaxed text-fog-muted">
        Share of SOL chasing the 10 solo (winner-take-all) tiles — the crowd&apos;s lean — vs the share of
        rounds that actually paid solo. Both against the fixed 40% tile baseline (dashed): deploy lean above
        the line = solo-chasing; the outcome rate just wobbles around it.
      </p>
    </ChartCard>
  );
}

const shortKey = (a?: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "·");
const isSplitWinner = (topMiner?: string | null) => topMiner?.startsWith(SPLIT_SENTINEL) ?? false;
const lamToSol = (s?: string | null) => Number(s ?? 0) / 1e9;

/** The 25-tile mask. Solo carries the ✦; the winning tile gets a pink ring. */
function TileBoard({ modes, winningTile }: { modes: TileMode[]; winningTile?: number | null }) {
  return (
    <div className="grid grid-cols-5 gap-1" role="img" aria-label="25-tile solo/split board">
      {modes.map((mode, i) => {
        const m = MODE[mode];
        const won = winningTile === i;
        return (
          <div
            key={i}
            title={`Tile ${i + 1}: ${m.label}${won ? " · winning tile" : ""}`}
            className="relative flex aspect-square items-center justify-center rounded-[4px] border font-mono text-[10px] font-semibold leading-none"
            style={{
              background: `rgba(${m.rgb},0.14)`,
              borderColor: won ? WIN : `rgba(${m.rgb},0.62)`,
              boxShadow: won ? `0 0 0 1px ${WIN}, 0 0 12px -3px ${WIN}` : undefined,
              color: won ? "#fff" : m.ink,
            }}
          >
            {mode === "solo" && (
              <span className="pointer-events-none absolute right-[2px] top-[1px] text-[8px] leading-none" style={{ color: won ? "#fff" : m.ink }} aria-hidden>
                ✦
              </span>
            )}
            {i + 1}
          </div>
        );
      })}
    </div>
  );
}

/** Avg SOL/tile for solo vs split — where the money leaned. */
function AvgStrip({ stats }: { stats: SoloSplitDeployStats }) {
  const maxAvg = Math.max(stats.soloAvgSol, stats.splitAvgSol, 1e-9);
  const rows = [
    { label: "Solo", ink: MODE.solo.ink, rgb: MODE.solo.rgb, avg: stats.soloAvgSol },
    { label: "Split", ink: MODE.split.ink, rgb: MODE.split.rgb, avg: stats.splitAvgSol },
  ];
  return (
    <div className="space-y-1.5 font-mono text-[12px]">
      <div className="flex items-baseline justify-between text-fog-muted">
        <span>Deploy split</span>
        <span>
          <span style={{ color: MODE.solo.ink }}>{formatPct(stats.soloShare, 0)}</span>
          {" / "}
          <span style={{ color: MODE.split.ink }}>{formatPct(stats.splitShare, 0)}</span>
        </span>
      </div>
      <div className="text-fog-muted">Avg SOL / tile</div>
      {rows.map((r) => (
        <div key={r.label} className="flex min-w-0 items-center gap-2">
          <span className="w-9 shrink-0" style={{ color: r.ink }}>{r.label}</span>
          <div className="h-1.5 min-w-0 flex-1 rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full" style={{ width: `${Math.max(4, (r.avg / maxAvg) * 100)}%`, background: `rgb(${r.rgb})` }} />
          </div>
          <span className="num w-[4.5rem] shrink-0 text-right text-white">{formatSol(r.avg, 4)}</span>
        </div>
      ))}
    </div>
  );
}

/** Per-tile SOL heat over the mask — cell hue = solo/split, intensity = SOL. */
function DeployHeatBoard({
  modes,
  perTileSol,
  perTileCount,
  winningTile,
}: {
  modes: TileMode[];
  perTileSol: number[];
  perTileCount: number[];
  winningTile: number | null;
}) {
  const maxSol = Math.max(1e-9, ...perTileSol);
  return (
    <div className="grid grid-cols-5 gap-1 sm:gap-1.5" role="img" aria-label="Per-tile SOL deploy board">
      {modes.map((mode, i) => {
        const m = MODE[mode];
        const sol = perTileSol[i] ?? 0;
        const count = perTileCount[i] ?? 0;
        const intensity = sol / maxSol;
        const won = winningTile === i;
        const alpha = (0.1 + intensity * 0.6).toFixed(3);
        return (
          <div
            key={i}
            title={`Tile ${i + 1}: ${m.label} · ${formatSol(sol, 4)} SOL · ${count} miners`}
            className="relative flex aspect-square flex-col items-center justify-center rounded-md border-2 px-0.5 font-mono"
            style={{
              borderColor: won ? WIN : "transparent",
              boxShadow: won ? `0 0 14px -2px ${WIN}, 0 0 0 1px ${WIN}66` : undefined,
              background: won ? `rgba(255,90,200,${(0.24 + intensity * 0.4).toFixed(3)})` : `rgba(${m.rgb},${alpha})`,
              color: won || intensity > 0.55 ? "#fff" : m.ink,
            }}
          >
            <span className="absolute left-1 top-0.5 flex items-center gap-0.5 text-[9px] text-white/50 sm:left-1.5 sm:top-1 sm:text-[10px]">
              #{i + 1}
              {mode === "solo" && <span style={{ color: m.ink }} aria-hidden>✦</span>}
            </span>
            {won && (
              <span className="absolute right-1 top-0.5 text-[8px] font-bold sm:right-1.5 sm:top-1 sm:text-[9px]" style={{ color: WIN }}>
                win
              </span>
            )}
            <span className="num text-[10px] leading-none sm:text-[11px]">{formatSol(sol, 3)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ResultBadge({ mode }: { mode: TileMode }) {
  const m = MODE[mode];
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ background: `rgba(${m.rgb},0.16)`, color: m.ink, border: `1px solid rgba(${m.rgb},0.4)` }}
    >
      {mode === "solo" && <span aria-hidden>✦</span>}
      {m.label}
    </span>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="section-label text-[10px]">{label}</div>
      <div className="num mt-0.5 truncate text-[13px] text-white">{children}</div>
    </div>
  );
}

/** Round detail body — outcome stats, per-tile SOL heat, deploy bias, Rounds jump.
 *  Per-tile deploys are fetched from /ore/round/:id when this mounts (modal open). */
function RoundDetail({ round, modes }: { round: OreRound; modes: TileMode[] }) {
  const [detail, setDetail] = useState<OreRoundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    fetchOreRound(round.round_id)
      .then((d) => { if (!cancelled) setDetail(d.data.round); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [round.round_id]);

  const wt = round.winning_tile;
  const splitWin = isSplitWinner(round.top_miner);
  const resultMode: TileMode | null = wt == null ? null : round.is_split ? "split" : "solo";
  const dRec = detail as unknown as Record<string, string | undefined> | null;
  const perTileSol = dRec ? Array.from({ length: 25 }, (_, i) => lamToSol(dRec[`deployed_${i}`])) : [];
  const perTileCount = dRec ? Array.from({ length: 25 }, (_, i) => Number(dRec[`count_${i}`] ?? 0)) : [];
  const hasData = perTileSol.some((v) => v > 0);
  const stats = hasData ? soloSplitDeployStats(modes, perTileSol) : null;

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="Result">{resultMode ? <ResultBadge mode={resultMode} /> : <span className="text-fog-muted">in progress</span>}</Stat>
        <Stat label="Deployed">{formatSol(lamToSol(round.total_deployed), 2)} <span className="text-fog-muted">SOL</span></Stat>
        <Stat label="Miners">{round.total_miners != null ? formatNum(Number(round.total_miners)) : "—"}</Stat>
        <Stat label="Winning tile">
          {wt != null ? <span style={{ color: WIN }}>#{wt + 1}{resultMode === "solo" ? " ✦" : ""}</span> : <span className="text-fog-muted">—</span>}
        </Stat>
      </div>

      {wt != null && (
        <p className="font-mono text-[12px] leading-snug text-fog-muted">
          {splitWin ? (
            <>Split tile won — the ~1 ORE base is <span className="text-white">shared pro-rata</span> across the winning tile&apos;s stakers.</>
          ) : (
            <>Solo tile won — the full <span className="text-white">~1 ORE</span> goes to <span className="text-white">{shortKey(round.top_miner)}</span><ServiceChip service={round.top_miner_service} className="ml-1.5" />.</>
          )}
        </p>
      )}

      {loading && !detail ? (
        <div className="text-[12px] text-fog-muted">Loading per-tile deploys…</div>
      ) : error ? (
        <div className="text-[12px] text-amber">{error}</div>
      ) : hasData ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
          <div className="w-full max-w-md">
            <DeployHeatBoard modes={modes} perTileSol={perTileSol} perTileCount={perTileCount} winningTile={wt} />
            <p className="mt-1.5 font-mono text-[11px] leading-snug text-fog-muted">Cell hue = solo/split · intensity = SOL deployed.</p>
          </div>
          {stats && <AvgStrip stats={stats} />}
        </div>
      ) : (
        <div className="text-[12px] text-fog-muted">Per-tile deploys not indexed for this round.</div>
      )}

      <div className="flex justify-end pt-1">
        <Link href="/stats?section=rounds" className="inline-flex items-center gap-1 font-mono text-[12px] text-steel transition-colors hover:text-white">
          Open in Rounds <span aria-hidden>↗</span>
        </Link>
      </div>
    </div>
  );
}

/** Round detail in a portal modal — grid stays frozen behind it. Fades + scales
 *  in/out (reduced-motion aware); Escape / backdrop / ✕ to close. No body
 *  scroll-lock (it detaches the page's sticky header). */
function RoundModal({ round, onClose }: { round: OreRound | null; onClose: () => void }) {
  const [render, setRender] = useState(!!round);
  const [shown, setShown] = useState(false);
  const [shownRound, setShownRound] = useState<OreRound | null>(round);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => { if (round) setShownRound(round); }, [round]);

  useEffect(() => {
    if (round) {
      lastFocus.current = document.activeElement;
      setRender(true);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    setShown(false);
    const t = setTimeout(() => {
      setRender(false);
      (lastFocus.current as HTMLElement | null)?.focus?.();
    }, 200);
    return () => clearTimeout(t);
  }, [round]);

  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [render, onClose]);

  useEffect(() => { if (shown) closeRef.current?.focus(); }, [shown]);

  if (!render || typeof document === "undefined" || !shownRound) return null;
  const rid = Number(shownRound.round_id);
  const resultMode: TileMode | null = shownRound.winning_tile == null ? null : shownRound.is_split ? "split" : "solo";

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${shown ? "opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Round #${formatNum(rid)} solo/split detail`}
    >
      <div
        className={`my-8 w-full max-w-2xl origin-top rounded-2xl border border-line bg-ink-900 shadow-2xl transition-all duration-200 ease-out motion-reduce:transition-none ${shown ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
          <span className="num flex items-center gap-2 text-[15px] font-bold text-white">
            #{formatNum(rid)}
            {resultMode ? <ResultBadge mode={resultMode} /> : <span className="text-[11px] font-normal text-fog-muted">in progress</span>}
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-md px-2 py-1 text-fog-muted transition-colors hover:bg-white/5 hover:text-fog focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            ✕
          </button>
        </div>
        <RoundDetail round={shownRound} modes={roundTileModes(rid).tileModes} />
      </div>
    </div>,
    document.body,
  );
}

/** One round card — the mask board (winning tile ringed) + a compact deploy line.
 *  The whole card is a button; tapping opens the detail modal (no grid reflow). */
function RoundCard({ round, onOpen }: { round: OreRound; onOpen: () => void }) {
  const rid = Number(round.round_id);
  const modes = roundTileModes(rid).tileModes;
  const wt = round.winning_tile;
  const resultMode: TileMode | null = wt == null ? null : round.is_split ? "split" : "solo";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-line bg-ink-800/40 text-left transition-colors hover:border-white/20"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <span className="num text-[13px] font-semibold text-white">#{formatNum(rid)}</span>
        <span className="flex items-center gap-2">
          {resultMode ? <ResultBadge mode={resultMode} /> : <span className="text-[11px] text-fog-muted">in progress</span>}
          <span className="text-[11px] text-gray-500 transition-colors group-hover:text-fog" aria-hidden>↗</span>
        </span>
      </div>
      <div className="space-y-2.5 px-3 pb-3 pt-2.5">
        <TileBoard modes={modes} winningTile={wt} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] text-fog-muted">
          <span className="num text-white">{formatSol(lamToSol(round.total_deployed), 2)}</span> SOL
          <span className="num text-white">{round.total_miners != null ? formatNum(Number(round.total_miners)) : "—"}</span> miners
          {wt != null && <span className="ml-auto" style={{ color: WIN }}>win #{wt + 1}</span>}
        </div>
      </div>
    </button>
  );
}

export function TileModesTab() {
  const [offset, setOffset] = useState(0);
  const [modalRound, setModalRound] = useState<OreRound | null>(null);
  const page = usePolled(() => fetchOreRounds(PAGE, offset), 20_000, [offset]);

  const all = page.data?.rounds ?? [];
  // Only v4 rounds have a solo/split mask — cap at the cutover client-side (the
  // list endpoint has no from_round). Rounds are contiguous + newest-first, so the
  // tip = first row's id + offset, and the v4 window is [349,213 .. tip].
  const rounds = all.filter((r) => Number(r.round_id) >= V4_FIRST_ROUND);
  const tip = all.length ? Number(all[0].round_id) + offset : null;
  const v4Total = tip != null ? Math.max(0, tip - V4_FIRST_ROUND + 1) : 0;
  const loading = page.loading && !page.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[13px] text-fog-muted">
        <span>
          {tip != null
            ? `v4 solo/split mask, every round back to the first (#${formatNum(V4_FIRST_ROUND)}). Tap a round for per-tile SOL + the outcome.`
            : loading
              ? "Loading rounds…"
              : "Could not load rounds."}
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: `rgba(${MODE.solo.rgb},0.18)`, borderColor: `rgba(${MODE.solo.rgb},0.6)` }} />
            <span style={{ color: MODE.solo.ink }}>Solo ✦ · 10</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: `rgba(${MODE.split.rgb},0.18)`, borderColor: `rgba(${MODE.split.rgb},0.6)` }} />
            <span style={{ color: MODE.split.ink }}>Split · 15</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ boxShadow: `0 0 0 1px ${WIN}` }} />
            <span style={{ color: WIN }}>won</span>
          </span>
        </span>
      </div>

      <ChartCard title="Solo / Split by round" subtitle="Mask is exact (keccak + Fisher–Yates from the round id); outcome + per-tile SOL from the indexed rounds. Solo/split went live at round 349,213.">
        {loading ? (
          <RowsSkeleton rows={6} />
        ) : page.error && !page.data ? (
          <div className="flex flex-wrap items-center gap-3 font-mono text-sm text-amber">
            <span>{page.error}</span>
            <RefreshIconButton onClick={page.refresh} variant="amber" className="py-0.5" title="Retry" />
          </div>
        ) : rounds.length === 0 ? (
          <div className="font-mono text-sm text-fog-muted">No rounds available yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rounds.map((round) => (
                <RoundCard key={round.round_id} round={round} onOpen={() => setModalRound(round)} />
              ))}
            </div>
            <div className="mt-4">
              <Pager offset={offset} total={v4Total} onPage={(o) => { setModalRound(null); setOffset(o); }} unit="rounds" loading={page.fetching && !!page.data} />
            </div>
          </>
        )}
      </ChartCard>

      <SoloSplitTrend />

      <p className="font-mono text-[12px] text-fog-muted">
        Solo/split assignment is derived from the round id alone, so it&apos;s exact for every round since the v4 cutover (#{formatNum(V4_FIRST_ROUND)}).
      </p>

      <RoundModal round={modalRound} onClose={() => setModalRound(null)} />
    </div>
  );
}
