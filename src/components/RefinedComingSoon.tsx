export function RefinedComingSoon() {
  return (
    <div className="card relative overflow-hidden">
      <span className="chip absolute right-5 top-5 border-amber/30 text-amber">coming soon</span>
      <h3 className="font-display text-lg font-semibold text-white">Refined</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-fog-dim">
        The next pool. The same disciplined 25 tile mining as Simple, with an extra variance budget
        tuned for depositors who stay in for the long haul.
      </p>
      <ul className="mt-4 space-y-1.5 font-mono text-xs text-fog-muted">
        <li>› a heavier swing budget on top of the base engine</li>
        <li>› a longer horizon CWR position</li>
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
