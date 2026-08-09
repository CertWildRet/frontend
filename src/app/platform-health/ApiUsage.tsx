"use client";

import { useMemo, useState } from "react";
import { usePolled } from "@/hooks/useOreStats";
import {
  fetchUsageSummary, fetchUsageRoutes, fetchUsageSources, fetchUsageSeries,
  type UsageCaller,
} from "@/lib/oreStats";
import { ChartCard, AreaLine } from "@/components/stats/Charts";
import { CHART } from "@/lib/chartColors";
import { formatNum } from "@/lib/format";

const DIVIDER = "rgba(91,108,255,0.16)";

const WINDOWS = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "14d", hours: 24 * 14 },
];

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function ms(n: number): string {
  if (n < 1000) return `${Math.round(n)}ms`;
  if (n < 60_000) return `${(n / 1000).toFixed(1)}s`;
  return `${(n / 60_000).toFixed(1)}min`;
}

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/**
 * Caller identity. Colours come from the app's canonical CHART palette and, for
 * partners, from ore.services — so a partner keeps the same colour here that its chip
 * already has on the miner tables. Identity is never encoded by colour alone: every row
 * carries its name and a plain-English note.
 */
function identify(c: UsageCaller): { name: string; color: string; note: string } {
  if (c.caller === "internal") {
    return { name: "Our own service", color: CHART.steel,
      note: "The analytics service calling itself to pre-warm caches. Never rate limited, and deliberately kept out of the third-party totals." };
  }
  if (c.caller === "anonymous") {
    return { name: "Unidentified callers", color: CHART.amber,
      note: "Everyone with no API key — other people's tools, scripts and bots, pooled together. This is the number to watch." };
  }
  if (c.kind === "first_party") {
    return { name: c.label ?? "Diamond Pools app", color: CHART.cyan,
      note: "Our own website and its server, identified by key. Expected to be the largest legitimate share." };
  }
  return { name: c.service_label ?? c.label ?? c.caller, color: c.service_color ?? CHART.violet,
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

  const totals = useMemo(() => callers.reduce((a, c) => ({
    requests: a.requests + c.requests,
    egress: a.egress + c.egress_bytes,
    compute: a.compute + c.compute_ms,
    throttled: a.throttled + c.throttled,
  }), { requests: 0, egress: 0, compute: 0, throttled: 0 }), [callers]);

  const trafficPts = useMemo(
    () => (series.data?.points ?? []).map((p) => ({ label: hhmm(p.bucket), value: p.requests })),
    [series.data],
  );

  const peak = useMemo(() => {
    const pts = series.data?.points ?? [];
    const mins = series.data?.bucket_minutes ?? 60;
    if (!pts.length) return null;
    return Math.max(...pts.map((p) => p.requests)) / (mins * 60);
  }, [series.data]);

  const slowest = routes.data?.routes?.length
    ? Math.max(...routes.data.routes.map((r) => r.mean_ms), 1) : 1;

  return (
    <ChartCard title="API usage" variant="dispersion" cutCorner="tr">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <p className="subtext max-w-2xl">
          Every request to the analytics API, by who made it. Limits are in{" "}
          <span style={{ color: CHART.green }}>observe-only mode</span> — the &ldquo;would
          throttle&rdquo; figures count what a limit <em>would</em> have stopped. Nothing
          is being refused.
        </p>
        <div className="flex gap-1 font-mono" data-no-capture="true">
          {WINDOWS.map((w) => (
            <button key={w.hours} onClick={() => setHours(w.hours)}
              className={`rounded border px-2 py-1 text-[12px] transition-colors ${
                hours === w.hours ? "text-[#22E0E6]" : "text-fog-muted hover:text-white"}`}
              style={{ borderColor: hours === w.hours ? CHART.cyan : DIVIDER }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {summary.error && !summary.data && (
        <p className="py-6 font-mono text-[13px] text-fog-dim">Usage data unavailable — {String(summary.error)}</p>
      )}
      {!summary.data && !summary.error && (
        <p className="py-6 font-mono text-[13px] text-fog-dim">Collecting…</p>
      )}

      {summary.data && (
        <div className="font-mono text-[13px]">
          {/* headline numbers */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-t pt-3 sm:grid-cols-4" style={{ borderColor: DIVIDER }}>
            <Stat label="requests" value={formatNum(totals.requests)} hint="Total API calls in this window, from everyone." />
            <Stat label="data served" value={bytes(totals.egress)} hint="Response bytes sent. This is what bandwidth actually costs us." />
            <Stat label="busiest moment" value={peak != null ? `${peak.toFixed(2)}/s` : "···"} hint="Highest average request rate in any single bucket of this window." />
            <Stat label="would throttle" value={formatNum(totals.throttled)}
              tone={totals.throttled > 0 ? CHART.amber : undefined}
              hint="Requests a limit would have refused if enforcement were on. Nothing was actually refused." />
          </div>

          {/* traffic over time.
              NEVER pass `fill` here. It is for a grid-stretched card in a paired row:
              useFillHeight measures the container and grows the plot into the leftover
              space, so in a full-width card whose own height depends on its content
              that is a feedback loop — the plot grew unbounded and the page visibly
              juddered. A fixed height is correct for a stacked section. */}
          <div className="mt-5">
            <div className="section-label mb-1.5">traffic over time</div>
            {trafficPts.length >= 2 ? (
              <AreaLine
                points={trafficPts}
                color={CHART.cyan}
                height={160}
                loading={!series.data && !series.error}
                yLabel="requests"
                fmt={(v) => `${formatNum(v)} requests`}
              />
            ) : (
              // A one- or two-point line is not a trend, it is a decoration that
              // invites a wrong read. Say what is actually true instead.
              <p className="font-mono text-[12px] text-fog-dim">
                {series.data
                  ? `Not enough history yet — ${trafficPts.length} interval${trafficPts.length === 1 ? "" : "s"} recorded. The shape appears once collection has run a few hours.`
                  : "Collecting…"}
              </p>
            )}
          </div>

          {/* share of cost, as a composition rather than a column of percentages */}
          <div className="mt-5">
            <div className="section-label mb-1.5">share of cost</div>
            <div className="flex h-3 w-full overflow-hidden rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
              {callers.map((c) => {
                const id = identify(c);
                return (
                  <div key={c.caller} title={`${id.name} · ${(c.cost_share * 100).toFixed(1)}%`}
                    style={{ width: `${Math.max(0, c.cost_share * 100)}%`, background: id.color, opacity: 0.85 }} />
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
              {callers.map((c) => {
                const id = identify(c);
                return (
                  <span key={c.caller} className="inline-flex items-center gap-1.5" title={id.note}>
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: id.color }} />
                    <span className="text-gray-300">{id.name}</span>
                    <span className="text-fog-dim">{(c.cost_share * 100).toFixed(1)}%</span>
                  </span>
                );
              })}
            </div>
            <p className="subtext mt-2">
              Splits what the service costs to run between callers, weighted by server time,
              bandwidth and request count. An allocation of a bill we already pay — not a
              per-request price.
              {monthly == null && " Set API_COST_MONTHLY_USD on the analytics service to see it in dollars."}
            </p>
          </div>

          {/* who is calling */}
          <div className="mt-5">
            <div className="section-label mb-1.5">who is calling</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-[0.08em] text-gray-500" style={{ borderColor: DIVIDER }}>
                    <th className="py-1.5 pr-3 font-semibold">caller</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">requests</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">data</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">server time</th>
                    <th className="py-1.5 text-right font-semibold">would throttle</th>
                  </tr>
                </thead>
                <tbody>
                  {callers.map((c) => {
                    const id = identify(c);
                    return (
                      <tr key={c.caller} className="border-b last:border-b-0" style={{ borderColor: DIVIDER }}>
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: id.color }} />
                            <span className="text-white" title={id.note}>{id.name}</span>
                          </span>
                          <span className="mt-0.5 block pl-4 text-[11px] text-fog-dim">
                            {c.distinct_sources} source{c.distinct_sources === 1 ? "" : "s"}
                            {c.cache_hits > 0 && ` · ${Math.round((c.cache_hits / Math.max(c.requests, 1)) * 100)}% cached`}
                          </span>
                        </td>
                        <td className="num py-2 pr-3 text-right text-gray-300">{formatNum(c.requests)}</td>
                        <td className="num py-2 pr-3 text-right text-gray-300">{bytes(c.egress_bytes)}</td>
                        <td className="num py-2 pr-3 text-right text-gray-300">{ms(c.compute_ms)}</td>
                        <td className="num py-2 text-right" style={{ color: c.throttled > 0 ? CHART.amber : undefined }}>
                          {c.throttled > 0 ? formatNum(c.throttled) : "·"}
                        </td>
                      </tr>
                    );
                  })}
                  {!callers.length && (
                    <tr><td colSpan={5} className="py-4 text-center text-fog-dim">No requests recorded in this window yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* endpoint cost, as bars — a number pair does not show which one hurts */}
          {!!routes.data?.routes?.length && (
            <div className="mt-5">
              <div className="section-label mb-1.5">slowest endpoints</div>
              <p className="subtext mb-2">
                Bar length is the typical response time; the marker is where the slowest 5% begin.
                A low cache rate on a slow endpoint is the expensive combination.
              </p>
              <div className="space-y-1.5">
                {routes.data.routes.slice(0, 8).map((r) => {
                  const w = Math.max(2, (r.mean_ms / slowest) * 100);
                  const tail = r.p95_ms != null ? Math.min(100, (r.p95_ms / slowest) * 100) : null;
                  const slow = r.mean_ms > 3000;
                  return (
                    <div key={r.route} className="flex items-center gap-3"
                      title={`${formatNum(r.requests)} calls · typical ${ms(r.mean_ms)} · slowest 5% from ${r.p95_ms != null ? ms(r.p95_ms) : "n/a"} · ${r.requests ? Math.round((r.cache_hits / r.requests) * 100) : 0}% served from cache`}>
                      <span className="w-[190px] shrink-0 truncate text-[12px] text-gray-300">{r.route}</span>
                      <div className="relative h-3 flex-1 overflow-hidden rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="h-full rounded"
                          style={{ width: `${w}%`, background: slow ? CHART.red : CHART.blue, opacity: 0.8 }} />
                        {tail != null && (
                          <div className="absolute top-0 h-full w-px" style={{ left: `${tail}%`, background: "rgba(255,255,255,0.75)" }} />
                        )}
                      </div>
                      <span className="num w-16 shrink-0 text-right text-[12px]"
                        style={{ color: slow ? CHART.red : "#d1d5db" }}>{ms(r.mean_ms)}</span>
                      <span className="num w-12 shrink-0 text-right text-[12px] text-fog-dim">
                        {r.requests ? `${Math.round((r.cache_hits / r.requests) * 100)}%` : "·"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 flex justify-end gap-4 text-[11px] text-fog-dim">
                <span>│ slowest 5% begins</span><span>right column = served from cache</span>
              </div>
            </div>
          )}

          {/* busiest sources */}
          {!!sources.data?.sources?.length && (
            <div className="mt-5">
              <div className="section-label mb-1.5">busiest sources</div>
              <p className="subtext mb-2">
                One row per network address, shown as a scrambled id — the address itself is
                never stored. This is where a single heavy user shows up.
              </p>
              <div className="space-y-1">
                {sources.data.sources.slice(0, 10).map((s) => {
                  const top = sources.data!.sources[0].requests || 1;
                  return (
                    <div key={`${s.source_id}-${s.caller}`} className="flex items-center gap-3"
                      title={`${formatNum(s.requests)} requests · ${bytes(s.egress_bytes)} · ${s.routes_touched} endpoints touched`}>
                      <span className="w-20 shrink-0 text-[12px] text-gray-400">{s.source_id?.slice(0, 8) ?? "·"}</span>
                      <span className="w-32 shrink-0 truncate text-[12px]"
                        style={{ color: s.caller === "anonymous" ? CHART.amber : CHART.cyan }}>
                        {s.caller === "anonymous" ? "no key" : s.caller}
                      </span>
                      <div className="relative h-2.5 flex-1 overflow-hidden rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="h-full rounded"
                          style={{ width: `${Math.max(2, (s.requests / top) * 100)}%`,
                            background: s.caller === "anonymous" ? CHART.amber : CHART.cyan, opacity: 0.75 }} />
                      </div>
                      <span className="num w-14 shrink-0 text-right text-[12px] text-gray-300">{formatNum(s.requests)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <div title={hint}>
      <div className="text-[11px] uppercase tracking-[0.08em] text-gray-500">{label}</div>
      <div className="num mt-0.5 text-[17px] text-white" style={tone ? { color: tone } : undefined}>{value}</div>
    </div>
  );
}
