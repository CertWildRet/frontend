"use client";

/**
 * CohortInfoModal — the (?) explainer for the Cohort tab's source toggle.
 * Click-to-open dialog (Escape / backdrop / ✕ to close) that spells out the exact
 * difference between the two views, including the stORE and refined nuances that
 * confuse newcomers. Portalled to <body> so no card's overflow-hidden clips it.
 * Fades + scales in/out (200ms, reduced-motion aware); stays mounted through the
 * exit transition so closing animates too, not just opening.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const YES = <span className="text-pos" aria-label="yes">✓</span>;
const NO = <span className="text-fog-muted" aria-label="no">✗</span>;
const Tag = ({ children, tone }: { children: React.ReactNode; tone: "cyan" | "amber" }) => (
  <span className={`ml-1 rounded px-1 py-px text-[10px] font-medium ${tone === "cyan" ? "bg-[#7fe9ee]/10 text-[#7fe9ee]" : "bg-amber/10 text-amber"}`}>
    {children}
  </span>
);

// [row label, Wallet-Holders cell, Unclaimed-Rewards cell]
const ROWS: Array<[string, React.ReactNode, React.ReactNode]> = [
  ["Has unclaimed rewards on the mine", NO, YES],
  ["Claimed their ORE to a wallet", YES, NO],
  ["Bought ORE, never mined", YES, NO],
  ["Staked their ORE into stORE", <>{NO}<Tag tone="cyan">vaulted</Tag></>, NO],
  ["Is a CEX hot wallet", <>{YES}<Tag tone="cyan">whale</Tag></>, NO],
];

export function CohortInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [render, setRender] = useState(open); // mounted (kept true through the exit anim)
  const [shown, setShown] = useState(false); // drives the enter/exit transition classes
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  // Mount + enter/exit animation. On open: mount, then next frame flip `shown` on
  // (transition in). On close: flip `shown` off (transition out), then unmount
  // after the 200ms transition so the close animates rather than snapping away.
  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement;
      setRender(true);
      // Double rAF: let the browser paint the from-state (opacity-0/scale-95) once
      // before flipping to the to-state, otherwise the mount and the class change
      // land in the same frame and the enter transition snaps instead of animating.
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
    setShown(false);
    const t = setTimeout(() => {
      setRender(false);
      (lastFocus.current as HTMLElement | null)?.focus?.(); // restore focus to the trigger
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  // While mounted: Escape closes, and body scroll is locked.
  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [render, onClose]);

  // Focus the close button once the panel is shown.
  useEffect(() => {
    if (shown) closeRef.current?.focus();
  }, [shown]);

  if (!render || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${shown ? "opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cohort-info-title"
    >
      <div
        className={`my-auto w-full max-w-xl origin-center rounded-2xl border border-line bg-ink-900 shadow-2xl transition-all duration-200 ease-out motion-reduce:transition-none ${shown ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id="cohort-info-title" className="font-mono text-[15px] font-bold text-fog">
            Wallet Holders <span className="text-fog-muted">vs</span> Unclaimed Rewards
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-md px-2 py-1 text-fog-muted transition-colors hover:bg-white/5 hover:text-fog focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 font-mono text-[12.5px] leading-relaxed text-silver">
          {/* two one-line definitions, colour-matched to the banners */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-[#7fe9ee]/25 bg-[#7fe9ee]/[0.06] px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7fe9ee]">Wallet Holders</div>
              <p className="mt-1 text-silver">
                ORE actually sitting in wallets — the <span className="text-fog">true token distribution</span> (~70% of circulating).
              </p>
            </div>
            <div className="rounded-lg border border-amber/20 bg-amber/[0.05] px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-amber">Unclaimed Rewards</div>
              <p className="mt-1 text-silver">
                Mined ORE still <span className="text-fog">on the mine</span>, not yet claimed out (~23% of circulating).
              </p>
            </div>
          </div>

          {/* who-shows-where table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-fog-muted">
                  <th className="py-2 pr-3 font-medium">Someone who…</th>
                  <th className="px-3 py-2 text-center font-medium text-[#7fe9ee]">Wallet<br />Holders</th>
                  <th className="pl-3 py-2 text-center font-medium text-amber">Unclaimed<br />Rewards</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, wallet, unclaimed], i) => (
                  <tr key={i} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-silver">{label}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">{wallet}</td>
                    <td className="pl-3 py-2 text-center whitespace-nowrap">{unclaimed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* the fine print — the nuances that actually trip people up */}
          <ul className="space-y-2 text-[11.5px] text-silver">
            <li>
              <span className="text-fog">Wallet Holders is liquid ORE only.</span> It counts the ORE token, not stORE. ORE that&apos;s been
              staked into stORE sits in the stake vault and shows in the separate <span className="text-fog">vaulted</span> figure under the
              donut — so a pure stORE staker shows as 0 here.
            </li>
            <li>
              <span className="text-fog">Unclaimed Rewards is unclaimed ORE only</span> — unclaimed mining rewards + pending refined ORE
              (both ORE, no stORE, no SOL).
            </li>
            <li>
              <span className="text-fog">Vaulted is excluded from both.</span> Protocol vaults (the mine treasury + stORE stake vault, ~143k
              ORE) are reported separately, never as holder whales.
            </li>
            <li>
              <span className="text-fog">A &ldquo;whale&rdquo; means different things.</span> In Wallet Holders it&apos;s a wallet holding a
              lot of ORE (which may be an exchange, not a person — custodial wallets can&apos;t be labeled); in Unclaimed Rewards it&apos;s a miner
              with a lot of un-claimed mine ORE. That, and the claimed-vs-unclaimed split above, is why the two views can differ ~3x.
            </li>
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
