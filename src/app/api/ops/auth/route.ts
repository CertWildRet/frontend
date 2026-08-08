// Narrow POST proxy for the ops password exchange. Deliberately its own route rather
// than widening the catch-all analytics proxy, which is GET-only and should stay that
// way — turning it into a general POST relay would open a surface that does not
// currently exist.

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = (
  process.env.ANALYTICS_URL ||
  process.env.NEXT_PUBLIC_ANALYTICS_URL ||
  "https://analytics-mwav.onrender.com"
).replace(/\/$/, "");

const json = (status: number, body: unknown, extra?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...(extra ?? {}) },
  });

export async function POST(req: NextRequest) {
  // Same-origin only. The browser path is same-origin so this costs nothing, and it
  // removes cross-origin scripts as a way to spend the upstream's attempt budget.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.nextUrl.host) return json(403, { ok: false, error: "forbidden" });

  // Reject oversized bodies here rather than spending an upstream request on garbage.
  const body = await req.text();
  if (body.length > 1024) return json(400, { ok: false, error: "invalid_request" });

  try {
    const upstream = await fetch(`${UPSTREAM}/ops/auth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });
    const text = await upstream.text();
    const extra: Record<string, string> = {};
    const retry = upstream.headers.get("retry-after");
    if (retry) extra["retry-after"] = retry;
    // Mirror status and body verbatim; nothing from either is logged — the request
    // body is the password.
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
    });
  } catch {
    // A distinct code so the UI never renders a network failure as "wrong password".
    return json(502, { ok: false, error: "analytics_unreachable" });
  }
}
