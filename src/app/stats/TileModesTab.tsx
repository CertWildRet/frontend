"use client";

/**
 * Tile Modes tab — solo vs split ORE payout for the most recent 20 rounds.
 * Mask is pure (keccak + Fisher–Yates). Round list + per-tile SOL come from
 * live Board/Round PDAs (same source hawg uses), not lagged analytics.
 */
import { Fragment, useCallback, useEffect, useState } from "react";
import { ChartCard } from "@/components/stats/Charts";
import { RowsSkeleton } from "@/components/primitives/Skeleton";
import {
  recentRoundTileModes, soloSplitDeployStats, SOLO_TILE_SHARE,
  type RoundTileModes, type TileMode, type SoloSplitDeployStats,
} from "@/lib/distributionMask";
import { fetchBoardRoundId, fetchOnchainRoundTiles, type OnchainRoundTiles } from "@/lib/oreRoundOnchain";
import { useReadonlyRpc } from "@/hooks/useReadonlyRpc";
import { formatNum, formatSol, formatPct } from "@/lib/format";
import { CHART } from "@/lib/chartColors";
import { tableWrap, theadRow, th, td, bodyRow } from "./shared";

const WINDOW = 20;
const BOARD_POLL_MS = 30_000;

const MODE_STYLE: Record<TileMode, { fill: string; fg: string; label: string }> = {
  solo: { fill: "232,136,26", fg: CHART.amber, label: "Solo" },
  split: { fill: "91,108,255", fg: CHART.blue, label: "Split" },
};

function TileBoard({ modes }: { modes: TileMode[] }) {
  return (
    <div
      className="grid grid-cols-5 gap-0.5"
      role="img"
      aria-label="25-tile solo/split board"
    >
      {modes.map((mode, i) => {
        const s = MODE_STYLE[mode];
        return (
          <div
            key={i}
            title={`Tile ${i + 1}: ${s.label}`}
            className="relative flex aspect-square items-center justify-center rounded-[3px] font-mono text-[9px] leading-none sm:text-[10px]"
            style={{ background: `rgba(${s.fill},0.28)`, color: s.fg }}
          >
            {/* solo tiles carry the four-point star, matching the on-chain board convention */}
            {mode === "solo" && (
              <span
                className="pointer-events-none absolute right-[1px] top-[1px] text-[7px] leading-none sm:text-[8px]"
                style={{ color: MODE_STYLE.solo.fg }}
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

/** Compact avg-SOL/tile strip — density when totals are close. */
function AvgStrip({ stats, compact = false }: { stats: SoloSplitDeployStats; compact?: boolean }) {
  const maxAvg = Math.max(stats.soloAvgSol, stats.splitAvgSol, 1e-9);
  const soloW = Math.max(4, (stats.soloAvgSol / maxAvg) * 100);
  const splitW = Math.max(4, (stats.splitAvgSol / maxAvg) * 100);
  const label = compact ? "text-[10px]" : "text-[12px]";
  const bar = compact ? "h-1" : "h-1.5";
  const numW = compact ? "w-[3.75rem]" : "w-[4.5rem]";
  return (
    <div className={`flex flex-col gap-1 font-mono ${label}`}>
      {!compact && <div className="text-fog-muted">Avg SOL / tile</div>}
      <div className={`grid gap-1 ${compact ? "" : "gap-1.5 sm:grid-cols-2"}`}>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="w-8 shrink-0 sm:w-10" style={{ color: CHART.amber }}>Solo</span>
          <div className={`${bar} min-w-0 flex-1 rounded-full bg-white/[0.06]`}>
            <div className="h-full rounded-full" style={{ width: `${soloW}%`, background: CHART.amber }} />
          </div>
          <span className={`num ${numW} shrink-0 text-right text-white`}>
            {formatSol(stats.soloAvgSol, compact ? 3 : 4)}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="w-8 shrink-0 sm:w-10" style={{ color: CHART.blue }}>Split</span>
          <div className={`${bar} min-w-0 flex-1 rounded-full bg-white/[0.06]`}>
            <div className="h-full rounded-full" style={{ width: `${splitW}%`, background: CHART.blue }} />
          </div>
          <span className={`num ${numW} shrink-0 text-right text-white`}>
            {formatSol(stats.splitAvgSol, compact ? 3 : 4)}
          </span>
        </div>
      </div>
    </div>
  );
}

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
    <div
      className="grid grid-cols-5 gap-1 sm:gap-1.5"
      role="img"
      aria-label="Per-tile SOL deploy board"
    >
      {modes.map((mode, i) => {
        const sol = perTileSol[i] ?? 0;
        const count = perTileCount[i] ?? 0;
        const intensity = sol / maxSol;
        const s = MODE_STYLE[mode];
        const won = winningTile === i;
        const alpha = (0.12 + intensity * 0.55).toFixed(3);
        return (
          <div
            key={i}
            title={`Tile ${i + 1}: ${s.label} · ${formatSol(sol, 4)} SOL · ${count} miners`}
            className={`relative flex aspect-square flex-col items-center justify-center rounded-md border-2 px-0.5 font-mono ${
              won ? "" : "border-transparent"
            }`}
            style={{
              borderColor: won ? CHART.pink : undefined,
              boxShadow: won
                ? `0 0 14px -2px ${CHART.pink}99, 0 0 0 1px ${CHART.violet}66`
                : undefined,
              background: won
                ? `rgba(255,90,200,${(0.28 + intensity * 0.4).toFixed(3)})`
                : `rgba(${s.fill},${alpha})`,
              color: won || intensity > 0.55 ? "#fff" : s.fg,
            }}
          >
            <span className="absolute left-1 top-0.5 text-[9px] text-white/45 sm:left-1.5 sm:top-1 sm:text-[10px]">
              #{i + 1}
              {mode === "solo" && (
                <span className="ml-0.5" style={{ color: MODE_STYLE.solo.fg }} aria-hidden>✦</span>
              )}
            </span>
            {won && (
              <span
                className="absolute right-1 top-0.5 text-[8px] font-bold sm:right-1.5 sm:top-1 sm:text-[9px]"
                style={{ color: CHART.pink }}
              >
                win
              </span>
            )}
            <span className="num text-[10px] leading-none sm:text-[11px]">
              {formatSol(sol, 4)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BiasHeadline({ stats }: { stats: SoloSplitDeployStats }) {
  const bias = stats.biasVsTileShare;
  const lean =
    Math.abs(bias) < 0.005
      ? "roughly even vs tile share"
      : bias > 0
        ? `overweight solos by ${formatPct(bias, 1)} vs ${formatPct(SOLO_TILE_SHARE, 0)} tile share`
        : `overweight splits by ${formatPct(-bias, 1)} vs ${formatPct(1 - SOLO_TILE_SHARE, 0)} tile share`;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[13px]">
        <span>
          <span style={{ color: CHART.amber }}>Solo</span>{" "}
          <span className="text-white">{formatPct(stats.soloShare, 1)}</span>
          <span className="text-fog-muted"> · {formatSol(stats.soloSol, 3)} SOL</span>
        </span>
        <span>
          <span style={{ color: CHART.blue }}>Split</span>{" "}
          <span className="text-white">{formatPct(stats.splitShare, 1)}</span>
          <span className="text-fog-muted"> · {formatSol(stats.splitSol, 3)} SOL</span>
        </span>
        <span className="text-fog-muted">total {formatSol(stats.totalSol, 3)} SOL</span>
      </div>
      <div className="font-mono text-[12px] text-fog-muted">{lean}</div>
    </div>
  );
}

function shortKey(a?: string | null) {
  return a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "·";
}

function RoundDeployDrilldown({
  modes,
  tiles,
  error,
  loading,
  onRetry,
}: {
  modes: RoundTileModes;
  tiles: OnchainRoundTiles | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
}) {
  if (loading && !tiles) {
    return <div className="px-3 py-4 text-[12px] text-gray-400">Loading on-chain tile deploys…</div>;
  }
  if (error && !tiles) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-3 py-4 font-mono text-[12px] text-amber">
        <span>{error}</span>
        <button type="button" onClick={onRetry} className="rounded border border-amber/40 px-2 py-0.5 hover:border-amber">
          Retry
        </button>
      </div>
    );
  }
  if (!tiles || tiles.missing) {
    return (
      <div className="px-3 py-4 text-[12px] text-gray-400">
        Round PDA no longer on-chain (accounts are reclaimed ~24h after close). Pick a more recent round.
      </div>
    );
  }

  const hasData = tiles.perTileSol.some((v) => v > 0);
  if (!hasData) {
    return <div className="px-3 py-4 text-[12px] text-gray-400">No SOL deployed on this round yet.</div>;
  }

  const stats = soloSplitDeployStats(modes.tileModes, tiles.perTileSol);
  const winningTile = tiles.winningTile;
  const splitWinner = tiles.topMiner?.startsWith("SpLiT1111111111111111111111111111111111111") ?? false;

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-fog-muted">
        <span>
          Deployed{" "}
          <span className="text-white">{formatSol(tiles.totalDeployedSol, 3)} SOL</span>
        </span>
        {winningTile != null && (
          <span>
            Win{" "}
            <span className="font-bold" style={{ color: CHART.pink }}>#{winningTile + 1}</span>
            {tiles.topMiner && !splitWinner && (
              <> · {shortKey(tiles.topMiner)}</>
            )}
            {splitWinner && <> · split ORE</>}
          </span>
        )}
        {tiles.totalMiners > 0 && (
          <span>{formatNum(tiles.totalMiners)} miners</span>
        )}
      </div>
      <BiasHeadline stats={stats} />
      <AvgStrip stats={stats} />
      {/* Half-width heat grid on laptop+; full width on phones */}
      <div className="w-full sm:w-1/2 sm:max-w-md">
        <DeployHeatBoard
          modes={modes.tileModes}
          perTileSol={tiles.perTileSol}
          perTileCount={tiles.perTileCount}
          winningTile={winningTile}
        />
      </div>
      <p className="font-mono text-[11px] leading-snug text-fog-muted">
        On-chain Round PDA · cell color = solo/split · intensity = SOL
        {winningTile != null ? ` · winning tile #${winningTile + 1}` : " · round not settled yet"}.
      </p>
    </div>
  );
}

function RoundRow({
  row,
  open,
  onToggle,
}: {
  row: RoundTileModes;
  open: boolean;
  onToggle: () => void;
}) {
  const connection = useReadonlyRpc();
  const [tiles, setTiles] = useState<OnchainRoundTiles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchOnchainRoundTiles(connection, row.roundId);
      setTiles(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTiles(null);
    } finally {
      setLoading(false);
    }
  }, [connection, row.roundId]);

  useEffect(() => { void load(); }, [load]);

  const collapsedStats =
    tiles && !tiles.missing && tiles.perTileSol.some((v) => v > 0)
      ? soloSplitDeployStats(row.tileModes, tiles.perTileSol)
      : null;

  return (
    <Fragment>
      <tr className={`${bodyRow} cursor-pointer`} onClick={onToggle}>
        <td className={`${td} whitespace-nowrap align-top text-white`}>
          <span className="inline-flex items-center gap-1 pt-0.5">
            <span className="inline-block w-[9px] text-gray-500">{open ? "▾" : "▸"}</span>
            #{formatNum(row.roundId)}
          </span>
        </td>
        <td className={`${td} w-[11rem] align-top sm:w-[14rem]`}>
          <div
            aria-hidden={open}
            className={`origin-left space-y-2 overflow-hidden transition-[opacity,transform,max-height] duration-300 ease-out ${
              open
                ? "pointer-events-none max-h-0 scale-95 opacity-0"
                : "max-h-40 scale-100 opacity-100"
            }`}
          >
            <TileBoard modes={row.tileModes} />
            {collapsedStats ? (
              <AvgStrip stats={collapsedStats} compact />
            ) : loading ? (
              <div className="h-6 animate-pulse rounded bg-white/[0.04]" />
            ) : null}
          </div>
        </td>
        <td className={`${td} align-top`}>
          {collapsedStats ? (
            <span className="num whitespace-nowrap text-[13px]">
              <span style={{ color: CHART.amber }}>{formatPct(collapsedStats.soloShare, 0)}</span>
              <span className="text-fog-muted"> / </span>
              <span style={{ color: CHART.blue }}>{formatPct(collapsedStats.splitShare, 0)}</span>
            </span>
          ) : loading ? (
            <span className="text-fog-muted">···</span>
          ) : (
            <span className="text-fog-muted">—</span>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-black/20">
          <td colSpan={3} className="p-0">
            <div className="w-0 min-w-full">
              <RoundDeployDrilldown
                modes={row}
                tiles={tiles}
                error={error}
                loading={loading}
                onRetry={() => void load()}
              />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
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
      const id = await fetchBoardRoundId(connection);
      setLatest(id);
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[13px] text-fog-muted">
        <span>
          {latest != null
            ? `Official solo/split mask for the last ${formatNum(rows.length)} rounds (through #${formatNum(latest)} on-chain). Tap a round for per-tile SOL.`
            : loading
              ? "Loading live board…"
              : "Could not read ORE board."}
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `rgba(${MODE_STYLE.solo.fill},0.28)` }} />
            <span style={{ color: CHART.amber }}>Solo ✦ · 10 tiles</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `rgba(${MODE_STYLE.split.fill},0.28)` }} />
            <span style={{ color: CHART.blue }}>Split · 15 tiles</span>
          </span>
        </span>
      </div>

      <ChartCard
        title="Solo / Split by round"
        subtitle="Mask from round id; tile SOL + winning square from the live Round PDA (matches hawg)."
      >
        {loading && latest == null ? (
          <RowsSkeleton rows={6} />
        ) : error && latest == null ? (
          <div className="flex flex-wrap items-center gap-3 font-mono text-sm text-amber">
            <span>{error}</span>
            <button type="button" onClick={() => void refreshBoard()} className="rounded border border-amber/40 px-2 py-0.5 hover:border-amber">
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="font-mono text-sm text-fog-muted">No rounds available yet.</div>
        ) : (
          <div className={tableWrap}>
            <table className="w-full font-mono text-[13px]">
              <thead>
                <tr className={theadRow}>
                  <th className={th}>Round</th>
                  <th className={th}>Board</th>
                  <th className={th}>Solo vs split</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const open = openRound === row.roundId;
                  return (
                    <RoundRow
                      key={row.roundId}
                      row={row}
                      open={open}
                      onToggle={() => setOpenRound(open ? null : row.roundId)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <p className="font-mono text-[12px] text-fog-muted">
        Live from ORE Board/Round PDAs via RPC · round accounts are reclaimed ~24h after close.
      </p>
    </div>
  );
}
