import styles from "./stats.module.css";

/** Instant nav feedback while the stats route hydrates. */
export default function StatsLoading() {
  return (
    <div className={styles.page} aria-busy aria-label="Loading Ore Data">
      <header className={styles.hero}>
        <h1 className={styles.title}>
          Dig into the Data,
          <br />
          <span className={styles.titleAccent}>Find the Alpha</span>
        </h1>
        <div className={styles.signals} aria-label="Data coverage">
          <span className={styles.signal}>On-chain data</span>
          <span className={styles.signal}>Live polling</span>
          <span className={styles.signal}>Full v3 coverage</span>
        </div>
      </header>
      <div className="mt-6 space-y-3">
        <div className="h-10 animate-pulse rounded-lg bg-white/[0.04]" />
        <div className="h-24 animate-pulse rounded-xl bg-white/[0.04]" />
        <div className="h-48 animate-pulse rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  );
}
