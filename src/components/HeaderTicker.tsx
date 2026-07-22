"use client";

import { useEffect, useState } from "react";
import { formatNum } from "@/lib/format";

type Ticker = {
  sol_usd: number | null;
  ore_usd: number | null;
  ore_sol: number | null;
  uore_apr: number | null;
  store_apr: number | null;
  motherlode_pool_ore: number | null;
  motherlode_odds: number | null;
};

/**
 * Live market strip in the site header: spot prices, motherlode pool, and yields.
 * Reads the Vercel-cached /api/ticker (60s revalidate) and re-polls each minute,
 * so the upstream analytics service load is constant regardless of visitors.
 */
export function HeaderTicker() {
  const [t, setT] = useState<Ticker | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/ticker")
        .then((r) => r.json())
        .then((j) => { if (alive && j?.data) setT(j.data); })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!t) return null;

  const items: { label: string; value: string; color: string; title: string }[] = [];
  if (t.ore_usd != null) items.push({ label: "ORE", value: `$${t.ore_usd.toFixed(2)}`, color: "#22E0E6", title: "ORE spot price (USD)" });
  if (t.sol_usd != null) items.push({ label: "SOL", value: `$${t.sol_usd.toFixed(2)}`, color: "#9DB7D8", title: "SOL spot price (USD)" });
  if (t.ore_sol != null) items.push({ label: "ORE/SOL", value: t.ore_sol.toFixed(3), color: "#EAECF6", title: "How many SOL one ORE is worth" });
  if (t.motherlode_pool_ore != null) {
    items.push({
      label: "ML:",
      value: `${formatNum(t.motherlode_pool_ore, 1)} Ore`,
      color: "#EAECF6",
      title: `Current motherlode pool size — pays out when the motherlode hits (1-in-${t.motherlode_odds ?? 500} rounds)`,
    });
  }
  if (t.store_apr != null) items.push({ label: "stORE APR", value: `${t.store_apr.toFixed(1)}%`, color: "#E8881A", title: "stORE staking yield, annualized over a rolling window of up to 7 days" });
  if (t.uore_apr != null) items.push({ label: "uORE APR", value: `${t.uore_apr.toFixed(1)}%`, color: "#FFC061", title: "Refining yield on unclaimed ORE, annualized over a rolling window of up to 7 days" });
  if (!items.length) return null;

  return (
    <div className="hidden min-w-0 items-center gap-4 overflow-hidden lg:flex" aria-label="live ORE market ticker">
      {items.map((it) => (
        <span key={it.label} className="flex shrink-0 items-baseline gap-1.5" title={it.title}>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8b93b4]">{it.label}</span>
          <span className="font-mono text-[12.5px] font-bold tabular-nums" style={{ color: it.color }}>{it.value}</span>
        </span>
      ))}
    </div>
  );
}
