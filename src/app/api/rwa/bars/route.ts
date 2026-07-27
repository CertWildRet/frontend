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
  const allowed = new Set(RWA_ASSETS.map((a) => a.feedId));

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
    return NextResponse.json(
      {
        ok: !error || points.length > 0,
        error,
        data: { feedId, range: rangeRaw, resolution, points },
      },
      {
        status: points.length || !error ? 200 : 502,
        headers: { "cache-control": CACHE_CONTROL_SHORT },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "failed to fetch bars", data: { points: [], feedId, range: rangeRaw } },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
