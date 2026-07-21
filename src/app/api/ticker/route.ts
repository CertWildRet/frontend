// Vercel-cached header ticker. The route is revalidated once a minute, so the
// Render analytics service sees ~1 request/min total no matter how many
// visitors have the header open.

import { NextResponse } from "next/server";
import { oreGramsToOre } from "@/lib/analytics";

export const revalidate = 60;

const UPSTREAM = (
  process.env.ANALYTICS_URL ||
  process.env.NEXT_PUBLIC_ANALYTICS_URL ||
  "https://analytics-mwav.onrender.com"
).replace(/\/$/, "");

export async function GET() {
  try {
    const [tickerRes, mlRes] = await Promise.all([
      fetch(`${UPSTREAM}/ore/ticker`, { next: { revalidate: 60 } }),
      fetch(`${UPSTREAM}/ore/motherlode?limit=1&offset=0`, { next: { revalidate: 60 } }),
    ]);
    const json = await tickerRes.json();
    const mlJson = mlRes.ok ? await mlRes.json() : null;
    const poolGrams = mlJson?.data?.current?.pool_grams;
    const motherlode_pool_ore = poolGrams != null ? oreGramsToOre(poolGrams) : null;
    return NextResponse.json(
      {
        ...json,
        data: json?.data ? { ...json.data, motherlode_pool_ore } : json?.data,
      },
      {
        status: tickerRes.status,
        headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
      },
    );
  } catch {
    return NextResponse.json({ error: "ticker upstream unreachable" }, { status: 502 });
  }
}
