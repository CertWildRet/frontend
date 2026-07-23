/**
 * /stats — the ORE-ecosystem Stats page.
 *
 * ORE-first: the whole ORE game (emission, rake, motherlode, competition,
 * miner ranking, production cost). Financial-analyst tabs. ZINC is a placeholder
 * for v1. Native units; USD is a labelled off-chain overlay.
 *
 * Hero is server-rendered; tabs hydrate client-side with visited-tab mounting.
 */
import { Suspense } from "react";
import { StatsHero } from "./StatsHero";
import { StatsClient } from "./StatsClient";
import styles from "./stats.module.css";

export default function StatsPage() {
  return (
    <div className={styles.page}>
      <StatsHero />
      <Suspense fallback={null}>
        <StatsClient />
      </Suspense>
    </div>
  );
}
