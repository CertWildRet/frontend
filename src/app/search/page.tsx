/**
 * /search — look up an ORE miner by Solana wallet address.
 * Shows only the MinerDetail P&L panel (no leaderboard table).
 */
import { Suspense } from "react";
import { SearchClient } from "./SearchClient";
import styles from "@/app/stats/stats.module.css";

export default function SearchPage() {
  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
