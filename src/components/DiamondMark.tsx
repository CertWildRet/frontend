/**
 * DiamondMark — the CWR brand mark.
 *
 * A compact, static brilliant-cut diamond distilled from the hero stone
 * (app/1/stone.tsx): cool blue-silver facets, with a HINT OF GOLD warming the
 * table light so the stone reads against the gold brand.
 *
 * Pass `className` for size + effects (e.g. "h-7 w-7"). Pass a distinct `uid`
 * when the mark appears more than once on a page so the gradient ids stay
 * unique (SVG-id-safe — no React useId, which emits colons).
 */
export function DiamondMark({
  className,
  uid = "d",
  title = "CWR",
}: {
  className?: string;
  uid?: string;
  title?: string;
}) {
  const id = (n: string) => `dm-${uid}-${n}`;
  return (
    <svg
      viewBox="20 22 160 168"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={id("table")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4F8FF" />
          <stop offset="0.5" stopColor="#9DB7D8" />
          <stop offset="1" stopColor="#3A4A63" />
        </linearGradient>
        <linearGradient id={id("crownL")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C9D2DE" />
          <stop offset="1" stopColor="#1C2029" />
        </linearGradient>
        <linearGradient id={id("crownR")} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8EFFA" />
          <stop offset="1" stopColor="#2A3445" />
        </linearGradient>
        <linearGradient id={id("pav")} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#5A6E8C" />
          <stop offset="0.6" stopColor="#1C2333" />
          <stop offset="1" stopColor="#0B1426" />
        </linearGradient>
        <radialGradient id={id("glow")} cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* the hint of gold — a warm kiss of light across the table */}
        <radialGradient id={id("gold")} cx="0.5" cy="0.34" r="0.5">
          <stop offset="0" stopColor="#FFE08A" stopOpacity="0.75" />
          <stop offset="0.55" stopColor="#F5C518" stopOpacity="0.16" />
          <stop offset="1" stopColor="#F5C518" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* pavilion (lower point) */}
      <polygon points="30,72 100,72 100,180" fill={`url(#${id("pav")})`} opacity="0.92" />
      <polygon points="170,72 100,72 100,180" fill={`url(#${id("pav")})`} opacity="0.78" />
      <polygon points="30,72 60,72 100,180" fill="#0B1426" opacity="0.85" />
      <polygon points="170,72 140,72 100,180" fill="#0B1426" opacity="0.7" />

      {/* girdle band, with a faint gold rim */}
      <polygon points="30,68 170,68 170,74 30,74" fill="#C9D2DE" opacity="0.25" />
      <polygon points="30,68 170,68 170,70 30,70" fill="#F5C518" opacity="0.3" />

      {/* crown facets */}
      <polygon points="55,30 145,30 170,68 30,68" fill={`url(#${id("table")})`} opacity="0.95" />
      <polygon points="72,30 128,30 150,52 50,52" fill={`url(#${id("table")})`} />
      <polygon points="72,30 128,30 100,42" fill="#FFFFFF" opacity="0.85" />
      <polygon points="55,30 72,30 50,52 30,68" fill={`url(#${id("crownL")})`} opacity="0.9" />
      <polygon points="145,30 128,30 150,52 170,68" fill={`url(#${id("crownR")})`} opacity="0.9" />
      <polygon points="50,52 150,52 170,68 30,68" fill="#7E93B2" opacity="0.4" />

      {/* bright kite facets */}
      <polygon points="72,30 100,42 100,30" fill="#F4F8FF" opacity="0.7" />
      <polygon points="128,30 100,42 100,30" fill="#D7E2F2" opacity="0.55" />

      {/* facet edges */}
      <g stroke="#E8EFFA" strokeOpacity="0.45" strokeWidth="0.6" fill="none">
        <polyline points="55,30 145,30" />
        <polyline points="72,30 50,52" />
        <polyline points="128,30 150,52" />
        <polyline points="50,52 150,52" />
        <polyline points="30,68 100,42 170,68" />
        <polyline points="100,42 100,30" />
      </g>
      <g stroke="#9DB7D8" strokeOpacity="0.3" strokeWidth="0.5" fill="none">
        <polyline points="30,72 100,180 170,72" />
        <polyline points="60,72 100,180" />
        <polyline points="140,72 100,180" />
        <polyline points="100,74 100,180" />
      </g>

      {/* table glow + gold kiss */}
      <ellipse cx="100" cy="44" rx="30" ry="14" fill={`url(#${id("glow")})`} />
      <ellipse cx="100" cy="41" rx="25" ry="11" fill={`url(#${id("gold")})`} />
    </svg>
  );
}
