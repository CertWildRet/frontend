import styles from "./pressure.module.css";

/**
 * HeroStone - a layered brilliant-cut diamond, the single light source.
 * Built as inline SVG facets with specular highlights. Slowly rotates,
 * breathes light, throws caustic streaks. Pure CSS/SVG, no deps.
 */
export function HeroStone({ size = 520 }: { size?: number }) {
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* caustic light streaks drifting behind the stone */}
      <div className={`absolute inset-0 ${styles.causticDrift}`}>
        <div
          className="absolute left-1/2 top-1/2 h-[140%] w-[2px] -translate-x-1/2 -translate-y-1/2 rotate-[20deg]"
          style={{ background: "linear-gradient(transparent, rgba(157,183,216,0.55), transparent)" }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[140%] w-[1px] -translate-x-1/2 -translate-y-1/2 -rotate-[35deg]"
          style={{ background: "linear-gradient(transparent, rgba(244,248,255,0.4), transparent)" }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[2px] w-[150%] -translate-x-1/2 -translate-y-1/2 rotate-[8deg]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(157,183,216,0.35), transparent)" }}
        />
      </div>

      {/* cold halo */}
      <div
        className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(157,183,216,0.45), rgba(11,20,38,0) 70%)" }}
      />

      {/* the stone itself */}
      <div className={`absolute inset-0 ${styles.stoneBreathe}`}>
        <div className={`h-full w-full ${styles.stoneSpin}`}>
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <defs>
              <linearGradient id="p1-tableFace" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F4F8FF" />
                <stop offset="0.5" stopColor="#9DB7D8" />
                <stop offset="1" stopColor="#3A4A63" />
              </linearGradient>
              <linearGradient id="p1-crownL" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#C9D2DE" />
                <stop offset="1" stopColor="#1C2029" />
              </linearGradient>
              <linearGradient id="p1-crownR" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#E8EFFA" />
                <stop offset="1" stopColor="#2A3445" />
              </linearGradient>
              <linearGradient id="p1-pavilion" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0" stopColor="#5A6E8C" />
                <stop offset="0.6" stopColor="#1C2333" />
                <stop offset="1" stopColor="#0B1426" />
              </linearGradient>
              <radialGradient id="p1-glow" cx="0.5" cy="0.42" r="0.6">
                <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
                <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ── pavilion (lower point) ── */}
            <polygon points="30,72 100,72 100,180" fill="url(#p1-pavilion)" opacity="0.92" />
            <polygon points="170,72 100,72 100,180" fill="url(#p1-pavilion)" opacity="0.78" />
            <polygon points="30,72 60,72 100,180" fill="#0B1426" opacity="0.85" />
            <polygon points="170,72 140,72 100,180" fill="#0B1426" opacity="0.7" />

            {/* ── girdle band ── */}
            <polygon points="30,68 170,68 170,74 30,74" fill="#C9D2DE" opacity="0.25" />

            {/* ── crown facets ── */}
            <polygon points="55,30 145,30 170,68 30,68" fill="url(#p1-tableFace)" opacity="0.95" />
            {/* table */}
            <polygon points="72,30 128,30 150,52 50,52" fill="url(#p1-tableFace)" />
            <polygon points="72,30 128,30 100,42" fill="#FFFFFF" opacity="0.85" />
            {/* crown sides */}
            <polygon points="55,30 72,30 50,52 30,68" fill="url(#p1-crownL)" opacity="0.9" />
            <polygon points="145,30 128,30 150,52 170,68" fill="url(#p1-crownR)" opacity="0.9" />
            <polygon points="50,52 150,52 170,68 30,68" fill="#7E93B2" opacity="0.4" />

            {/* bright kite facets */}
            <polygon points="72,30 100,42 100,30" fill="#F4F8FF" opacity="0.7" />
            <polygon points="128,30 100,42 100,30" fill="#D7E2F2" opacity="0.55" />

            {/* edges / facet lines */}
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

            {/* central table glow */}
            <ellipse cx="100" cy="44" rx="30" ry="14" fill="url(#p1-glow)" />
          </svg>
        </div>
      </div>

      {/* pinpoint sparkles on facets */}
      <div className={`absolute left-[34%] top-[26%] ${styles.sparkle}`} style={{ animationDelay: "0s" }}>
        <Spark />
      </div>
      <div className={`absolute left-[63%] top-[40%] ${styles.sparkle}`} style={{ animationDelay: "4.5s" }}>
        <Spark />
      </div>
    </div>
  );
}

function Spark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22">
      <path
        d="M11 0 L12.4 9.6 L22 11 L12.4 12.4 L11 22 L9.6 12.4 L0 11 L9.6 9.6 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
