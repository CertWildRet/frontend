"use client";

/**
 * Interactive Ore Data shell — TabBar + visited-tab mounting.
 * Visited tabs stay mounted (hidden) so fetched data + pagination survive switches.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TabBar } from "@/components/primitives/TabBar";
import { ChartWatermarkContext } from "@/components/stats/Charts";
import { CohortTab } from "@/components/stats/CohortTab";
import { PolledActiveContext } from "@/hooks/useOreStats";
import { TrendsTab } from "./TrendsTab";
import { RoundAnalysisTab } from "./RoundAnalysisTab";
import { MinersTab } from "./MinersTab";
import { MotherlodeTab } from "./MotherlodeTab";
import { RoundsTab } from "./RoundsTab";
import {
  TABS,
  MinerNavContext,
  type Tab,
  type MinerSeed,
} from "./shared";
import styles from "./stats.module.css";

const TAB_IDS = new Set<Tab>(TABS.map((tab) => tab.id));
const tabFromQuery = (raw: string | null): Tab => {
  if (!raw) return "trends";
  const normalized = raw.toLowerCase().replaceAll("-", "_");
  if (normalized === "search_miners" || normalized === "miner") return "miners";
  return TAB_IDS.has(normalized as Tab) ? normalized as Tab : "trends";
};

export function StatsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlMiner = searchParams.get("miner")?.trim() || null;
  // A miner deep link wins over a conflicting/missing section so
  // /stats?miner=<address> is sufficient on its own.
  const requestedTab: Tab = urlMiner ? "miners" : tabFromQuery(searchParams.get("section"));
  const [tab, setTab] = useState<Tab>(requestedTab);
  // Visited tabs stay MOUNTED (hidden) so their fetched data + pagination
  // survive tab switches — switching back is instant instead of a blank refetch.
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set([requestedTab]));
  const [minerQuery, setMinerQuery] = useState(urlMiner ?? "");
  const setActiveTab = useCallback((next: Tab) => {
    setVisited((current) => current.has(next) ? current : new Set(current).add(next));
    setTab(next);
  }, []);

  const replaceQuery = useCallback((mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const openTab = useCallback((next: Tab) => {
    setActiveTab(next);
    replaceQuery((params) => {
      params.set("section", next);
      if (next === "miners" && minerQuery) params.set("miner", minerQuery);
      else params.delete("miner");
    });
  }, [minerQuery, replaceQuery, setActiveTab]);

  // Jump-to-miner: open the Search Miners tab with the wallet pre-filled.
  const [minerSeed, setMinerSeed] = useState<MinerSeed | null>(
    () => urlMiner ? { pubkey: urlMiner, n: 1 } : null,
  );
  const lastUrlMiner = useRef(urlMiner);

  // Browser history and externally changed query strings drive the visible tab.
  // Also canonicalize a bare/conflicting `miner=` link to section=miners.
  useEffect(() => {
    setActiveTab(requestedTab);
    if (urlMiner && urlMiner !== lastUrlMiner.current) {
      setMinerQuery(urlMiner);
      setMinerSeed((seed) => ({ pubkey: urlMiner, n: (seed?.n ?? 0) + 1 }));
    }
    lastUrlMiner.current = urlMiner;
    if (urlMiner && searchParams.get("section") !== "miners") {
      replaceQuery((params) => params.set("section", "miners"));
    }
  }, [replaceQuery, requestedTab, searchParams, setActiveTab, urlMiner]);

  const goToMiner = useCallback((pubkey: string) => {
    const value = pubkey.trim();
    if (!value) return;
    setMinerSeed((seed) => ({ pubkey: value, n: (seed?.n ?? 0) + 1 }));
    setMinerQuery(value);
    setActiveTab("miners");
    replaceQuery((params) => {
      params.set("section", "miners");
      params.set("miner", value);
    });
  }, [replaceQuery, setActiveTab]);

  const syncMinerQuery = useCallback((value: string) => {
    const next = value.trim();
    setMinerQuery(next);
    if ((searchParams.get("miner") ?? "") === next && searchParams.get("section") === "miners") return;
    replaceQuery((params) => {
      params.set("section", "miners");
      if (next) params.set("miner", next);
      else params.delete("miner");
    });
  }, [replaceQuery, searchParams]);

  return (
    <ChartWatermarkContext.Provider value={true}>
    <MinerNavContext.Provider value={goToMiner}>
      <div className={styles.tabDock}>
        <TabBar aria-label="Ore Data sections" items={TABS} value={tab} onChange={openTab} />
      </div>
      <div className={styles.content}>
        {/* visited tabs stay mounted (instant switching, state kept) but their
            pollers PAUSE while hidden — see PolledActiveContext */}
        {TABS.map((t) =>
          visited.has(t.id) ? (
            <PolledActiveContext.Provider key={t.id} value={tab === t.id}>
              <div hidden={tab !== t.id}>
                {t.id === "trends" ? <TrendsTab /> :
                 t.id === "round_analysis" ? <RoundAnalysisTab /> :
                 t.id === "miners" ? <MinersTab seed={minerSeed} onQueryChange={syncMinerQuery} /> :
                 t.id === "motherlode" ? <MotherlodeTab /> :
                 t.id === "rounds" ? <RoundsTab /> : <CohortTab />}
              </div>
            </PolledActiveContext.Provider>
          ) : null,
        )}
      </div>
    </MinerNavContext.Provider>
    </ChartWatermarkContext.Provider>
  );
}
