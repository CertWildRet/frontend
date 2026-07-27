import { NextResponse } from "next/server";
import { CACHE_CONTROL_SHORT, fetchAutonomMarketStatus } from "@/lib/autonomServer";
import { rwaAssetBySymbol } from "@/lib/rwaAssets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json(
      { ok: false, error: "symbol required", data: null },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  // Prefer catalog symbols; still allow the request through if known-looking.
  const known = rwaAssetBySymbol(symbol);
  const querySymbol = known?.symbol ?? symbol;

  try {
    const status = await fetchAutonomMarketStatus(querySymbol);
    if (!status) {
      return NextResponse.json(
        { ok: false, error: "market status unavailable", data: null },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: true, data: status },
      { headers: { "cache-control": CACHE_CONTROL_SHORT } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "failed to fetch market status", data: null },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
