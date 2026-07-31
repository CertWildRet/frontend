"use client";

import { useState } from "react";

/**
 * Renders a wallet address with a copy-to-clipboard icon.
 * `address` is the full address (copied on click); displayed as `abcd…wxyz`
 * unless `truncate={false}` shows the full string, or `iconOnly` shows just the button.
 * Pass `className` to style the wrapper span.
 */
export function CopyAddress({
  address,
  className = "",
  truncate = true,
  iconOnly = false,
}: {
  address: string | null | undefined;
  className?: string;
  truncate?: boolean;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!address) return iconOnly ? null : <span className={className}>·</span>;

  const display = truncate ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(address!).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {!iconOnly && (
        <span title={address} className={truncate ? undefined : "min-w-0 break-all"}>
          {display}
        </span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy address"
        title={copied ? "Copied" : "Copy address"}
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
