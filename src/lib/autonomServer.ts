/**
 * Server-only Autonom oracle helpers. Keys must never reach the client bundle.
 * Import only from Route Handlers / server code.
 */

import {
  RWA_ASSETS,
  rwaAssetByFeedId,
  type FreshnessLabel,
  type RwaMarketHours,
  type RwaRange,
} from "@/lib/rwaAssets";

export type { FreshnessLabel };

export type AutonomPriceQuote = {
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

export type AutonomBarPoint = { t: number; close: number };

export type AutonomMarketStatus = {
  symbol: string;
  feedId: number | null;
  assetClass: string | null;
  isTradableNow: boolean | null;
  session: string | null;
  atUtc: string | null;
  nextChangeIso: string | null;
  notes: string | null;
};

const DEFAULT_URL = "https://oracle2.autonom.cc";

export function autonomBaseUrl(): string {
  return (process.env.AUTONOM_API_URL || DEFAULT_URL).replace(/\/$/, "");
}

export function autonomConfigured(): { read: boolean; bars: boolean; url: string } {
  return {
    url: autonomBaseUrl(),
    read: Boolean(process.env.AUTONOM_READ_KEY?.trim()),
    bars: Boolean(process.env.AUTONOM_BARS_KEY?.trim()),
  };
}

async function autonomFetch(
  pathAndQuery: string,
  key: string | undefined,
): Promise<{ ok: boolean; status: number; json: unknown; error?: string }> {
  const url = `${autonomBaseUrl()}${pathAndQuery.startsWith("/") ? "" : "/"}${pathAndQuery}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key) headers["x-api-key"] = key;
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 200) };
    }
    if (!res.ok) {
      // Pull the reason from every shape the upstream speaks: plain
      // message/error, TradingView-UDF errmsg ({s:"error",errmsg:...}), detail,
      // and as a last resort the raw body — "upstream 400" with the reason
      // swallowed cost a debugging round trip once already.
      const field = (k: string): string | null =>
        json && typeof json === "object" && k in (json as Record<string, unknown>) && typeof (json as Record<string, unknown>)[k] === "string"
          ? ((json as Record<string, unknown>)[k] as string)
          : null;
      const msg =
        field("message") || field("error") || field("errmsg") || field("detail") ||
        (field("raw") ? `upstream ${res.status} — ${field("raw")!.slice(0, 140)}` : null) ||
        `upstream ${res.status}`;
      return { ok: false, status: res.status, json, error: msg };
    }
    return { ok: true, status: res.status, json };
  } catch {
    return { ok: false, status: 502, json: null, error: "autonom upstream unreachable" };
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length ? v : null;
}

function tsToIso(v: unknown): string | null {
  if (typeof v === "string" && v.length) {
    const asNum = Number(v);
    if (Number.isFinite(asNum) && /^\d+(\.\d+)?$/.test(v.trim())) {
      const ms = asNum > 1e12 ? asNum : asNum * 1000;
      return new Date(ms).toISOString();
    }
    return v;
  }
  const n = num(v);
  if (n == null) return null;
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toISOString();
}

/** Extract price + timestamp from a single-feed Autonom price payload. */
export function parsePricePayload(json: unknown): { price: number | null; ts: string | null } {
  const root = asRecord(json);
  if (!root) return { price: null, ts: null };
  const data = asRecord(root.data) ?? root;
  let price =
    num(data.price) ??
    num(data.last) ??
    num(data.close) ??
    num(data.value) ??
    num(data.mid) ??
    num(asRecord(data.price)?.value) ??
    null;
  // Pyth-style scaled integer: price * 10^expo
  const expo = num(data.expo) ?? num(data.exponent);
  if (price != null && expo != null) {
    price = price * Math.pow(10, expo);
  }
  const ts =
    tsToIso(data.ts) ??
    tsToIso(data.timestamp) ??
    tsToIso(data.updated_at) ??
    tsToIso(data.as_of) ??
    tsToIso(data.time) ??
    tsToIso(data.served_at);
  return { price, ts };
}

/**
 * Normalize batch price responses into feedId → payload.
 * Handles maps keyed by feed id, arrays of quotes, or nested `prices` / `data`.
 */
export function parseBatchPrices(json: unknown): Map<number, { price: number | null; ts: string | null; present: boolean }> {
  const out = new Map<number, { price: number | null; ts: string | null; present: boolean }>();
  const root = asRecord(json);
  if (!root) return out;

  const candidates: unknown[] = [];
  if (Array.isArray(root)) candidates.push(root);
  if (Array.isArray(root.prices)) candidates.push(root.prices);
  if (Array.isArray(root.data)) candidates.push(root.data);
  if (Array.isArray(root.results)) candidates.push(root.results);

  for (const arr of candidates) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const rec = asRecord(item);
      if (!rec) continue;
      const feedId = num(rec.feed_id) ?? num(rec.feedId) ?? num(rec.id);
      if (feedId == null) continue;
      const parsed = parsePricePayload(rec);
      out.set(feedId, { ...parsed, present: parsed.price != null });
    }
  }

  // Object map: { "3001": { price: … }, prices: { "3001": … } }
  for (const bag of [root.prices, root.data, root]) {
    const rec = asRecord(bag);
    if (!rec || Array.isArray(bag)) continue;
    for (const [k, v] of Object.entries(rec)) {
      if (!/^\d+$/.test(k)) continue;
      const feedId = Number(k);
      const parsed = parsePricePayload(v);
      out.set(feedId, { ...parsed, present: parsed.price != null });
    }
  }

  return out;
}

export function parseBarsPayload(json: unknown): AutonomBarPoint[] {
  const root = asRecord(json);

  // TradingView / UDF style: { s: "ok", t: [...], c: [...], ... }
  if (root && Array.isArray(root.t) && Array.isArray(root.c)) {
    const times = root.t as unknown[];
    const closes = root.c as unknown[];
    const points: AutonomBarPoint[] = [];
    const n = Math.min(times.length, closes.length);
    for (let i = 0; i < n; i++) {
      const t = num(times[i]);
      const close = num(closes[i]);
      if (t == null || close == null) continue;
      points.push({ t: t > 1e12 ? t : t * 1000, close });
    }
    points.sort((a, b) => a.t - b.t);
    return points;
  }

  let rows: unknown = json;
  if (root) {
    rows =
      root.bars ??
      root.candles ??
      root.data ??
      root.results ??
      root.ohlc ??
      (Array.isArray(root) ? root : null);
  }
  if (!Array.isArray(rows)) return [];

  const points: AutonomBarPoint[] = [];
  for (const row of rows) {
    if (Array.isArray(row) && row.length >= 5) {
      // [t, o, h, l, c] or [t, o, h, l, c, v]
      const t = num(row[0]);
      const c = num(row[4]);
      if (t == null || c == null) continue;
      points.push({ t: t > 1e12 ? t : t * 1000, close: c });
      continue;
    }
    const rec = asRecord(row);
    if (!rec) continue;
    const t =
      num(rec.t) ??
      num(rec.ts) ??
      num(rec.time) ??
      num(rec.timestamp) ??
      num(rec.start) ??
      null;
    const close =
      num(rec.close) ??
      num(rec.c) ??
      num(rec.price) ??
      num(rec.last) ??
      null;
    if (t == null || close == null) continue;
    points.push({ t: t > 1e12 ? t : t * 1000, close });
  }
  points.sort((a, b) => a.t - b.t);
  return points;
}

export function parseMarketStatus(json: unknown): AutonomMarketStatus {
  const root = asRecord(json) ?? {};
  return {
    symbol: str(root.symbol) ?? "",
    feedId: num(root.feed_id) ?? num(root.feedId),
    assetClass: str(root.asset_class) ?? str(root.assetClass),
    isTradableNow:
      typeof root.is_tradable_now === "boolean"
        ? root.is_tradable_now
        : typeof root.isTradableNow === "boolean"
          ? root.isTradableNow
          : null,
    session: str(root.session),
    atUtc: str(root.at_utc) ?? str(root.atUtc),
    nextChangeIso: str(root.next_change_iso) ?? str(root.nextChangeIso),
    notes: str(root.notes),
  };
}

export function labelFreshness(opts: {
  fresh: boolean;
  tradable: boolean | null;
  marketHours: RwaMarketHours;
}): FreshnessLabel {
  const { fresh, tradable, marketHours } = opts;
  if (marketHours === "24/7") {
    return fresh ? "live" : "stale";
  }
  if (tradable === false) {
    return fresh ? "market_closed" : "last_close";
  }
  if (tradable === true) {
    return fresh ? "live" : "stale";
  }
  // Unknown status: trust the fresh flag only
  return fresh ? "live" : "stale";
}

/** Lookback + bar resolution for Stats ranges. `resParam` is the wire value —
 *  STANDARD TradingView/UDF resolutions only (15/60/240/"D"): the old map sent
 *  360 (not a UDF resolution) and 1440 (UDF spells daily "D"), which a strict
 *  UDF backend rejects with a 400. `resolutionMin` is the numeric bar width for
 *  local time math. */
export function rangeToBarsParams(range: RwaRange): { resParam: string; resolutionMin: number; lookbackMs: number } {
  switch (range) {
    case "24h":
      return { resParam: "15", resolutionMin: 15, lookbackMs: 24 * 3600_000 };
    case "7d":
      return { resParam: "60", resolutionMin: 60, lookbackMs: 7 * 24 * 3600_000 };
    case "30d":
      return { resParam: "240", resolutionMin: 240, lookbackMs: 30 * 24 * 3600_000 };
    case "90d":
      return { resParam: "D", resolutionMin: 1440, lookbackMs: 90 * 24 * 3600_000 };
    case "all":
    default:
      return { resParam: "D", resolutionMin: 1440, lookbackMs: 730 * 24 * 3600_000 }; // ~2y
  }
}

export async function fetchAutonomMarketStatus(symbol: string): Promise<AutonomMarketStatus | null> {
  const res = await autonomFetch(`/hours/asset/${encodeURIComponent(symbol)}/status`, undefined);
  if (!res.ok) return null;
  return parseMarketStatus(res.json);
}

async function fetchBatchRaw(feedIds: number[], fresh: boolean): Promise<Map<number, { price: number | null; ts: string | null; present: boolean }>> {
  const key = process.env.AUTONOM_READ_KEY?.trim();
  if (!key) return new Map();
  const ids = feedIds.join(",");
  const res = await autonomFetch(`/prices/batch?feed_ids=${ids}&fresh=${fresh ? "true" : "false"}`, key);
  if (!res.ok) return new Map();
  return parseBatchPrices(res.json);
}

async function fetchSinglePrice(feedId: number, fresh: boolean): Promise<{ price: number | null; ts: string | null; present: boolean }> {
  const key = process.env.AUTONOM_READ_KEY?.trim();
  if (!key) return { price: null, ts: null, present: false };
  const q = fresh ? "?fresh=true" : "?fresh=false";
  const res = await autonomFetch(`/prices/${feedId}${q}`, key);
  if (!res.ok) {
    // Some deployments ignore query on single; try bare path for stale
    if (!fresh) {
      const retry = await autonomFetch(`/prices/${feedId}`, key);
      if (!retry.ok) return { price: null, ts: null, present: false };
      const parsed = parsePricePayload(retry.json);
      return { ...parsed, present: parsed.price != null };
    }
    return { price: null, ts: null, present: false };
  }
  const parsed = parsePricePayload(res.json);
  return { ...parsed, present: parsed.price != null };
}

/**
 * Batch prices with fresh=true, then per-asset fresh=false fallback.
 * One failed asset never fails the whole batch.
 */
export async function fetchAutonomPrices(feedIds?: number[]): Promise<AutonomPriceQuote[]> {
  const ids = feedIds?.length ? feedIds : RWA_ASSETS.map((a) => a.feedId);
  const key = process.env.AUTONOM_READ_KEY?.trim();
  if (!key) {
    return ids.map((feedId) => {
      const meta = rwaAssetByFeedId(feedId);
      return {
        feedId,
        symbol: meta?.symbol ?? String(feedId),
        name: meta?.name ?? String(feedId),
        assetClass: meta?.assetClass ?? "Unknown",
        price: null,
        ts: null,
        fresh: false,
        freshness: "stale" as const,
        tradable: null,
        error: "AUTONOM_READ_KEY not configured",
      };
    });
  }

  let freshMap = await fetchBatchRaw(ids, true);
  // If batch returned nothing, try singles for fresh
  if (freshMap.size === 0) {
    await Promise.all(
      ids.map(async (id) => {
        const q = await fetchSinglePrice(id, true);
        if (q.present) freshMap.set(id, q);
      }),
    );
  }

  const missing = ids.filter((id) => !freshMap.get(id)?.present);
  let staleMap = new Map<number, { price: number | null; ts: string | null; present: boolean }>();
  if (missing.length) {
    staleMap = await fetchBatchRaw(missing, false);
    if (staleMap.size === 0) {
      await Promise.all(
        missing.map(async (id) => {
          const q = await fetchSinglePrice(id, false);
          if (q.present) staleMap.set(id, q);
        }),
      );
    }
  }

  // Market status in parallel (best-effort)
  const statusBySymbol = new Map<string, AutonomMarketStatus | null>();
  await Promise.all(
    ids.map(async (id) => {
      const meta = rwaAssetByFeedId(id);
      if (!meta) return;
      if (statusBySymbol.has(meta.symbol)) return;
      statusBySymbol.set(meta.symbol, await fetchAutonomMarketStatus(meta.symbol));
    }),
  );

  return ids.map((feedId) => {
    const meta = rwaAssetByFeedId(feedId);
    const symbol = meta?.symbol ?? String(feedId);
    const freshHit = freshMap.get(feedId);
    const staleHit = staleMap.get(feedId);
    const usedFresh = Boolean(freshHit?.present);
    const hit = usedFresh ? freshHit! : staleHit;
    const status = statusBySymbol.get(symbol) ?? null;
    const tradable = status?.isTradableNow ?? (meta?.marketHours === "24/7" ? true : null);
    const marketHours = meta?.marketHours ?? "24/5";

    if (!hit?.present) {
      return {
        feedId,
        symbol,
        name: meta?.name ?? symbol,
        assetClass: meta?.assetClass ?? "Unknown",
        price: null,
        ts: null,
        fresh: false,
        freshness: labelFreshness({ fresh: false, tradable, marketHours }),
        tradable,
        error: "price unavailable",
      };
    }

    return {
      feedId,
      symbol,
      name: meta?.name ?? symbol,
      assetClass: meta?.assetClass ?? status?.assetClass ?? "Unknown",
      price: hit.price,
      ts: hit.ts,
      fresh: usedFresh,
      freshness: labelFreshness({ fresh: usedFresh, tradable, marketHours }),
      tradable,
      error: null,
    };
  });
}

export async function fetchAutonomBars(feedId: number, range: RwaRange): Promise<{
  points: AutonomBarPoint[];
  resolution: number;
  error: string | null;
}> {
  const key = process.env.AUTONOM_BARS_KEY?.trim();
  if (!key) {
    return { points: [], resolution: 60, error: "AUTONOM_BARS_KEY not configured" };
  }
  const { resParam, resolutionMin, lookbackMs } = rangeToBarsParams(range);
  const end = Date.now();
  const start = end - lookbackMs;
  const fromSec = Math.floor(start / 1000);
  const toSec = Math.floor(end / 1000);
  // Autonom bars require from/to in unix seconds (TradingView UDF shape).
  const queries = [
    `/api/v1/bars?feed_id=${feedId}&resolution=${resParam}&from=${fromSec}&to=${toSec}`,
    `/api/v1/bars?feed_id=${feedId}&resolution=${resParam}&from=${start}&to=${end}`,
    `/api/v1/bars?feed_id=${feedId}&resolution=${resParam}&start=${fromSec}&end=${toSec}`,
    `/api/v1/bars?feed_id=${feedId}&resolution=${resParam}`,
  ];

  let lastError: string | null = null;
  for (const q of queries) {
    const res = await autonomFetch(q, key);
    if (!res.ok) {
      lastError = res.error ?? `upstream ${res.status}`;
      // Auth / not-found — no point trying more variants with same key
      if (res.status === 401 || res.status === 403) break;
      continue;
    }
    const points = parseBarsPayload(res.json).filter((p) => p.t >= start - resolutionMin * 60_000);
    if (points.length) return { points, resolution: resolutionMin, error: null };
    // Empty but OK — keep trying alternate param shapes
    lastError = "no bars in response";
  }
  return { points: [], resolution: resolutionMin, error: lastError };
}

export const CACHE_CONTROL_SHORT = "public, s-maxage=45, stale-while-revalidate=120";
