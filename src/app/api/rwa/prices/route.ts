import { NextResponse } from "next/server";
import { CACHE_CONTROL_SHORT, autonomConfigured, fetchAutonomPrices } from "@/lib/autonomServer";
import { RWA_ASSETS } from "@/lib/rwaAssets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cfg = autonomConfigured();
  if (!cfg.read) {
    return NextResponse.json(
      { ok: false, error: "AUTONOM_READ_KEY not configured", data: { quotes: [] } },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("feed_ids");
  let feedIds: number[] | undefined;
  if (raw) {
    feedIds = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    const allowed = new Set(RWA_ASSETS.map((a) => a.feedId));
    feedIds = feedIds.filter((id) => allowed.has(id));
  }

  try {
    const quotes = await fetchAutonomPrices(feedIds);
    return NextResponse.json(
      { ok: true, data: { quotes } },
      { headers: { "cache-control": CACHE_CONTROL_SHORT } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "failed to fetch prices", data: { quotes: [] } },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
