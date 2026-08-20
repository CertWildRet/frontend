"use client";

/**
 * MiningPoolTechModal — opt-in quantitative / crank details for /pools.
 * Click-to-open dialog (Escape / backdrop / ✕ to close). Portalled to <body>
 * so ChartCard overflow-hidden cannot clip it. Same mount + 200ms enter/exit
 * as CohortInfoModal; no body{overflow:hidden} (that unsticks the header).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const STAMP =
  "Figures = backtest / simulation / 18 Aug 2026 telemetry · not a promise of future results.";

const TABLE: Array<[string, string, string]> = [
  ["Evidence Base", "208,528 Rounds · 21 Jan – 19 Jul 2026", "Full on-chain history"],
  [
    "Distribution (p5)",
    "+118% Over 6 Months",
    "Conservative tail of 2,000+ Monte Carlo paths — not the mean",
  ],
  [
    "Ruin Probability",
    "1.8%",
    "Share of paths where the vault hits its stop floor — a stop, never a debt",
  ],
  ["Negative Months", "2 of 6 (May, Jul)", "Why the slowdown / pause monitor is mandatory"],
  [
    "Parameters",
    "Frozen, Walk-Forward Validated",
    "Configurations that failed out of sample were shelved, not shipped",
  ],
  ["Live vs Model", "Weekly Attribution", "Every SOL of live-vs-model gap is assigned a cause"],
];

const KPIS: Array<[string, string]> = [
  ["208,528", "Rounds · 6-Month Evidence Base"],
  ["+118%", "Monte Carlo 5th Percentile · 95% of Simulated Paths Did Better"],
  ["1.8%", "Ruin Probability · Simulated Paths That Hit the Stop Floor"],
  ["2 / 6", "Negative Months, Disclosed"],
];

const FIRING: Array<[string, string]> = [
  ["Send All Legs in One Transaction.", "The whole plan lands or none of it does."],
  [
    "Decide and Fire in One Pass.",
    "Target under 2 seconds (today ~16 seconds on 75-second rounds).",
  ],
  [
    "Pay for Priority When It Matters.",
    "When cheap cells exist, the opportunity is worth more than a flat fee.",
  ],
  [
    "Measure Crowd-In.",
    "Load at buy vs load at close — so the margin θ is set from data.",
  ],
  [
    "Then Tune the Firing Moment.",
    "Earlier lands more but gets diluted more; that trade-off comes after (4).",
  ],
];

export function MiningPoolTechDetails() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[rgba(14,18,34,0.58)] px-4 py-3 font-mono text-[13px] text-[#C7D0EA] transition-colors hover:border-white/20 hover:text-white"
      >
        Show Quantitative and Technical Details
      </button>
      <MiningPoolTechModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function MiningPoolTechModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement;
      setRender(true);
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
      (lastFocus.current as HTMLElement | null)?.focus?.();
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [render, onClose]);

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
      aria-labelledby="mining-pool-tech-title"
    >
      <div
        className={`my-auto w-full max-w-3xl origin-center rounded-2xl border border-line bg-ink-900 shadow-2xl transition-all duration-200 ease-out motion-reduce:transition-none ${shown ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2
              id="mining-pool-tech-title"
              className="font-mono text-[15px] font-bold text-fog"
            >
              Quantitative and Technical Details
            </h2>
            <p className="mt-1 font-mono text-[12px] text-fog-muted">Mining Pool · dORE</p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-md px-2 py-1 text-fog-muted transition-colors hover:bg-white/5 hover:text-fog focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 px-5 py-4 font-mono text-[12.5px] leading-relaxed text-silver">
          <p className="rounded-lg border border-amber/25 bg-amber/[0.06] px-3 py-2 text-[11.5px] text-amber">
            {STAMP}
          </p>

          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold tracking-tight text-fog">
              Backtest and Monte Carlo
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {KPIS.map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-lg border border-line bg-ink-800 px-3 py-2.5"
                >
                  <div className="text-[18px] font-bold leading-tight text-fog">{value}</div>
                  <div className="mt-1 text-[10.5px] leading-snug text-fog-muted">{label}</div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[10.5px] tracking-wide text-fog-muted">
                    <th className="py-2 pr-3 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                    <th className="pl-3 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE.map(([item, value, note]) => (
                    <tr key={item} className="border-b border-line/60">
                      <td className="py-2 pr-3 whitespace-nowrap text-fog">{item}</td>
                      <td className="px-3 py-2 text-silver">{value}</td>
                      <td className="pl-3 py-2 text-fog-muted">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11.5px] text-silver">
              25 bps per deploy. No entry fee. No performance fee at launch.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold tracking-tight text-fog">
              How the Crank Prices a Round
            </h3>
            <p className="text-silver">
              Each round the crank computes a fair price C for a cell. It buys below C, never
              above.
            </p>
            <ol className="space-y-2">
              <li>
                <span className="text-fog">1. Buy Rule</span>
                {" — "}
                Buy cell i only if the SOL already on it is below C.
              </li>
              <li>
                <span className="text-fog">2. Size Rule</span>
                {" — "}
                Fill up to the geometric mean of load and fair price. Never chase past fair
                value.
              </li>
              <li>
                <span className="text-fog">3. Safety Caps</span>
                {" — "}
                At most 20% of any cell or of the round; at most 1% of vault capital in one
                round; skip dust below 0.001 SOL.
              </li>
            </ol>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-[11.5px]">
              Round #371268 (18 Aug 2026): C = 0.2364 SOL. Eight cells were buyable; the plan
              was 0.0444 SOL. One leg landed in time (0.0114 SOL on cell 7). Cell 7 won. Net
              +0.0150 SOL. A good decision, a late delivery.
            </div>
            <details className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
              <summary className="cursor-pointer text-[11.5px] font-medium text-fog">
                Fair Price Formula
              </summary>
              <p className="mt-2 text-[11.5px] text-silver">
                C = (expected ORE × ORE/SOL price × net-of-fees) / (25 × 10.504% toll × 1.10
                margin). θ = 10%. Jackpot counted at 60% of paper value.
              </p>
            </details>
          </section>

          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold tracking-tight text-fog">
              Crank Firing — What We Are Fixing
            </h3>
            <p>
              On 18 Aug 2026, 72% of rounds were missed at the firing deadline. Even played
              rounds landed only about a quarter of the intended amount. The strategy is
              certified; the delivery is late.
            </p>
            <ol className="space-y-2">
              {FIRING.map(([title, body], i) => (
                <li key={title}>
                  <span className="text-fog">
                    {i + 1}. {title}
                  </span>{" "}
                  {body}
                </li>
              ))}
            </ol>
            <div className="rounded-lg border border-line bg-ink-800 px-3 py-2.5 text-[11.5px] text-silver">
              Missed rounds below 5% (from 72%) · every played round lands its full plan ·
              decision-to-send under 2 seconds.
            </div>
          </section>

          <p className="border-t border-line pt-3 text-[10.5px] leading-relaxed text-fog-muted">
            ORE PR #167 as deployed · 18 Aug 2026 telemetry (1,155 rounds) · round #371268 as
            recorded. Not an offer. Not investment advice.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
