// Vercel-cached header ticker. The route is revalidated once a minute, so the
// Render analytics service sees ~1 request/min total no matter how many
// visitors have the header open.

import { NextResponse } from "next/server";

export const revalidate = 60;

const UPSTREAM = (
  process.env.ANALYTICS_URL ||
  process.env.NEXT_PUBLIC_ANALYTICS_URL ||
  "https://analytics-mwav.onrender.com"
).replace(/\/$/, "");

export async function GET() {
  try {
    const upstream = await fetch(`${UPSTREAM}/ore/ticker`, { next: { revalidate: 60 } });
    const json = await upstream.json();
    return NextResponse.json(json, {
      status: upstream.status,
      headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "ticker upstream unreachable" }, { status: 502 });
  }
}
