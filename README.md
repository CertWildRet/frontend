# Diamond Pools

Pooled, non-custodial ORE mining on Solana. Deposit SOL, mine ORE around the
clock, and let a keeper work the board for you. Funds only ever flow vault to
ORE and back.

## Quick start

```bash
cd cwr-frontend
cp .env.example .env.local
# edit .env.local to point at your brain HTTP server
npm install
npm run dev
# open http://localhost:3000
```

## Local UI design (mock mode)

When you only want to work on the **frontend UI** — layout, styling, motion — and
not wire up a wallet, an RPC endpoint, or the live keeper feed, run the app in
**mock mode**. Every data hook returns realistic placeholder data and **skips all
network calls** (RPC, wallet, SSE), so every screen renders fully populated,
including the wallet-connected states.

Enable it in `.env.local`:

```
NEXT_PUBLIC_MOCK=1
```

Then `npm run dev` and open http://localhost:3000. The home page and the `/crank`
dashboard render with a funded demo pool, an open deposit/claim window, a
live-looking crank panel + 25-tile heatmap, and a "connected" demo wallet.
Deposit/Claim buttons simulate a confirmation and show the success state.
**Nothing is ever signed or broadcast.**

What mock mode adds (all dormant when `NEXT_PUBLIC_MOCK` ≠ `1`):

- `src/lib/mock.ts` — the placeholder data (pool stats, user position, live crank/heatmap).
- `src/lib/mockWallet.tsx` — a no-op wallet adapter that auto-connects to a demo pubkey.
- `src/components/Providers.tsx` — injects the mock wallet only in mock mode.
- `src/hooks/{useVaultData,useUserPosition,useLiveStats,useCwrActions}.ts` — short-circuit to mock data.

No component files are modified — the mock layer is entirely opt-in via the flag.

### Getting out of mock mode

Turn the flag off (or delete the line) in `.env.local` and restart the dev server:

```
NEXT_PUBLIC_MOCK=0
```

With the flag off, the app talks to the real chain backend again and needs the
live config below (program id, RPC, brain feed). No code changes are required —
the mock paths are fully bypassed. To strip the scaffolding entirely, delete
`src/lib/mock.ts` and `src/lib/mockWallet.tsx` and revert the small `MOCK`
guards in `Providers.tsx` and the four hooks above.

## Configuration

One env var:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:7878
```

This is the base URL of the cwr-slaves/brain HTTP server (defined in
[cwr-slaves/brain/src/http.ts](../cwr-slaves/brain/src/http.ts)). If unset,
the UI runs in mock mode — every page renders with placeholder data so you
can navigate the design without a live backend.

## Pages

| Route        | What it shows                                                           | Source                                     |
| ------------ | ----------------------------------------------------------------------- | ------------------------------------------ |
| `/`          | Three bucket cards (Simple / Refined / Ultra) + current ORE round state | `GET /api/buckets`, `GET /api/round-state` |
| `/dashboard` | Per-user position (paste-address read-only in v1; wallet-adapter in v2) | `GET /api/user/:wallet`                    |
| `/health`    | Brain uptime, last round, NAV reports per bucket, SOL-buffer events     | `GET /status` (already exists on brain)    |

The dashboard's deposit/withdraw buttons are stubs — wallet integration via
`@solana/wallet-adapter-react` is v2 once the contracts are deployed.

## Backend endpoints expected

The brain currently serves `/status`. The other three endpoints (`/api/buckets`,
`/api/round-state`, `/api/user/:wallet`) need to be added to
[cwr-slaves/brain/src/http.ts](../cwr-slaves/brain/src/http.ts) for the
frontend to show live data. Until then the frontend gracefully falls back to
mock data with a banner.

Expected response shapes are in [src/lib/types.ts](src/lib/types.ts).

## Stack

- Next.js 14 (app router, server components for data fetching)
- TypeScript
- Tailwind CSS (dark theme, minimal custom styling)
- No wallet adapter yet (v2)

## Build / typecheck

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
npm run start       # serve production build
```

## What's next (after backend endpoints land)

1. Wire `@solana/wallet-adapter-react` for connect + deposit/withdraw
2. Use `@cwr/sdk`'s `CwrVault` for on-chain reads (NAV per bucket directly from chain instead of via brain)
3. Add NAV chart (per-bucket NAV trajectory over time)
4. Add the per-tile heatmap (current ORE round, all 25 tiles)
5. Show recent motherlode hits + which bucket caught them

---

ZINC stays here
