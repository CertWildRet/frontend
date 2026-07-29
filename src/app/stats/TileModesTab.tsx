"use client";

/**
 * Tile Modes tab — solo vs split ORE payout for the most recent 20 rounds.
 * Mask is a pure function of round_id (keccak + Fisher–Yates), matching upstream
 * ore_api and orestack GET /api/rounds/{id}/tile-modes.
 */
import { ChartCard } from "@/components/stats/Charts";
import { RowsSkeleton } from "@/components/primitives/Skeleton";
import { usePolled } from "@/hooks/useOreStats";
import { fetchOreSummary } from "@/lib/oreStats";
import { recentRoundTileModes, type RoundTileModes, type TileMode } from "@/lib/distributionMask";
import { formatNum } from "@/lib/format";
import { CHART } from "@/lib/chartColors";
import { Caveats, tableWrap, theadRow, th, td, bodyRow } from "./shared";

const WINDOW = 20;

const MODE_STYLE: Record<TileMode, { bg: string; fg: string; label: string }> = {
  solo: { bg: "rgba(232,136,26,0.28)", fg: CHART.amber, label: "Solo" },
  split: { bg: "rgba(91,108,255,0.22)", fg: CHART.blue, label: "Split" },
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
            style={{ background: s.bg, color: s.fg }}
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

function RoundRow({ row }: { row: RoundTileModes }) {
  return (
    <tr className={bodyRow}>
      <td className={`${td} whitespace-nowrap text-white`}>#{formatNum(row.roundId)}</td>
      <td className={`${td} w-[9.5rem] sm:w-[11rem]`}>
        <TileBoard modes={row.tileModes} />
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
  );
}

export function TileModesTab() {
  const summary = usePolled(() => fetchOreSummary(), 60_000);
  const latest = summary.data?.latest_round?.round_id ?? null;
  const rows = latest != null ? recentRoundTileModes(Number(latest), WINDOW) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[13px] text-fog-muted">
        <span>
          {latest != null
            ? `Official solo/split mask for the last ${formatNum(rows.length)} rounds (through #${formatNum(Number(latest))}).`
            : "Loading latest round…"}
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: MODE_STYLE.solo.bg }} />
            <span style={{ color: CHART.amber }}>Solo · 10 tiles</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: MODE_STYLE.split.bg }} />
            <span style={{ color: CHART.blue }}>Split · 15 tiles</span>
          </span>
        </span>
      </div>

      <ChartCard
        title="Solo / Split by round"
        subtitle="Deterministic from round id (keccak + Fisher–Yates). Bit set = solo ORE; bit clear = split among winning-tile miners."
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
                {rows.map((row) => (
                  <RoundRow key={row.roundId} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <Caveats provenance={summary.provenance} error={summary.error} onRetry={summary.refresh} />
    </div>
  );
}
