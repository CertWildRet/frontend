"use client";

/**
 * Interactive Ore Data shell — TabBar + visited-tab mounting.
 * Visited tabs stay mounted (hidden) so fetched data + pagination survive switches.
 */
import { useState } from "react";
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

export function StatsClient() {
  const [tab, setTab] = useState<Tab>("trends");
  // Visited tabs stay MOUNTED (hidden) so their fetched data + pagination
  // survive tab switches — switching back is instant instead of a blank refetch.
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set(["trends" as Tab]));
  const openTab = (t: Tab) => { setVisited((v) => (v.has(t) ? v : new Set(v).add(t))); setTab(t); };
  // Jump-to-miner: open the Search Miners tab with the wallet pre-filled.
  const [minerSeed, setMinerSeed] = useState<MinerSeed | null>(null);
  const goToMiner = (pubkey: string) => { setMinerSeed((s) => ({ pubkey, n: (s?.n ?? 0) + 1 })); openTab("miners"); };

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
                 t.id === "miners" ? <MinersTab seed={minerSeed} /> :
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
