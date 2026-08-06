import { NextResponse } from "next/server";
import { CACHE_CONTROL_SHORT, autonomConfigured, fetchAutonomBars } from "@/lib/autonomServer";
import { RWA_ASSETS, type RwaRange } from "@/lib/rwaAssets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGES = new Set<RwaRange>(["24h", "7d", "30d", "90d", "all"]);

export async function GET(req: Request) {
  const cfg = autonomConfigured();
  if (!cfg.bars) {
    return NextResponse.json(
      { ok: false, error: "AUTONOM_BARS_KEY not configured", data: { points: [], feedId: null, range: null, resolution: null } },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  const url = new URL(req.url);
  const feedId = Number(url.searchParams.get("feed_id"));
  const rangeRaw = (url.searchParams.get("range") || "30d") as RwaRange;
  // Roster feeds + a small evaluation set: candidate benchmarks whose bar
  // availability can only be tested through this key-holding proxy (the
  // oracle serves quotes for many feeds it has no bars for — CL1/T3MO_Y/SPX/
  // EURUSD all proved that). Not in RWA_ASSETS, so the UI never shows them.
  const CANDIDATE_FEED_IDS = [7002, 7003, 7010, 6002, 8003, 8004, 2061, 2062, 2035, 2025];
  const allowed = new Set([...RWA_ASSETS.map((a) => a.feedId), ...CANDIDATE_FEED_IDS]);

  if (!Number.isFinite(feedId) || !allowed.has(feedId)) {
    return NextResponse.json(
      { ok: false, error: "invalid feed_id", data: { points: [] } },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  if (!RANGES.has(rangeRaw)) {
    return NextResponse.json(
      { ok: false, error: "invalid range", data: { points: [] } },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const { points, resolution, error } = await fetchAutonomBars(feedId, rangeRaw);
    const ok = points.length > 0 || !error;
    return NextResponse.json(
      {
        ok: !error || points.length > 0,
        error,
        data: { feedId, range: rangeRaw, resolution, points },
      },
      {
        status: ok ? 200 : 502,
        // NEVER cache a failure: s-maxage + stale-while-revalidate on a 502
        // let the CDN pin one transient upstream flake onto this exact URL
        // for every visitor (observed live: cache-busted request returned 132
        // bars while the canonical URL kept serving the stale error).
        headers: { "cache-control": ok ? CACHE_CONTROL_SHORT : "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "failed to fetch bars", data: { points: [], feedId, range: rangeRaw } },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
