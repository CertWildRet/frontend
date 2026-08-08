// Same-origin analytics proxy. Browser clients call /api/analytics/* so requests
// never cross-origin to Render (avoids CORS). Forwards GET only — read-only API.

import { NextRequest } from "next/server";
import { analyticsAuthHeaders } from "@/lib/analytics";

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
    // SET, never append. Vercel populates x-forwarded-for with the real client
    // address; taking the leftmost entry and overwriting means a client-supplied
    // header can never survive this hop and forge a source. Upstream only believes
    // it because our key is marked trust_forwarded_for. Omitted entirely when empty
    // rather than sent blank — a blank hop header is meaningless and a needless
    // thing for any intermediary to have to interpret.
    const clientIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const upstream = await fetch(url, {
      cache: "no-store",
      headers: {
        ...analyticsAuthHeaders(),
        ...(clientIp ? { "x-forwarded-for": clientIp } : {}),
      },
    });
    const text = await upstream.text();
    const headers: Record<string, string> = {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    };
    // Pass the throttling signals through — dropping them (as this route used to)
    // leaves a client unable to tell "slow down" from "broken", and hides the
    // shadow-mode warning a partner would otherwise see before enforcement starts.
    for (const h of ["retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-shadow"]) {
      const v = upstream.headers.get(h);
      if (v) headers[h] = v;
    }
    return new Response(text, { status: upstream.status, headers });
  } catch {
    return Response.json({ error: "analytics upstream unreachable" }, { status: 502 });
  }
}
