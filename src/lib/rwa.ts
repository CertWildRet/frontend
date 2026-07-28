/**
 * Client fetchers for the RWA stats tab.
 * Calls same-origin `/api/rwa/*` only — Autonom keys stay server-side.
 */
import type { OreEnvelope, OreProvenance } from "@/lib/oreStats";
import type { FreshnessLabel, RwaRange } from "@/lib/rwaAssets";

export type { FreshnessLabel };

export type RwaPriceQuote = {
  feedId: number;
  symbol: string;
  name: string;
  assetClass: string;
  price: number | null;
  ts: string | null;
  fresh: boolean;
  freshness: FreshnessLabel;
  tradable: boolean | null;
  error: string | null;
};

export type RwaBarPoint = { t: number; close: number };

export type RwaPricesPayload = { quotes: RwaPriceQuote[] };

export type RwaBarsPayload = {
  feedId: number;
  range: RwaRange;
  resolution: number;
  points: RwaBarPoint[];
};

export type RwaMarketStatus = {
  symbol: string;
  feedId: number | null;
  assetClass: string | null;
  isTradableNow: boolean | null;
  session: string | null;
  atUtc: string | null;
  nextChangeIso: string | null;
  notes: string | null;
};

/** Stub provenance so RWA fetchers work with usePolled (analytics-shaped envelope). */
const STUB_PROVENANCE: OreProvenance = {
  ore_max_round: "0",
  ore_cumulative_through_round: null,
  reset_tail_last_round: "0",
  census_snapshot_ts: null,
  ingest_enabled: true,
  caveats: [],
};

type ApiEnvelope<T> = { ok: boolean; error?: string | null; data: T };

async function getRwa<T>(path: string): Promise<OreEnvelope<T>> {
  let res: Response;
  try {
    res = await fetch(path);
  } catch {
    throw new Error("Can't reach the RWA proxy. Retry in a moment.");
  }
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`RWA response was not JSON (${res.status})`);
  }
  // Soft-fail paths (503 when keys missing, partial bars) still return data —
  // surface error string via envelope but don't throw when data is usable.
  const payload = json?.data as unknown;
  const emptyQuotes =
    payload != null &&
    typeof payload === "object" &&
    Array.isArray((payload as { quotes?: unknown }).quotes) &&
    (payload as { quotes: unknown[] }).quotes.length === 0;
  if (!res.ok && (payload == null || emptyQuotes)) {
    throw new Error(json?.error || `RWA request failed (${res.status})`);
  }
  return {
    ok: Boolean(json?.ok),
    data: json!.data,
    provenance: {
      ...STUB_PROVENANCE,
      caveats: json?.error ? [json.error] : [],
    },
  };
}

export const fetchRwaPrices = (feedIds?: number[]) => {
  const q = feedIds?.length ? `?feed_ids=${feedIds.join(",")}` : "";
  return getRwa<RwaPricesPayload>(`/api/rwa/prices${q}`);
};

export const fetchRwaBars = (feedId: number, range: RwaRange) =>
  getRwa<RwaBarsPayload>(`/api/rwa/bars?feed_id=${feedId}&range=${range}`);

export const fetchRwaStatus = (symbol: string) =>
  getRwa<RwaMarketStatus>(`/api/rwa/status?symbol=${encodeURIComponent(symbol)}`);

/** Normalize closes to % change from the first non-null / positive point. */
export function normalizePerformance(closes: (number | null)[]): (number | null)[] {
  let base: number | null = null;
  return closes.map((c) => {
    if (c == null || !Number.isFinite(c) || c <= 0) return null;
    if (base == null) {
      base = c;
      return 0;
    }
    return ((c / base) - 1) * 100;
  });
}

export function freshnessLabelText(f: FreshnessLabel): string {
  switch (f) {
    case "live":
      return "Live";
    case "market_closed":
      return "Market closed";
    case "last_close":
      return "Last close";
    case "stale":
      return "Stale";
  }
}

export function formatUsdPrice(n: number | null | undefined, symbol?: string): string {
  if (n == null || !Number.isFinite(n)) return "···";
  // Rates (T-bill yields) may be small percentages rather than dollar prices
  if (symbol === "T3MO_Y") {
    return `${n.toLocaleString("en-US", { maximumFractionDigits: 3 })}%`;
  }
  if (n >= 1000) {
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  if (n >= 1) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

export function formatPctChange(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return "···";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "·";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "·";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
