export function RefinedComingSoon() {
  return (
    <div className="card relative overflow-hidden">
      <span className="chip absolute right-5 top-5 border-amber/30 text-amber">coming soon</span>
      <h3 className="font-display text-lg font-semibold text-white">Refined</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-fog-dim">
        The next pool. A sharper engine for power users who hold longer and want refined results,
        squeezing more out of every round without you ever signing a thing.
      </p>
      <ul className="mt-4 space-y-1.5 font-mono text-xs text-fog-muted">
        <li>› a smarter engine tuned for higher APY</li>
        <li>› built for longer-horizon CWR positions</li>
        <li>› and many more APY pro tactics under the hood</li>
        <li>› the same non-custodial, on-chain mining</li>
      </ul>
      <button
        disabled
        className="mt-5 cursor-not-allowed rounded-lg border border-line px-4 py-2 text-sm text-fog-muted"
      >
        Not yet live
      </button>
    </div>
  );
}
