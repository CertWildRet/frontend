"use client";

/**
 * Solo / Split tab — the v4 per-tile reward mask (10 solo ✦ / 15 split) for the
 * most recent 20 rounds, shown as a responsive card gallery. The mask is pure
 * (keccak + Fisher–Yates from round id); the round list, per-tile SOL, winning
 * tile and outcome come from live Board/Round PDAs (same source hawg uses).
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChartCard } from "@/components/stats/Charts";
import { RowsSkeleton } from "@/components/primitives/Skeleton";
import {
  recentRoundTileModes, soloSplitDeployStats,
  type RoundTileModes, type TileMode, type SoloSplitDeployStats,
} from "@/lib/distributionMask";
import { fetchBoardRoundId, fetchOnchainRoundTiles, type OnchainRoundTiles } from "@/lib/oreRoundOnchain";
import { useReadonlyRpc } from "@/hooks/useReadonlyRpc";
import { formatNum, formatSol, formatPct } from "@/lib/format";

const WINDOW = 20;
const BOARD_POLL_MS = 30_000;
const WIN = "#FF5AC8"; // winning-tile highlight
const SPLIT_SENTINEL = "SpLiT1111111111111111111111111111111111111";

// Categorical solo/split palette — validated (dataviz): worst-adjacent CVD ΔE 32,
// contrast + lightness pass on the dark surface. `rgb` = the fill mark, `ink` = the
// legible text tint on dark.
const MODE: Record<TileMode, { rgb: string; ink: string; label: string }> = {
  solo: { rgb: "251,191,36", ink: "#FDE08A", label: "Solo" }, // gold — stays clean (not brown) when darkened at low alpha
  split: { rgb: "59,130,246", ink: "#93C5FD", label: "Split" },
};

const shortKey = (a?: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "·");
const isSplitWinner = (topMiner?: string | null) => topMiner?.startsWith(SPLIT_SENTINEL) ?? false;

/** The 25-tile mask. Solo carries the ✦; the winning tile gets a pink ring. */
function TileBoard({
  modes,
  winningTile,
  size = "sm",
}: {
  modes: TileMode[];
  winningTile?: number | null;
  size?: "sm" | "lg";
}) {
  const txt = size === "lg" ? "text-[11px] sm:text-[13px]" : "text-[10px]";
  const star = size === "lg" ? "text-[9px] sm:text-[11px]" : "text-[8px]";
  return (
    <div className={`grid grid-cols-5 ${size === "lg" ? "gap-1.5" : "gap-1"}`} role="img" aria-label="25-tile solo/split board">
      {modes.map((mode, i) => {
        const m = MODE[mode];
        const won = winningTile === i;
        return (
          <div
            key={i}
            title={`Tile ${i + 1}: ${m.label}${won ? " · winning tile" : ""}`}
            className={`relative flex aspect-square items-center justify-center rounded-[4px] border font-mono font-semibold leading-none ${txt}`}
            style={{
              background: `rgba(${m.rgb},0.14)`,
              borderColor: won ? WIN : `rgba(${m.rgb},0.62)`,
              boxShadow: won ? `0 0 0 1px ${WIN}, 0 0 12px -3px ${WIN}` : undefined,
              color: won ? "#fff" : m.ink,
            }}
          >
            {mode === "solo" && (
              <span
                className={`pointer-events-none absolute right-[2px] top-[1px] leading-none ${star}`}
                style={{ color: won ? "#fff" : m.ink }}
                aria-hidden
              >
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

/** Slim solo-vs-split share bar (fraction of deployed SOL on each tile mode). */
function BiasBar({ stats }: { stats: SoloSplitDeployStats }) {
  const solo = Math.max(0, Math.min(1, stats.soloShare));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between font-mono text-[11px]">
        <span style={{ color: MODE.solo.ink }}>Solo {formatPct(stats.soloShare, 0)}</span>
        <span className="text-fog-muted">deploy split</span>
        <span style={{ color: MODE.split.ink }}>{formatPct(stats.splitShare, 0)} Split</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div style={{ width: `${solo * 100}%`, background: `rgb(${MODE.solo.rgb})` }} />
        <div style={{ width: `${(1 - solo) * 100}%`, background: `rgb(${MODE.split.rgb})` }} />
      </div>
    </div>
  );
}

/** Avg SOL/tile for solo vs split — where the money actually leaned. */
function AvgStrip({ stats }: { stats: SoloSplitDeployStats }) {
  const maxAvg = Math.max(stats.soloAvgSol, stats.splitAvgSol, 1e-9);
  const rows: Array<{ label: string; ink: string; rgb: string; avg: number }> = [
    { label: "Solo", ink: MODE.solo.ink, rgb: MODE.solo.rgb, avg: stats.soloAvgSol },
    { label: "Split", ink: MODE.split.ink, rgb: MODE.split.rgb, avg: stats.splitAvgSol },
  ];
  return (
    <div className="space-y-1.5 font-mono text-[12px]">
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

/** The expanded round — a proper detail panel: outcome, deploy stats, per-tile
 *  SOL heat, plus a jump into the full Rounds view. */
function RoundDetail({
  row,
  tiles,
  error,
  loading,
  onRetry,
}: {
  row: RoundTileModes;
  tiles: OnchainRoundTiles | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
}) {
  const roundsHref = `/stats?section=rounds`;
  const jump = (
    <Link href={roundsHref} className="inline-flex items-center gap-1 font-mono text-[12px] text-steel transition-colors hover:text-white">
      Open in Rounds <span aria-hidden>↗</span>
    </Link>
  );

  if (loading && !tiles) return <div className="border-t border-line px-3 py-4 text-[12px] text-fog-muted">Loading on-chain tile deploys…</div>;
  if (error && !tiles) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-3 py-4 font-mono text-[12px] text-amber">
        <span>{error}</span>
        <button type="button" onClick={onRetry} className="rounded border border-amber/40 px-2 py-0.5 hover:border-amber">Retry</button>
      </div>
    );
  }
  if (!tiles || tiles.missing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3 py-4 text-[12px] text-fog-muted">
        <span>Round PDA reclaimed (~24h after close). Pick a more recent round.</span>
        {jump}
      </div>
    );
  }

  const hasData = tiles.perTileSol.some((v) => v > 0);
  const stats = hasData ? soloSplitDeployStats(row.tileModes, tiles.perTileSol) : null;
  const wt = tiles.winningTile;
  const splitWin = isSplitWinner(tiles.topMiner);
  const resultMode: TileMode | null = wt == null ? null : splitWin ? "split" : "solo";

  return (
    <div className="space-y-4 border-t border-line px-3 py-4 sm:px-4">
      {/* round summary — the "details like Rounds" the header hints at */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="Result">{resultMode ? <ResultBadge mode={resultMode} /> : <span className="text-fog-muted">in progress</span>}</Stat>
        <Stat label="Deployed">{formatSol(tiles.totalDeployedSol, 2)} <span className="text-fog-muted">SOL</span></Stat>
        <Stat label="Miners">{formatNum(tiles.totalMiners)}</Stat>
        <Stat label="Winning tile">
          {wt != null ? <span style={{ color: WIN }}>#{wt + 1}{resultMode === "solo" ? " ✦" : ""}</span> : <span className="text-fog-muted">—</span>}
        </Stat>
      </div>

      {wt != null && (
        <p className="font-mono text-[12px] leading-snug text-fog-muted">
          {splitWin ? (
            <>Split tile won — the ~1 ORE base is <span className="text-white">shared pro-rata</span> across the winning tile&apos;s stakers.</>
          ) : (
            <>Solo tile won — the full <span className="text-white">~1 ORE</span> goes to <span className="text-white">{shortKey(tiles.topMiner)}</span>.</>
          )}
        </p>
      )}

      {hasData ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
          <div className="w-full max-w-md">
            <DeployHeatBoard modes={row.tileModes} perTileSol={tiles.perTileSol} perTileCount={tiles.perTileCount} winningTile={wt} />
            <p className="mt-1.5 font-mono text-[11px] leading-snug text-fog-muted">Cell hue = solo/split · intensity = SOL deployed.</p>
          </div>
          {stats && <AvgStrip stats={stats} />}
        </div>
      ) : (
        <div className="text-[12px] text-fog-muted">No SOL deployed on this round yet.</div>
      )}

      <div className="flex justify-end pt-1">{jump}</div>
    </div>
  );
}

/** One round as a card: header (id + outcome), the mask board (winning tile ringed),
 *  the deploy-split bar; tap to expand into RoundDetail (spans the full grid row). */
function RoundCard({ row, open, onToggle }: { row: RoundTileModes; open: boolean; onToggle: () => void }) {
  const connection = useReadonlyRpc();
  const [tiles, setTiles] = useState<OnchainRoundTiles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTiles(await fetchOnchainRoundTiles(connection, row.roundId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTiles(null);
    } finally {
      setLoading(false);
    }
  }, [connection, row.roundId]);

  useEffect(() => { void load(); }, [load]);

  const live = tiles && !tiles.missing ? tiles : null;
  const winningTile = live?.winningTile ?? null;
  const resultMode: TileMode | null = winningTile == null ? null : isSplitWinner(live?.topMiner) ? "split" : "solo";
  const stats = live && live.perTileSol.some((v) => v > 0) ? soloSplitDeployStats(row.tileModes, live.perTileSol) : null;

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-ink-800/40 transition-colors ${open ? "col-span-full border-steel/40" : "border-line hover:border-white/15"}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 pt-3 text-left"
      >
        <span className="num text-[13px] font-semibold text-white">#{formatNum(row.roundId)}</span>
        <span className="flex items-center gap-2">
          {resultMode ? <ResultBadge mode={resultMode} /> : loading ? <span className="text-[11px] text-fog-muted">···</span> : <span className="text-[11px] text-fog-muted">live</span>}
          <span className="text-[11px] text-gray-500">{open ? "▾" : "▸"}</span>
        </span>
      </button>

      {!open && (
        <div className="space-y-2.5 px-3 pb-3 pt-2.5">
          <TileBoard modes={row.tileModes} winningTile={winningTile} />
          {stats ? (
            <BiasBar stats={stats} />
          ) : loading ? (
            <div className="h-6 animate-pulse rounded bg-white/[0.04]" />
          ) : (
            <div className="font-mono text-[11px] text-fog-muted">No deploys read yet.</div>
          )}
        </div>
      )}

      {open && <RoundDetail row={row} tiles={tiles} error={error} loading={loading} onRetry={() => void load()} />}
    </div>
  );
}

export function TileModesTab() {
  const connection = useReadonlyRpc();
  const [openRound, setOpenRound] = useState<number | null>(null);
  const [latest, setLatest] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBoard = useCallback(async () => {
    try {
      setLatest(await fetchBoardRoundId(connection));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    void refreshBoard();
    const t = setInterval(() => { void refreshBoard(); }, BOARD_POLL_MS);
    return () => clearInterval(t);
  }, [refreshBoard]);

  const rows = latest != null ? recentRoundTileModes(latest, WINDOW) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[13px] text-fog-muted">
        <span>
          {latest != null
            ? `v4 solo/split mask for the last ${formatNum(rows.length)} rounds (through #${formatNum(latest)}). Tap a round for per-tile SOL + the outcome.`
            : loading
              ? "Loading live board…"
              : "Could not read ORE board."}
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: `rgba(${MODE.solo.rgb},0.18)`, borderColor: `rgba(${MODE.solo.rgb},0.5)` }} />
            <span style={{ color: MODE.solo.ink }}>Solo ✦ · 10</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: `rgba(${MODE.split.rgb},0.18)`, borderColor: `rgba(${MODE.split.rgb},0.5)` }} />
            <span style={{ color: MODE.split.ink }}>Split · 15</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ boxShadow: `0 0 0 1px ${WIN}` }} />
            <span style={{ color: WIN }}>won</span>
          </span>
        </span>
      </div>

      <ChartCard title="Solo / Split by round" subtitle="Mask is derived from the round id (keccak + Fisher–Yates); tile SOL, winning square + outcome from the live Round PDA (matches hawg).">
        {loading && latest == null ? (
          <RowsSkeleton rows={6} />
        ) : error && latest == null ? (
          <div className="flex flex-wrap items-center gap-3 font-mono text-sm text-amber">
            <span>{error}</span>
            <button type="button" onClick={() => void refreshBoard()} className="rounded border border-amber/40 px-2 py-0.5 hover:border-amber">Retry</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="font-mono text-sm text-fog-muted">No rounds available yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => {
              const open = openRound === row.roundId;
              return <RoundCard key={row.roundId} row={row} open={open} onToggle={() => setOpenRound(open ? null : row.roundId)} />;
            })}
          </div>
        )}
      </ChartCard>

      <p className="font-mono text-[12px] text-fog-muted">
        Live from ORE Board/Round PDAs via RPC · round accounts are reclaimed ~24h after close.
      </p>
    </div>
  );
}
