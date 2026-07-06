/**
 * BOOT FALLBACK ATH (USD) for the mined tokens' "projected PnL at ATH (past
 * year)" hopium figure.
 *
 * The live figure comes from each keeper's GET /api/ath (a trailing-1-year high
 * off CoinGecko, cached in-memory and refreshed ≤ once a day) via useAth().
 * These constants are only used for the brief window before that first fetch
 * lands, or if the keeper's /api/ath is unreachable — so keep them roughly in
 * line with the real past-year highs. Not authoritative; the endpoint is.
 */
export const ORE_ATH_USD = 90; // ORE ≈ current-cycle high; live value overrides
export const ZINC_ATH_USD = 25; // ZINC past-year high ≈ $25 (Jun 2026); live value overrides
