/**
 * /stats — the ORE-ecosystem Stats page.
 *
 * ORE-first: the whole ORE game (emission, rake, motherlode, competition,
 * miner ranking, production cost). Financial-analyst tabs. ZINC is a placeholder
 * for v1. Native units; USD is a labelled off-chain overlay.
 *
 * Hero is server-rendered; tabs hydrate client-side with visited-tab mounting.
 * Miner address lookup lives on /search (legacy ?section=miners / ?miner= redirect there).
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { StatsHero } from "./StatsHero";
import { StatsClient } from "./StatsClient";
import styles from "./stats.module.css";

function isLegacySearchSection(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const n = raw.toLowerCase().replaceAll("-", "_");
  return n === "miners" || n === "search_miners" || n === "miner";
}

export default function StatsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const minerRaw = searchParams?.miner;
  const sectionRaw = searchParams?.section;
  const miner = (Array.isArray(minerRaw) ? minerRaw[0] : minerRaw)?.trim() || "";
  const section = Array.isArray(sectionRaw) ? sectionRaw[0] : sectionRaw;

  if (miner || isLegacySearchSection(section)) {
    redirect(miner ? `/search?q=${encodeURIComponent(miner)}` : "/search");
  }

  return (
    <div className={styles.page}>
      <StatsHero />
      <Suspense fallback={null}>
        <StatsClient />
      </Suspense>
    </div>
  );
}
