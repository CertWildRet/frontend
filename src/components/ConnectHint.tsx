/**
 * Passive "Connect Wallet" cue shown inside the action cards when no wallet is
 * connected. Deliberately NOT a button - flat fill, gold outline, no glow - so
 * it does not compete with the real connect button in the nav (top right).
 */
export function ConnectHint() {
  return (
    <div
      className="w-full cursor-default select-none rounded-lg border border-gold/40 bg-ink-800/70 py-2.5 text-center font-display text-sm font-semibold text-gold/80"
      role="note"
    >
      <span aria-hidden>Connect Wallet</span>
      <span className="sr-only">
        Connect your wallet using the Connect Wallet button in the top navigation to continue.
      </span>
    </div>
  );
}
