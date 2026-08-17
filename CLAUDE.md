# CLAUDE.md

Operational guidance for Claude and other agents in this repo.
Concise cross-agent rules: [`AGENTS.md`](./AGENTS.md).

## Repo overview

- **App:** Diamond Pools (`cwr-frontend`) — pooled ORE mining UI + `/stats` analytics
- **Stack:** Next.js (app router), TypeScript, Tailwind
- **Stats data:** `src/lib/oreStats.ts`, hooks in `src/hooks/useOreStats.ts`, charts in `src/components/stats/`
- **Local dev:** `npm install && npm run dev` (see [`README.md`](./README.md))

## UI label casing

`/stats` and chart components expose many short keys in tight layouts (legends, pills, inline averages). **All visible UI keys must use Title Case**, not sentence case or all-lowercase.

### In scope

- Chart legend strings passed to `DualLine`, `BarsLine`, `CostEvChart`, `PopBars`, etc.
- Compact summary rows (e.g. Yields card averages above a chart)
- Header `right` pills (`Pop Premium`, `Corr`, `Now`, `EV Now`)
- Badges and chips (`Won`, `Split`, `Solo ORE`)
- Segmented controls and sort labels (`Any`, `All`, `By Wallets`, `Winners First`)
- Short `StatTile` / `emptyText` strings that read as labels

### Out of scope

- Long `titleInfo` explainer paragraphs on `ChartCard` (sentence case is fine)
- Table body copy and multi-sentence footnotes
- Wire-format / API field names (`refining_apr`, `prod_cost_sol`, etc.)

### Conventions

1. **Title Case** each major word: `Refining Avg`, `Motherlode Pool (ORE)`, `Long-Run Average Pop`.
2. **Keep tickers/acronyms** as-is: ORE, SOL, APR, ROI, EV, UTC, stORE, ML.
3. **Inline stat rows:** use middle-dot separators between items (`Refining Avg 49.5% · Staking Avg 17.9% · Carry Avg +31.6%`) — `gap-x` alone is not enough on narrow viewports.
4. **Sweep the neighborhood:** editing one lowercase label in a chart card usually means updating sibling legends, badges, and hints in that same card.

### Reference implementation

Commit `baf62db` (`fix(stats): title-case chart labels and legend keys`) — search those files when adding new charts or stat rows:

- `src/app/stats/TrendsTab.tsx` — Yields averages, motherlode pop legend, dominance pill
- `src/components/stats/TrendCharts.tsx` — production-cost chart legend
- `src/app/stats/EcosystemTab.tsx`, `CohortTab.tsx`, `RoundsTab.tsx`, `TileModesTab.tsx`, `MinerRankingsTab.tsx`, `minersShared.tsx`
- `src/components/stats/MinerDetail.tsx`, `RwaTab.tsx`

### Quick checklist before shipping UI

- [ ] No new all-lowercase multi-word legend or badge strings
- [ ] Compact stat rows use `·` between items when three or more inline values
- [ ] Acronyms/tickers unchanged
- [ ] `titleInfo` tooltips unchanged unless the user asked for copy edits
