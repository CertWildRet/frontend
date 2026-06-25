/**
 * FacetMark: the CWR brand logo (the small diamond from the 1/ nav header).
 * Simple line-art facets in the diamond's blue-silver. Used everywhere a compact
 * mark is needed (nav, footer, panel, vault). The big animated stone is HeroStone.
 */
export function FacetMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" role="img" aria-label="Diamond Pools">
      <path d="M5 9 L12 3 L19 9 L12 21 Z" fill="#9DB7D8" fillOpacity="0.25" />
      <path d="M5 9 L19 9 L12 21 Z" fill="#1C2029" />
      <path d="M5 9 L12 3 L19 9" stroke="#C9D2DE" strokeOpacity="0.7" strokeWidth="1" />
      <path d="M5 9 L12 21 L19 9" stroke="#9DB7D8" strokeOpacity="0.5" strokeWidth="0.8" />
      <path d="M9 6 L12 3 L15 6" stroke="#F4F8FF" strokeWidth="0.8" />
    </svg>
  );
}
