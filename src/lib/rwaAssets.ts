/**
 * RWA comparison benchmarks (Autonom oracle feeds).
 * ORE is the fixed comparison asset (from analytics); these are the selectable peers.
 *
 * Roster: 10 assets across 6 classes, chosen from the full 230-feed Autonom
 * catalog (terminal.autonom.cc/api/operator/products). CL1 and T3MO_Y were
 * dropped — the oracle serves live quotes for them but NO historical bars
 * (verified upstream), so a range comparison can never be drawn.
 */

export type RwaAssetClass = "Commodity" | "Equity" | "Crypto" | "Index" | "Forex" | "Basket";

/** How a price quote should be labelled in the UI (never present stale as live). */
export type FreshnessLabel = "live" | "market_closed" | "last_close" | "stale";

/** How market hours typically behave for freshness labeling. */
export type RwaMarketHours = "24/7" | "24/5" | "equity";

export type RwaAsset = {
  feedId: number;
  /** Symbol used for Autonom /hours/asset/{symbol}/status */
  symbol: string;
  name: string;
  assetClass: RwaAssetClass;
  marketHours: RwaMarketHours;
};

export const RWA_ASSETS: readonly RwaAsset[] = [
  { feedId: 2056, symbol: "XAU", name: "Gold", assetClass: "Commodity", marketHours: "24/5" },
  { feedId: 2069, symbol: "XAG", name: "Silver", assetClass: "Commodity", marketHours: "24/5" },
  { feedId: 1027, symbol: "SPY", name: "S&P 500", assetClass: "Equity", marketHours: "equity" },
  { feedId: 1022, symbol: "NVDA", name: "NVIDIA", assetClass: "Equity", marketHours: "equity" },
  { feedId: 1014, symbol: "MSTR", name: "MicroStrategy", assetClass: "Equity", marketHours: "equity" },
  { feedId: 3001, symbol: "BTC", name: "Bitcoin", assetClass: "Crypto", marketHours: "24/7" },
  { feedId: 3005, symbol: "SOL", name: "Solana", assetClass: "Crypto", marketHours: "24/7" },
  { feedId: 7001, symbol: "SPX", name: "S&P 500 Index", assetClass: "Index", marketHours: "equity" },
  { feedId: 6001, symbol: "EURUSD", name: "Euro / US Dollar", assetClass: "Forex", marketHours: "24/5" },
  { feedId: 8001, symbol: "AUBTC50", name: "Gold/BTC 50:50", assetClass: "Basket", marketHours: "24/7" },
] as const;

export const DEFAULT_RWA_FEED_ID = 2056; // Gold

export const RWA_RANGES = [
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "all", label: "All" },
] as const;

export type RwaRange = (typeof RWA_RANGES)[number]["id"];

export const RWA_ASSET_CLASSES: RwaAssetClass[] = ["Commodity", "Equity", "Crypto", "Index", "Forex", "Basket"];

export function rwaAssetByFeedId(feedId: number): RwaAsset | undefined {
  return RWA_ASSETS.find((a) => a.feedId === feedId);
}

export function rwaAssetBySymbol(symbol: string): RwaAsset | undefined {
  const s = symbol.toUpperCase();
  return RWA_ASSETS.find((a) => a.symbol.toUpperCase() === s);
}
