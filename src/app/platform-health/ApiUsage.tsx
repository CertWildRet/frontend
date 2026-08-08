"use client";

import { useMemo, useState } from "react";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchUsageSummary, fetchUsageRoutes, fetchUsageSources, fetchUsageSeries,
  type UsageCaller,
} from "@/lib/oreStats";
import { ChartCard } from "@/components/stats/Charts";
import { formatNum } from "@/lib/format";

const DIVIDER = "rgba(91,108,255,0.16)";

const WINDOWS = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "14d", hours: 24 * 14 },
];

/** Bytes in the unit a human reads, not a raw count. */
function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function ms(n: number): string {
  if (n < 1000) return `${Math.round(n)} ms`;
  if (n < 60_000) return `${(n / 1000).toFixed(1)} s`;
  return `${(n / 60_000).toFixed(1)} min`;
}

/** Who a caller IS, in words a non-engineer can act on. */
function callerIdentity(c: UsageCaller): { name: string; color: string; note: string } {
  if (c.caller === "internal") {
    return { name: "Our own service", color: "#8B93A7",
      note: "The analytics service calling itself to pre-warm caches. Never rate limited, and kept out of the third-party totals on purpose." };
  }
  if (c.caller === "anonymous") {
    return { name: "Unidentified callers", color: "#FBBF24",
      note: "Everyone with no API key — other people's tools, scripts and bots, all pooled together. This is the number to watch." };
  }
  if (c.kind === "first_party") {
    return { name: c.label ?? "Diamond Pools app", color: "#22E0E6",
      note: "Our own website and its server, identified by key. Expected to be the largest legitimate share." };
  }
  return { name: c.service_label ?? c.label ?? c.caller, color: c.service_color ?? "#A78BFA",
    note: "A partner using a key we issued." };
}

export function ApiUsage() {
  const [hours, setHours] = useState(24);
  const summary = usePolled(() => fetchUsageSummary(hours), 60_000, [hours]);
  const routes = usePolled(() => fetchUsageRoutes(hours), 120_000, [hours]);
  const sources = usePolled(() => fetchUsageSources(hours), 120_000, [hours]);
  const series = usePolled(() => fetchUsageSeries(hours), 60_000, [hours]);

  const callers = summary.data?.callers ?? [];
  const monthly = summary.data?.cost_model?.monthly_usd ?? null;

  const totals = useMemo(() => callers.reduce(
    (a, c) => ({
      requests: a.requests + c.requests,
      egress: a.egress + c.egress_bytes,
      compute: a.compute + c.compute_ms,
      throttled: a.throttled + c.throttled,
    }),
    { requests: 0, egress: 0, compute: 0, throttled: 0 },
  ), [callers]);

  const peak = useMemo(() => {
    const pts = series.data?.points ?? [];
    const mins = series.data?.bucket_minutes ?? 60;
    if (!pts.length) return null;
    const top = pts.reduce((m, p) => (p.requests > m.requests ? p : m), pts[0]);
    return { rps: top.requests / (mins * 60), at: top.bucket };
  }, [series.data]);

  return (
    <ChartCard title="API usage" variant="dispersion" cutCorner="tr">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm leading-relaxed text-fog-muted">
          Every request to the analytics API, by who made it. Limits are currently in{" "}
          <span className="text-[#4ADE80]">observe-only mode</span> — the &ldquo;would
          throttle&rdquo; column counts what a limit <em>would</em> have stopped; nothing
          is actually being refused.
        </p>
        <div className="flex gap-1" data-no-capture="true">
          {WINDOWS.map((w) => (
            <button key={w.hours} onClick={() => setHours(w.hours)}
              className={`rounded border px-2 py-1 text-xs transition-colors ${
                hours === w.hours ? "border-[#22E0E6] text-[#22E0E6]" : "text-fog-muted hover:text-white"}`}
              style={hours === w.hours ? undefined : { borderColor: DIVIDER }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {summary.error && !summary.data && (
        <p className="py-6 text-sm text-fog-dim">Usage data unavailable — {String(summary.error)}</p>
      )}

      {!summary.data && !summary.error && <p className="py-6 text-sm text-fog-dim">Collecting…</p>}

      {summary.data && (
        <>
          <div className="grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-4" style={{ borderColor: DIVIDER }}>
            <Stat label="Requests" value={formatNum(totals.requests)} hint="Total API calls in this window, from everyone." />
            <Stat label="Data served" value={bytes(totals.egress)} hint="Response bytes sent. This is what bandwidth actually costs us." />
            <Stat label="Busiest moment" value={peak ? `${peak.rps.toFixed(2)}/s` : "···"} hint="Highest average request rate in any single bucket of this window." />
            <Stat label="Would throttle" value={formatNum(totals.throttled)}
              tone={totals.throttled > 0 ? "#FBBF24" : undefined}
              hint="Requests a limit would have refused if enforcement were on. Nothing was actually refused." />
          </div>

          <div className="mt-5">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Who is calling</h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-[0.06em] text-gray-500" style={{ borderColor: DIVIDER }}>
                    <th className="py-2 pr-3 font-medium">Caller</th>
                    <th className="py-2 pr-3 text-right font-medium">Requests</th>
                    <th className="py-2 pr-3 text-right font-medium">Data served</th>
                    <th className="py-2 pr-3 text-right font-medium">Server time</th>
                    <th className="py-2 pr-3 text-right font-medium" title="Share of the service's cost, blending server time, bandwidth and request count.">Share of cost</th>
                    <th className="py-2 text-right font-medium">Would throttle</th>
                  </tr>
                </thead>
                <tbody>
                  {callers.map((c) => {
                    const id = callerIdentity(c);
                    return (
                      <tr key={c.caller} className="border-b last:border-b-0" style={{ borderColor: DIVIDER }}>
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: id.color }} />
                            <span className="text-white" title={id.note}>{id.name}</span>
                          </span>
                          <span className="mt-0.5 block text-xs text-fog-dim">
                            {c.distinct_sources} source{c.distinct_sources === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-300 [font-variant-numeric:tabular-nums]">{formatNum(c.requests)}</td>
                        <td className="py-2 pr-3 text-right text-gray-300 [font-variant-numeric:tabular-nums]">{bytes(c.egress_bytes)}</td>
                        <td className="py-2 pr-3 text-right text-gray-300 [font-variant-numeric:tabular-nums]">{ms(c.compute_ms)}</td>
                        <td className="py-2 pr-3 text-right [font-variant-numeric:tabular-nums]" style={{ color: id.color }}>
                          {(c.cost_share * 100).toFixed(1)}%
                          {monthly != null && c.cost_usd_estimate != null && (
                            <span className="ml-1 text-xs text-fog-dim">≈${c.cost_usd_estimate.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="py-2 text-right [font-variant-numeric:tabular-nums]"
                          style={{ color: c.throttled > 0 ? "#FBBF24" : undefined }}>
                          {c.throttled > 0 ? formatNum(c.throttled) : "·"}
                        </td>
                      </tr>
                    );
                  })}
                  {!callers.length && (
                    <tr><td colSpan={6} className="py-4 text-center text-fog-dim">No requests recorded in this window yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-fog-dim">
              &ldquo;Share of cost&rdquo; splits what the service costs to run between callers,
              weighted by server time, bandwidth and request count. It is an allocation of a
              bill we already pay — not a per-request price.
              {monthly == null && " Set API_COST_MONTHLY_USD on the analytics service to see it in dollars."}
            </p>
          </div>

          {!!(routes.data?.routes?.length) && (
            <div className="mt-6">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Most expensive endpoints</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-[0.06em] text-gray-500" style={{ borderColor: DIVIDER }}>
                      <th className="py-2 pr-3 font-medium">Endpoint</th>
                      <th className="py-2 pr-3 text-right font-medium">Calls</th>
                      <th className="py-2 pr-3 text-right font-medium" title="Typical response time.">Typical</th>
                      <th className="py-2 pr-3 text-right font-medium" title="Slowest 5% start here.">Slow tail</th>
                      <th className="py-2 text-right font-medium" title="Share of responses answered from cache, which cost no database work.">From cache</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.data.routes.slice(0, 10).map((r) => (
                      <tr key={r.route} className="border-b last:border-b-0" style={{ borderColor: DIVIDER }}>
                        <td className="py-2 pr-3 font-mono text-xs text-white">{r.route}</td>
                        <td className="py-2 pr-3 text-right text-gray-300 [font-variant-numeric:tabular-nums]">{formatNum(r.requests)}</td>
                        <td className="py-2 pr-3 text-right text-gray-300 [font-variant-numeric:tabular-nums]">{ms(r.mean_ms)}</td>
                        <td className="py-2 pr-3 text-right [font-variant-numeric:tabular-nums]"
                          style={{ color: (r.p95_ms ?? 0) > 3000 ? "#F87171" : undefined }}>
                          {r.p95_ms != null ? ms(r.p95_ms) : "·"}
                        </td>
                        <td className="py-2 text-right text-gray-300 [font-variant-numeric:tabular-nums]">
                          {r.requests ? `${Math.round((r.cache_hits / r.requests) * 100)}%` : "·"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!!(sources.data?.sources?.length) && (
            <div className="mt-6">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Busiest sources</h4>
              <p className="mb-2 text-xs text-fog-dim">
                Each source is one network address, shown as a scrambled id — we never store
                the address itself. Useful for spotting a single heavy user.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-[0.06em] text-gray-500" style={{ borderColor: DIVIDER }}>
                      <th className="py-2 pr-3 font-medium">Source</th>
                      <th className="py-2 pr-3 font-medium">Identified as</th>
                      <th className="py-2 pr-3 text-right font-medium">Requests</th>
                      <th className="py-2 pr-3 text-right font-medium">Data served</th>
                      <th className="py-2 text-right font-medium">Endpoints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.data.sources.slice(0, 12).map((s) => (
                      <tr key={`${s.source_id}-${s.caller}`} className="border-b last:border-b-0" style={{ borderColor: DIVIDER }}>
                        <td className="py-2 pr-3 font-mono text-xs text-gray-300">{s.source_id?.slice(0, 8) ?? "·"}</td>
                        <td className="py-2 pr-3 text-xs text-fog-muted">
                          {s.caller === "anonymous" ? "no key" : s.caller}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-300 [font-variant-numeric:tabular-nums]">{formatNum(s.requests)}</td>
                        <td className="py-2 pr-3 text-right text-gray-300 [font-variant-numeric:tabular-nums]">{bytes(s.egress_bytes)}</td>
                        <td className="py-2 text-right text-gray-300 [font-variant-numeric:tabular-nums]">{s.routes_touched}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </ChartCard>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <div title={hint}>
      <div className="text-xs uppercase tracking-[0.06em] text-gray-500">{label}</div>
      <div className="mt-0.5 text-lg text-white [font-variant-numeric:tabular-nums]" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
    </div>
  );
}
