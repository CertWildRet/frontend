# Migrate orestack-landing sections into frontend

Work continues on `feat/nav-items-and-logo-tracking` (nav links already point at these routes). Source components come from `/Users/kwokfaywilliamdeng/orestack-landing`; UI is **rebuilt** with this repo's primitives and styling (not the 4.4k-line `styles.css`).

## Shared infrastructure (build first)

### 1. Backend proxy for the orestack Rust API
- New route `src/app/api/orestack/[...path]/route.ts`, cloned from the existing `/api/analytics/[...path]` proxy pattern.
- Upstream from `ORESTACK_API_URL` env (server-side; no CORS issues). Used by `/diamond-miners` (`/api/leaderboard`) and `/bags` (`POST /api/miner-names`) — so allow GET + POST.
- New lib `src/lib/orestack.ts`: base-URL helper (browser → `/api/orestack`, SSR → upstream), mirroring `src/lib/analytics.ts`.

### 2. Env vars (`.env.local` + document in README)
- `ORESTACK_API_URL` — Rust backend base
- `NEXT_PUBLIC_SANITY_TOKEN` — optional (News)
- `NEXT_PUBLIC_JUPITER_API_BASE` / `NEXT_PUBLIC_JUPITER_API_KEY` — optional (Swap)
- All `import.meta.env.VITE_*` reads become `process.env.NEXT_PUBLIC_*`.

### 3. Page scaffold convention
Each new route follows the `/stats` template: thin server `page.tsx` + client component(s), module CSS hero (copy `.page`/`.hero`/`.titleAccent` pattern from `src/app/stats/stats.module.css`), content in `ChartCard` from `src/components/stats/Charts.tsx`.

## Pages (easiest → hardest)

### /automine — coming-soon stub
- Single client-less page styled like the profile CTA card (`ChartCard` + hero). Copy explains automining is coming; links to Discord. Full Mine migration is a separate follow-up phase.

### /calc — pure client math
- Port `lib/ore-calculators.ts` from source **as-is** (pure functions, no env/network) to `src/lib/oreCalculators.ts`.
- New client page `src/app/calc/` rebuilding the calculators UI: `SegmentedControl` for tabs (Solo Chance, SOL Rewards, ORE Rewards, Motherlode, Unrefined Yield), `StatTile`/`StatRow` for outputs, existing `Bars`/`HBars` for the projection chart instead of DIY CSS bars.
- Keep the hardcoded APY/APR constants but lift them to the top of the lib.

### /news — Sanity CMS
- Port `src/lib/sanity.ts` (GROQ fetch helpers, image CDN URLs) to `src/lib/sanity.ts`; swap env access.
- **Server-render** the feed: `src/app/news/page.tsx` fetches the article list server-side with `next: { revalidate: 300 }` (no client hook needed).
- Article detail becomes a real route `src/app/news/[slug]/page.tsx` (better than the source's client-state detail) with the ported portable-text renderer.
- Cards styled with `.glass`/`spectralEdge` chrome; images via `next/image` with Sanity CDN `remotePatterns` added to `next.config.js`.

### /diamond-miners — Our Miners leaderboard
- Port `lib/leaderboard.ts` types + `fetchLeaderboard` to `src/lib/leaderboard.ts`, pointed at the new `/api/orestack` proxy.
- Client page rebuilds: podium (top 3) as three `StatTile`-style glass cards, then the ranked table reusing the exact table classes from `src/app/stats/page.tsx` miners table (`tableWrap`/`theadRow` pattern) + `CopyAddress`, pagination (25/page), `RowsSkeleton` while loading via `usePolled`.

### /swap — Jupiter
- Port `hooks/useJupiterSwap.ts`, `hooks/useTokenBalance.ts`, `lib/swap/{jupiter-order,swap-tokens,format-token}.ts` nearly verbatim (client-only; wallet comes from this repo's existing `Providers`/`useWallet`).
- New client page: single centered glass `ChartCard` with the from/to token panel, flip button, Max, quote refresh (15s), status states from `SwapStatus`. Toasts via existing `ToastProvider`.
- Token balance reads go through the existing `/api/rpc` proxy connection (already wired in `Providers`).

### /bags — wallet portfolio (most porting risk)
- Port `mining/hooks/useAllMiners.ts`, `mining/hooks/useAccountData.ts`, `hooks/useOrePrice.ts`, and the miner-names client (via the orestack proxy).
- **Dependency**: `useAccountData` decodes accounts via the vendored `evore-sdk` (`file:deps/evore-sdk` in the source repo). Copy the needed decode logic (or the package into `deps/`) — decide during implementation based on how much of the SDK is actually used; prefer extracting just the account-layout decoding to `src/lib/evore.ts`.
- Client page, wallet-gated like `/profile`: connect prompt → tabs (Orestack / Minemore legacy) via `TabBar`, expandable per-miner rows (reuse the drawer pattern from `WalletAnalytics.tsx`), USD summary strip via Jupiter price.

## Nav cleanup
- `src/lib/nav.ts` labels already match; no changes needed unless we want `/automine` marked "soon".

## Verification
1. `npm run typecheck`
2. Dev server: visit all six routes; test Swap quote + Bags with a connected wallet; confirm News list/detail renders and leaderboard paginates against the live backend (`ORESTACK_API_URL` must be set — confirm the deployed backend URL with you at implementation time).
3. Mobile pass: each page under 640px.

## Implementation todos
- [ ] Add /api/orestack proxy route + src/lib/orestack.ts base-URL helper
- [ ] Create /automine coming-soon page
- [ ] Port ore-calculators lib + build /calc page with SegmentedControl and StatTiles
- [ ] Port sanity lib; build /news server-rendered feed + /news/[slug] detail
- [ ] Port leaderboard client; build /diamond-miners podium + table page
- [ ] Port Jupiter swap hooks/libs; build /swap page
- [ ] Port portfolio hooks (evore decode, prices, names); build /bags wallet-gated page
- [ ] Typecheck + manual pass on all six routes incl. mobile
