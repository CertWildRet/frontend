// Same-origin analytics proxy. Browser clients call /api/analytics/* so requests
// never cross-origin to Render (avoids CORS). Forwards GET only — read-only API.

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = (
  process.env.ANALYTICS_URL ||
  process.env.NEXT_PUBLIC_ANALYTICS_URL ||
  "https://analytics-mwav.onrender.com"
).replace(/\/$/, "");

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path.join("/");
  const url = `${UPSTREAM}/${path}${req.nextUrl.search}`;

  try {
    const upstream = await fetch(url, { cache: "no-store" });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ error: "analytics upstream unreachable" }, { status: 502 });
  }
}
