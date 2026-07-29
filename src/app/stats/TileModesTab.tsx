"use client";

/**
 * Tile Modes tab — solo vs split ORE payout for the most recent 20 rounds.
 * Mask is a pure function of round_id (keccak + Fisher–Yates). Click a round
 * to load per-tile SOL and see whether deploys lean solo or split.
 */
import { Fragment, useState } from "react";
import { ChartCard } from "@/components/stats/Charts";
import { RowsSkeleton } from "@/components/primitives/Skeleton";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchOreSummary, fetchOreRound, lamportsToSol,
  type OreRoundDetail,
} from "@/lib/oreStats";
import {
  recentRoundTileModes, soloSplitDeployStats, SOLO_TILE_SHARE, TILE_COUNT,
  type RoundTileModes, type TileMode, type SoloSplitDeployStats,
} from "@/lib/distributionMask";
import { formatNum, formatSol, formatPct } from "@/lib/format";
import { CHART } from "@/lib/chartColors";
import { Caveats, tableWrap, theadRow, th, td, bodyRow } from "./shared";

const WINDOW = 20;

const MODE_STYLE: Record<TileMode, { fill: string; glow: string; fg: string; label: string }> = {
  solo: {
    fill: "232,136,26",
    glow: CHART.amber,
    fg: CHART.amber,
    label: "Solo",
  },
  split: {
    fill: "91,108,255",
    glow: CHART.blue,
    fg: CHART.blue,
    label: "Split",
  },
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
            className="flex aspect-square items-center justify-center rounded-[3px] font-mono text-[9px] leading-none sm:text-[10px]"
            style={{ background: `rgba(${s.fill},0.28)`, color: s.fg }}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
}

function fmtTiles(tiles: number[]) {
  return tiles.map((t) => t + 1).join(", ");
}

function tileDeploys(round: OreRoundDetail): { sol: number[]; counts: number[] } {
  const sol: number[] = [];
  const counts: number[] = [];
  for (let i = 0; i < TILE_COUNT; i++) {
    sol.push(lamportsToSol(round[`deployed_${i}`]));
    counts.push(Number(round[`count_${i}`] ?? 0) || 0);
  }
  return { sol, counts };
}

/** Compact avg-SOL/tile strip — density when totals are close. */
function AvgStrip({ stats }: { stats: SoloSplitDeployStats }) {
  const maxAvg = Math.max(stats.soloAvgSol, stats.splitAvgSol, 1e-9);
  const soloW = Math.max(4, (stats.soloAvgSol / maxAvg) * 100);
  const splitW = Math.max(4, (stats.splitAvgSol / maxAvg) * 100);
  return (
    <div className="flex flex-col gap-1.5 font-mono text-[12px]">
      <div className="text-fog-muted">Avg SOL / tile</div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="w-10 shrink-0" style={{ color: CHART.amber }}>Solo</span>
          <div className="h-1.5 min-w-0 flex-1 rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full"
              style={{ width: `${soloW}%`, background: CHART.amber }}
            />
          </div>
          <span className="num w-[4.5rem] shrink-0 text-right text-white">
            {formatSol(stats.soloAvgSol, 3)}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="w-10 shrink-0" style={{ color: CHART.blue }}>Split</span>
          <div className="h-1.5 min-w-0 flex-1 rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full"
              style={{ width: `${splitW}%`, background: CHART.blue }}
            />
          </div>
          <span className="num w-[4.5rem] shrink-0 text-right text-white">
            {formatSol(stats.splitAvgSol, 3)}
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
            className={`relative flex aspect-square flex-col items-center justify-center rounded-md border px-0.5 font-mono ${
              won ? "border-gold/70 shadow-[0_0_10px_-2px_rgba(232,136,26,0.55)]" : "border-transparent"
            }`}
            style={{
              background: `rgba(${s.fill},${alpha})`,
              color: intensity > 0.55 ? "#fff" : s.fg,
            }}
          >
            <span className="absolute left-1 top-0.5 text-[9px] text-white/45 sm:left-1.5 sm:top-1 sm:text-[10px]">
              #{i + 1}
            </span>
            {won && (
              <span className="absolute right-1 top-0.5 text-[8px] text-gold sm:right-1.5 sm:top-1 sm:text-[9px]">
                win
              </span>
            )}
            <span className="num text-[10px] leading-none sm:text-[11px]">
              {formatSol(sol, sol >= 1 ? 2 : 3)}
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
          <span className="text-fog-muted"> · {formatSol(stats.soloSol, 2)} SOL</span>
        </span>
        <span>
          <span style={{ color: CHART.blue }}>Split</span>{" "}
          <span className="text-white">{formatPct(stats.splitShare, 1)}</span>
          <span className="text-fog-muted"> · {formatSol(stats.splitSol, 2)} SOL</span>
        </span>
        <span className="text-fog-muted">total {formatSol(stats.totalSol, 2)} SOL</span>
      </div>
      <div className="font-mono text-[12px] text-fog-muted">{lean}</div>
    </div>
  );
}

function RoundDeployDrilldown({ modes }: { modes: RoundTileModes }) {
  const detail = usePolled(() => fetchOreRound(modes.roundId), 0, [modes.roundId]);
  const round = detail.data?.round ?? null;

  if (detail.loading && !round) {
    return <div className="px-3 py-4 text-[12px] text-gray-400">Loading tile deploys…</div>;
  }
  if (detail.error && !round) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-3 py-4 font-mono text-[12px] text-amber">
        <span>{detail.error}</span>
        <button type="button" onClick={detail.refresh} className="rounded border border-amber/40 px-2 py-0.5 hover:border-amber">
          Retry
        </button>
      </div>
    );
  }
  if (!round) {
    return <div className="px-3 py-4 text-[12px] text-gray-400">No deploy data for this round.</div>;
  }

  const { sol, counts } = tileDeploys(round);
  const hasData = sol.some((v) => v > 0);
  if (!hasData) {
    return <div className="px-3 py-4 text-[12px] text-gray-400">No SOL deployed on this round yet.</div>;
  }

  const stats = soloSplitDeployStats(modes.tileModes, sol);
  const winningTile = round.winning_tile ?? null;

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4">
      <BiasHeadline stats={stats} />
      <AvgStrip stats={stats} />
      <DeployHeatBoard
        modes={modes.tileModes}
        perTileSol={sol}
        perTileCount={counts}
        winningTile={winningTile}
      />
      <p className="font-mono text-[11px] leading-snug text-fog-muted">
        Cell color = solo/split mode; intensity = SOL on that tile.
        {winningTile != null ? ` Winning tile marked #${winningTile + 1}.` : " Round not settled yet."}
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
  return (
    <Fragment>
      <tr className={`${bodyRow} cursor-pointer`} onClick={onToggle}>
        <td className={`${td} whitespace-nowrap text-white`}>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-[9px] text-gray-500">{open ? "▾" : "▸"}</span>
            #{formatNum(row.roundId)}
          </span>
        </td>
        <td className={`${td} w-[9.5rem] sm:w-[11rem]`}>
          <div
            aria-hidden={open}
            className={`origin-left overflow-hidden transition-[opacity,transform,max-height] duration-300 ease-out ${
              open
                ? "pointer-events-none max-h-0 scale-95 opacity-0"
                : "max-h-28 scale-100 opacity-100"
            }`}
          >
            <TileBoard modes={row.tileModes} />
          </div>
        </td>
        <td className={`${td} hidden align-top text-gray-300 sm:table-cell`}>
          <span className="text-[12px]" style={{ color: CHART.amber }}>{fmtTiles(row.soloTiles)}</span>
        </td>
        <td className={`${td} hidden align-top text-gray-300 lg:table-cell`}>
          <span className="text-[12px]" style={{ color: CHART.blue }}>{fmtTiles(row.splitTiles)}</span>
        </td>
        <td className={`${td} num hidden text-right text-fog-muted xl:table-cell`}>
          0x{row.distributionMask.toString(16)}
        </td>
      </tr>
      {open && (
        <tr className="bg-black/20">
          <td colSpan={5} className="p-0">
            <div className="w-0 min-w-full">
              <RoundDeployDrilldown modes={row} />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export function TileModesTab() {
  const [openRound, setOpenRound] = useState<number | null>(null);
  const summary = usePolled(() => fetchOreSummary(), 60_000);
  const latest = summary.data?.latest_round?.round_id ?? null;
  const rows = latest != null ? recentRoundTileModes(Number(latest), WINDOW) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[13px] text-fog-muted">
        <span>
          {latest != null
            ? `Official solo/split mask for the last ${formatNum(rows.length)} rounds (through #${formatNum(Number(latest))}). Tap a round for per-tile SOL.`
            : "Loading latest round…"}
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `rgba(${MODE_STYLE.solo.fill},0.28)` }} />
            <span style={{ color: CHART.amber }}>Solo · 10 tiles</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `rgba(${MODE_STYLE.split.fill},0.28)` }} />
            <span style={{ color: CHART.blue }}>Split · 15 tiles</span>
          </span>
        </span>
      </div>

      <ChartCard
        title="Solo / Split by round"
        subtitle="Deterministic from round id (keccak + Fisher–Yates). Expand a round to compare SOL deployed on solo vs split tiles."
      >
        {summary.loading && !summary.data ? (
          <RowsSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <div className="font-mono text-sm text-fog-muted">No rounds available yet.</div>
        ) : (
          <div className={tableWrap}>
            <table className="w-full font-mono text-[13px]">
              <thead>
                <tr className={theadRow}>
                  <th className={th}>Round</th>
                  <th className={th}>Board</th>
                  <th className={`${th} hidden sm:table-cell`}>Solo tiles</th>
                  <th className={`${th} hidden lg:table-cell`}>Split tiles</th>
                  <th className={`${th} hidden text-right xl:table-cell`}>Mask</th>
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

      <Caveats provenance={summary.provenance} error={summary.error} onRetry={summary.refresh} />
    </div>
  );
}
