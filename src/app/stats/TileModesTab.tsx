"use client";

/**
 * Solo / Split tab — the v4 per-tile reward mask (10 solo ✦ / 15 split) as a
 * paginated card gallery back to the v4 cutover (round 349,213, the first
 * solo/split round). The mask is pure (keccak + Fisher–Yates from round id, exact
 * for any round); the outcome (winning tile, split/solo) + per-tile SOL come from
 * the indexed rounds, so — unlike the live-PDA view — history isn't capped at ~20.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChartCard } from "@/components/stats/Charts";
import { RowsSkeleton } from "@/components/primitives/Skeleton";
import { usePolled } from "@/hooks/useOreStats";
import {
  roundTileModes, soloSplitDeployStats,
  type TileMode, type SoloSplitDeployStats,
} from "@/lib/distributionMask";
import { fetchOreRounds, fetchOreRound, type OreRound, type OreRoundDetail } from "@/lib/oreStats";
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

/** Expanded round — round summary, per-tile SOL heat, deploy bias, + a Rounds jump.
 *  Per-tile deploys come from /ore/round/:id, fetched only when the card opens. */
function RoundDetail({ round, modes }: { round: OreRound; modes: TileMode[] }) {
  const [detail, setDetail] = useState<OreRoundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
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

  const jump = (
    <Link href="/stats?section=rounds" className="inline-flex items-center gap-1 font-mono text-[12px] text-steel transition-colors hover:text-white">
      Open in Rounds <span aria-hidden>↗</span>
    </Link>
  );

  return (
    <div className="space-y-4 border-t border-line px-3 py-4 sm:px-4">
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
            <>Solo tile won — the full <span className="text-white">~1 ORE</span> goes to <span className="text-white">{shortKey(round.top_miner)}</span>.</>
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

      <div className="flex justify-end pt-1">{jump}</div>
    </div>
  );
}

/** One round card: header (id + outcome), the mask board (winning tile ringed), a
 *  compact deploy line; tap to expand into RoundDetail (spans the full grid row). */
function RoundCard({ round, open, onToggle }: { round: OreRound; open: boolean; onToggle: () => void }) {
  const rid = Number(round.round_id);
  const modes = roundTileModes(rid).tileModes;
  const wt = round.winning_tile;
  const resultMode: TileMode | null = wt == null ? null : round.is_split ? "split" : "solo";

  return (
    <div className={`overflow-hidden rounded-xl border bg-ink-800/40 transition-colors ${open ? "col-span-full border-steel/40" : "border-line hover:border-white/15"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-2 px-3 pt-3 text-left">
        <span className="num text-[13px] font-semibold text-white">#{formatNum(rid)}</span>
        <span className="flex items-center gap-2">
          {resultMode ? <ResultBadge mode={resultMode} /> : <span className="text-[11px] text-fog-muted">in progress</span>}
          <span className="text-[11px] text-gray-500">{open ? "▾" : "▸"}</span>
        </span>
      </button>

      {!open && (
        <div className="space-y-2.5 px-3 pb-3 pt-2.5">
          <TileBoard modes={modes} winningTile={wt} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] text-fog-muted">
            <span className="num text-white">{formatSol(lamToSol(round.total_deployed), 2)}</span> SOL
            <span className="num text-white">{round.total_miners != null ? formatNum(Number(round.total_miners)) : "—"}</span> miners
            {wt != null && <span className="ml-auto" style={{ color: WIN }}>win #{wt + 1}</span>}
          </div>
        </div>
      )}

      {open && <RoundDetail round={round} modes={modes} />}
    </div>
  );
}

export function TileModesTab() {
  const [offset, setOffset] = useState(0);
  const [openRound, setOpenRound] = useState<number | null>(null);
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
            <button type="button" onClick={page.refresh} className="rounded border border-amber/40 px-2 py-0.5 hover:border-amber">Retry</button>
          </div>
        ) : rounds.length === 0 ? (
          <div className="font-mono text-sm text-fog-muted">No rounds available yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rounds.map((round) => {
                const rid = Number(round.round_id);
                const open = openRound === rid;
                return <RoundCard key={round.round_id} round={round} open={open} onToggle={() => setOpenRound(open ? null : rid)} />;
              })}
            </div>
            <div className="mt-4">
              <Pager offset={offset} total={v4Total} onPage={(o) => { setOpenRound(null); setOffset(o); }} unit="rounds" loading={page.fetching && !!page.data} />
            </div>
          </>
        )}
      </ChartCard>

      <p className="font-mono text-[12px] text-fog-muted">
        Solo/split assignment is derived from the round id alone, so it&apos;s exact for every round since the v4 cutover (#{formatNum(V4_FIRST_ROUND)}).
      </p>
    </div>
  );
}
