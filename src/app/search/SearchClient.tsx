"use client";

/**
 * Search Miner — paste a wallet, load MinerDetail. No results table.
 * URL: /search?q=<pubkey> (also accepts legacy ?miner=).
 */
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ADDRESS_RE, SearchMinerBox } from "@/components/SearchMinerBox";
import { TileSkeleton } from "@/components/primitives/Skeleton";
import { MinerDetail } from "@/components/stats/MinerDetail";

/** Shown while the address is committing or MinerDetail's first fetch is in flight. */
export function MinerSearchLoading() {
  return (
    <div role="status" aria-busy aria-live="polite" aria-label="Loading miner" className="space-y-3">
      <p className="flex items-center gap-2 font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-[#9fe8ec]">
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#22E0E6]" aria-hidden />
        Loading miner…
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TileSkeleton />
        <TileSkeleton />
        <TileSkeleton />
        <TileSkeleton />
      </div>
    </div>
  );
}

export function SearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = (searchParams.get("q") ?? searchParams.get("miner") ?? "").trim();

  const [qInput, setQInput] = useState(urlQ);
  const [q, setQ] = useState(urlQ);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const typedAddress = ADDRESS_RE.test(qInput.trim()) ? qInput.trim() : null;
  const exactAddress = ADDRESS_RE.test(q) ? q : null;
  // Debounce still owns the URL/`q`, but a newly pasted address must not keep
  // showing the previous miner's panel beside the loading shell.
  const awaitingCommit = !!typedAddress && typedAddress !== exactAddress;

  useEffect(() => {
    setDetailLoading(Boolean(exactAddress));
  }, [exactAddress]);

  const onDetailReady = useCallback(() => setDetailLoading(false), []);

  const showLoading = awaitingCommit || (!!exactAddress && detailLoading);
  const showDetail = !!exactAddress && !awaitingCommit;

  return (
    <div className="space-y-5">
      <SearchMinerBox
        value={qInput}
        onChange={setQInput}
        onClear={() => { setQInput(""); setQ(""); replaceQuery(""); }}
        autoFocus={!typedAddress}
        showingResults={!!typedAddress}
      />

      {showLoading && <MinerSearchLoading />}
      {showDetail && (
        <MinerDetail
          key={exactAddress}
          pubkey={exactAddress}
          onReady={onDetailReady}
        />
      )}
    </div>
  );
}
