"use client";

/**
 * Interactive Ore Data shell — TabBar + visited-tab mounting.
 * Keeps the last few visited tabs mounted (hidden) so recent switches are
 * instant; older tabs unmount to free chart/table memory.
 *
 * Miner lookup lives on /search; goToMiner navigates there.
 */
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";
import { TabBar, tabBarIdleClass, tabDisplayFont } from "@/components/primitives/TabBar";
import { useSearchMinerModal } from "@/components/SearchMinerModal";
import { ChartWatermarkContext } from "@/components/stats/Charts";
import { CohortTab } from "@/components/stats/CohortTab";
import { RwaTab } from "@/components/stats/RwaTab";
import { PolledActiveContext } from "@/hooks/useOreStats";
import { TrendsTab } from "./TrendsTab";
import { EcosystemTab } from "./EcosystemTab";
import { RoundAnalysisTab } from "./RoundAnalysisTab";
import { MinerRankingsTab } from "./MinerRankingsTab";
import { MotherlodeTab } from "./MotherlodeTab";
import { RoundsTab } from "./RoundsTab";
import { TileModesTab } from "./TileModesTab";
import {
  TABS,
  MinerNavContext,
  type Tab,
} from "./shared";
import styles from "./stats.module.css";

/** Max Ore Data tabs kept mounted (current + recent). Older ones unmount. */
const MAX_VISITED_TABS = 2;

const TAB_IDS = new Set<Tab>(TABS.map((tab) => tab.id));
const tabFromQuery = (raw: string | null): Tab => {
  if (!raw) return "trends";
  const normalized = raw.toLowerCase().replaceAll("-", "_");
  if (normalized === "miner_rankings") return "rankings";
  if (normalized === "protocol" || normalized === "protocol_internals") return "trends";
  if (normalized === "solo_split" || normalized === "split_solo" || normalized === "tilemodes") return "tile_modes";
  return TAB_IDS.has(normalized as Tab) ? normalized as Tab : "trends";
};

function pushVisited(order: Tab[], next: Tab): Tab[] {
  const without = order.filter((id) => id !== next);
  return [...without, next].slice(-MAX_VISITED_TABS);
}

export function StatsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab: Tab = tabFromQuery(searchParams.get("section"));
  const [tab, setTab] = useState<Tab>(requestedTab);
  // LRU of visited tabs — capped so chart-heavy trees don't accumulate forever.
  const [visitedOrder, setVisitedOrder] = useState<Tab[]>(() => [requestedTab]);
  const visited = new Set(visitedOrder);
  const setActiveTab = useCallback((next: Tab) => {
    setVisitedOrder((current) => pushVisited(current, next));
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
      params.delete("miner");
    });
  }, [replaceQuery, setActiveTab]);

  // Browser history and externally changed query strings drive the visible tab.
  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab, setActiveTab]);

  const goToMiner = useCallback((pubkey: string) => {
    const value = pubkey.trim();
    if (!value) return;
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }, [router]);

  const { openSearchMiner } = useSearchMinerModal();

  return (
    <ChartWatermarkContext.Provider value={true}>
    <MinerNavContext.Provider value={goToMiner}>
      <div className={styles.tabDock}>
        <div className="flex items-center gap-2">
          <TabBar
            aria-label="Ore Data sections"
            items={TABS}
            value={tab}
            onChange={openTab}
            underline={false}
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={openSearchMiner}
            title="Search"
            aria-label="Search"
            style={tabDisplayFont}
            className={`${tabBarIdleClass} inline-flex shrink-0 items-center justify-center px-2.5 py-2`}
          >
            <IconSearch size={15} stroke={1.75} aria-hidden />
          </button>
        </div>
      </div>
      <div className={styles.content}>
        {/* Recent tabs stay mounted (instant switching) but pollers PAUSE while
            hidden — see PolledActiveContext. Older visited tabs unmount. */}
        {TABS.map((t) =>
          visited.has(t.id) ? (
            <PolledActiveContext.Provider key={t.id} value={tab === t.id}>
              <div hidden={tab !== t.id}>
                {t.id === "trends" ? <TrendsTab /> :
                 t.id === "ecosystem" ? <EcosystemTab /> :
                 t.id === "round_analysis" ? <RoundAnalysisTab /> :
                 t.id === "rankings" ? <MinerRankingsTab /> :
                 t.id === "motherlode" ? <MotherlodeTab /> :
                 t.id === "rounds" ? <RoundsTab /> :
                 t.id === "tile_modes" ? <TileModesTab /> :
                 t.id === "cohort" ? <CohortTab /> : <RwaTab />}
              </div>
            </PolledActiveContext.Provider>
          ) : null,
        )}
      </div>
    </MinerNavContext.Provider>
    </ChartWatermarkContext.Provider>
  );
}
