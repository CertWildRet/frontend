/**
 * Past all-time-high USD prices for the mined tokens, used ONLY for the
 * "Projected PnL" hopium figure on the pool-economics panels.
 *
 * This is NOT a live feed and NOT realized PnL. It revalues the mined-token leg
 * (and only that leg) at the token's past peak to show what the all-time PnL
 * *would* be if the token round-tripped to its ATH. Everything else in the
 * calculation — recovered SOL, gross deployed, deposited cost basis — is
 * unchanged. Bump these if an ATH is beaten.
 */
export const ORE_ATH_USD = 90;
export const ZINC_ATH_USD = 20;
