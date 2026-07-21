import styles from "./stats.module.css";

/** Server-rendered Ore Data hero. */
export function StatsHero() {
  return (
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
      <div className={styles.lens} aria-hidden>
        <span className={styles.lensRing} />
        <div className={styles.board}>
          {Array.from({ length: 25 }).map((_, i) => (
            <span
              key={i}
              className={styles.tile}
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
