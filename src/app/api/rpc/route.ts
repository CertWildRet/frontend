// Same-origin RPC proxy. The browser's Connection points here (default) so the
// paid RPC key (server-only RPC_URL) is never exposed to clients. Plain JSON-RPC
// request/response forwarding — works on Vercel serverless (no persistent
// socket). The live crank feed is a separate SSE stream from the brain.

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = process.env.RPC_URL;

export async function POST(req: NextRequest) {
  if (!UPSTREAM) {
    return Response.json(
      { error: "RPC_URL not configured on the server" },
      { status: 500 },
    );
  }
  const body = await req.text();
  try {
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return Response.json({ error: "upstream RPC unreachable" }, { status: 502 });
  }
}
