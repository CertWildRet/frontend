"use client";

import { useRef } from "react";
import styles from "./dispersion.module.css";

/* ════════════════════════════════════════════════════════════════
   Shared faceted icons (thin spectral-gradient strokes) + glass parts
   ════════════════════════════════════════════════════════════════ */

const SPECTRAL_ID = "disp-spectral-stroke";

/** A single <defs> spectral gradient injected once per page. */
export function SpectralDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <linearGradient id={SPECTRAL_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22E0E6" />
          <stop offset="30%" stopColor="#5B6CFF" />
          <stop offset="55%" stopColor="#9A6BFF" />
          <stop offset="80%" stopColor="#FF5AC8" />
          <stop offset="100%" stopColor="#FFC061" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type IconProps = { className?: string };
const sp = `url(#${SPECTRAL_ID})`;

export function PrismIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3 21 19 3 19 12 3Z" stroke={sp} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 3 12 19" stroke={sp} strokeWidth="1" opacity="0.6" />
      <path d="M2 12 12 11 22 12" stroke="#EAECF6" strokeWidth="0.9" opacity="0.5" />
    </svg>
  );
}

export function VaultIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke={sp} strokeWidth="1.3" />
      <circle cx="12" cy="12" r="3.4" stroke={sp} strokeWidth="1.2" />
      <path d="M12 12 14 10M12 12 12 8.6M12 12 14.4 13.4" stroke="#EAECF6" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

export function SignerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3 19 6.5V12c0 4.4-3 7-7 9-4-2-7-4.6-7-9V6.5L12 3Z" stroke={sp} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9 12 11.2 14.2 15.2 9.6" stroke="#EAECF6" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClaimIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 7 12 3 20 7 12 11 4 7Z" stroke={sp} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M4 7v6l8 4 8-4V7" stroke="#EAECF6" strokeWidth="1" opacity="0.5" strokeLinejoin="round" />
      <path d="M12 11v8" stroke={sp} strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke={sp} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function FacetIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 2 20 8 17 20 7 20 4 8 12 2Z" stroke={sp} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M12 2 12 20M4 8 20 8M7 20 12 9 17 20" stroke="#EAECF6" strokeWidth="0.8" opacity="0.45" />
    </svg>
  );
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Holographic tilt wrapper - card parallaxes toward pointer. */
export function Tilt({
  children,
  className = "",
  max = 6,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateZ(0)`;
  }
  function onLeave() {
    const el = ref.current;
    if (el) el.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`${styles.tilt} ${className}`}
    >
      {children}
    </div>
  );
}
