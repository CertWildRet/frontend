# AGENTS.md

Concise rules for coding agents working in this repository.
Detailed guidance lives in [`CLAUDE.md`](./CLAUDE.md).

## Repo

Diamond Pools frontend — Next.js app router, TypeScript, Tailwind. Primary analytics surface: `/stats` (ORE on-chain data via `src/lib/oreStats.ts` and `/api/analytics/*`).

## UI label casing

Use **Title Case** for visible UI keys and labels. Do not leave multi-word chart keys, badges, or stat rows in all-lowercase.

**Applies to:** chart legend props (`aName`, `bName`, `barName`, `lineName`, `band.name`, `refLine.name`), compact stat rows above charts, header pills/badges, segmented-control labels, table chips, and short `StatTile` hints.

**Does not apply to:** long `titleInfo` tooltip paragraphs, footnote prose, or API/JSON field names.

**Rules:**

1. Capitalize each major word (`Refining Avg`, `Pop Premium`, `Market Open`).
2. Preserve tickers and acronyms: ORE, SOL, APR, ROI, EV, UTC, stORE.
3. When several stats sit inline on one row, separate them with `·` so they do not run together on narrow layouts.
4. When touching `/stats`, sweep sibling labels in the same card/chart for the same pattern.

**Examples:**

| Avoid | Prefer |
| --- | --- |
| `refining avg` / `staking avg` / `carry avg` | `Refining Avg` · `Staking Avg` · `Carry Avg` |
| `market (ORE/SOL)` / `production cost` / `EV now` | `Market (ORE/SOL)` / `Production Cost` / `EV Now` |
| `won` / `split` / `solo ORE` / `in progress` | `Won` / `Split` / `Solo ORE` / `In Progress` |
| `by wallets` / `minted / day` | `By Wallets` / `Minted / Day` |

See the “UI label casing” section in [`CLAUDE.md`](./CLAUDE.md) for scope notes and file pointers.
