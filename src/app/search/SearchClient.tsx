"use client";

/**
 * Search Miner — paste a wallet, load MinerDetail. No results table.
 * URL: /search?q=<pubkey> (also accepts legacy ?miner=).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChartCard } from "@/components/stats/Charts";
import { MinerDetail } from "@/components/stats/MinerDetail";

const ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function SearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = (searchParams.get("q") ?? searchParams.get("miner") ?? "").trim();

  const [qInput, setQInput] = useState(urlQ);
  const [q, setQ] = useState(urlQ);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // External / deep-link changes win over local debounce.
  useEffect(() => {
    setQInput(urlQ);
    setQ(urlQ);
  }, [urlQ]);

  const replaceQuery = useCallback((next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("miner");
    if (next) params.set("q", next);
    else params.delete("q");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = qInput.trim();
      setQ(next);
      if (next !== urlQ) replaceQuery(next);
    }, 350);
    return () => clearTimeout(t);
  }, [qInput, replaceQuery, urlQ]);

  const exactAddress = ADDRESS_RE.test(q) ? q : null;
  const hasPartial = q.length > 0 && !exactAddress;

  return (
    <div className="mt-[22px] space-y-5">
      <ChartCard
        title="Search Miner"
        subtitle="Look up any ORE miner by Solana wallet address"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[13px] text-fog-muted">
          <input
            ref={inputRef}
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="paste Solana wallet address…"
            aria-label="Search miner address"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="min-w-0 flex-1 rounded-md border border-line bg-ink-800 px-3 py-2 font-mono text-[13px] text-white placeholder:text-fog-muted focus:border-steel focus:outline-none sm:max-w-md"
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQInput(""); setQ(""); replaceQuery(""); }}
              className="rounded border border-line px-2.5 py-1.5 text-[12px] transition-colors hover:border-steel hover:text-white"
            >
              clear
            </button>
          )}
        </div>
        {!q && (
          <p className="mt-4 rounded-lg border border-dashed border-line bg-ink-800/40 px-4 py-8 text-center font-mono text-[13px] text-fog-muted">
            Paste a Solana wallet address to load that miner&apos;s stats.
          </p>
        )}
        {hasPartial && (
          <p className="mt-4 font-mono text-[13px] text-fog-muted">
            Enter a full Solana address (32–44 characters) to load the miner panel.
          </p>
        )}
      </ChartCard>

      {exactAddress && <MinerDetail pubkey={exactAddress} />}
    </div>
  );
}
