export function RefinedComingSoon() {
  return (
    <div className="card relative overflow-hidden opacity-90">
      <span className="badge absolute right-5 top-5 bg-accent-refined/15 text-accent-refined">
        coming soon
      </span>
      <h3 className="text-base font-semibold text-white">Refined</h3>
      <p className="mt-2 max-w-md text-sm text-gray-400">
        The next pool: the same selective 25-tile mining as Simple, plus a motherlode-lottery
        quota and held-ORE refining bonus — for depositors who stay in longer.
      </p>
      <ul className="mt-4 space-y-1.5 text-xs text-muted">
        <li>• Aggressive variance budget on top of the base crank</li>
        <li>• Longer-horizon CWR position</li>
        <li>• Same non-custodial, on-chain mining</li>
      </ul>
      <button
        disabled
        className="mt-5 cursor-not-allowed rounded-md border border-bg-border px-4 py-2 text-sm text-muted"
      >
        Not yet live
      </button>
    </div>
  );
}
