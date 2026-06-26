/**
 * FacetMark: the CWR brand mark, matching the nav header logo exactly — the
 * spectral dispersion prism. References the app-wide #site-spectral gradient
 * (defined once in SiteHeader, present on every page via the root layout), so a
 * single source of truth drives every compact mark (footer, panels). The big
 * animated stone is the hero prismShard.
 */
export function FacetMark({ className = "" }: { className?: string }) {
  const sp = "url(#site-spectral)";
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" role="img" aria-label="Diamond Pools">
      <path d="M12 3 21 19 3 19 12 3Z" stroke={sp} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 3 12 19" stroke={sp} strokeWidth="1" opacity="0.6" />
      <path d="M2 12 12 11 22 12" stroke="#EAECF6" strokeWidth="0.9" opacity="0.5" />
    </svg>
  );
}
