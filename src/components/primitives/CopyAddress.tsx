"use client";

import { useState } from "react";

/**
 * Renders a truncated wallet address with a copy-to-clipboard icon.
 * `address` is the full address (copied on click); displayed as `abcd…wxyz`.
 * Pass `className` to style the wrapper span.
 */
export function CopyAddress({
  address,
  className = "",
}: {
  address: string | null | undefined;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!address) return <span className={className}>—</span>;

  const short = `${address.slice(0, 4)}…${address.slice(-4)}`;

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(address!).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span title={address}>{short}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy address"
        className="group -my-1 flex-shrink-0 rounded p-1.5 text-fog-muted transition hover:bg-white/[0.06] hover:text-white"
      >
        {copied ? (
          // checkmark
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-pos" />
          </svg>
        ) : (
          // copy icon
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <rect x="4" y="4" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 4V2.5A1.5 1.5 0 006.5 1h-4A1.5 1.5 0 001 2.5v4A1.5 1.5 0 002.5 7H4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </span>
  );
}
