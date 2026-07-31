"use client";

/**
 * Search Miner — paste a wallet, load MinerDetail. No results table.
 * URL: /search?q=<pubkey> (also accepts legacy ?miner=).
 */
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ADDRESS_RE, SearchMinerBox } from "@/components/SearchMinerBox";
import { MinerDetail } from "@/components/stats/MinerDetail";

export function SearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = (searchParams.get("q") ?? searchParams.get("miner") ?? "").trim();

  const [qInput, setQInput] = useState(urlQ);
  const [q, setQ] = useState(urlQ);

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

  return (
    <div className="mt-[22px] space-y-5">
      <SearchMinerBox
        value={qInput}
        onChange={setQInput}
        onClear={() => { setQInput(""); setQ(""); replaceQuery(""); }}
        autoFocus
      />

      {exactAddress && <MinerDetail pubkey={exactAddress} />}
    </div>
  );
}
