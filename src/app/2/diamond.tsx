import styles from "./loupe.module.css";

/**
 * Emerald / step-cut diamond rendered as a technical wireframe blueprint.
 * Orthogonal facet lines, table / crown / pavilion visible, with annotation
 * dimension lines and tiny measurement labels. Draws itself on load.
 */
export function DiamondWireframe({
  className = "",
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  const d = (cls: string) => (animate ? `${styles.draw} ${cls}` : "");
  return (
    <svg
      viewBox="0 0 420 460"
      className={className}
      fill="none"
      role="img"
      aria-label="technical wireframe of an emerald-cut diamond"
    >
      {/* faint top sheen on the table */}
      <defs>
        <linearGradient id="loupe-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2BD4E0" stopOpacity="0.16" />
          <stop offset="1" stopColor="#2BD4E0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* girdle outline (step-cut, octagonal) */}
      <polygon points="110,150 150,110 270,110 310,150 310,170 270,210 150,210 110,170" fill="url(#loupe-sheen)" />

      {/* CROWN - table + step facets (top half) */}
      <g stroke="#CFE9F1" strokeWidth="1.4" className={d(styles.draw)}>
        {/* outer crown silhouette */}
        <polygon points="110,150 150,110 270,110 310,150 310,170 270,210 150,210 110,170" />
      </g>
      <g stroke="#2BD4E0" strokeWidth="1.2" className={d(styles.draw2)}>
        {/* table (inner rectangle) */}
        <polygon points="140,140 280,140 280,180 140,180" />
        {/* step facets connecting table to girdle */}
        <line x1="110" y1="150" x2="140" y2="140" />
        <line x1="150" y1="110" x2="140" y2="140" />
        <line x1="270" y1="110" x2="280" y2="140" />
        <line x1="310" y1="150" x2="280" y2="140" />
        <line x1="110" y1="170" x2="140" y2="180" />
        <line x1="150" y1="210" x2="140" y2="180" />
        <line x1="270" y1="210" x2="280" y2="180" />
        <line x1="310" y1="170" x2="280" y2="180" />
      </g>

      {/* PAVILION - step facets converging to culet (bottom) */}
      <g stroke="#D6E4F5" strokeWidth="1.4" className={d(styles.draw3)}>
        <line x1="110" y1="170" x2="180" y2="370" />
        <line x1="310" y1="170" x2="240" y2="370" />
        <line x1="150" y1="210" x2="180" y2="370" />
        <line x1="270" y1="210" x2="240" y2="370" />
        <line x1="180" y1="370" x2="240" y2="370" />
      </g>
      <g stroke="#2BD4E0" strokeWidth="1" className={d(styles.draw4)} opacity="0.85">
        {/* pavilion step rows */}
        <line x1="135" y1="250" x2="285" y2="250" />
        <line x1="158" y1="312" x2="262" y2="312" />
        {/* center axis */}
        <line x1="210" y1="110" x2="210" y2="370" strokeDasharray="3 5" opacity="0.5" />
      </g>

      {/* refraction ray tracing through the stone (loops) */}
      <g
        stroke="#2BD4E0"
        strokeWidth="1.3"
        style={{ filter: "drop-shadow(0 0 4px rgba(43,212,224,0.55))" }}
      >
        <polyline
          className={animate ? styles.ray : ""}
          points="150,110 210,180 175,250 230,312 210,370"
          opacity="0.95"
        />
      </g>

      {/* ---- ANNOTATIONS / dimension lines ---- */}
      <g
        stroke="#626E7E"
        strokeWidth="0.8"
        className={animate ? styles.annot : ""}
        strokeDasharray="2 3"
      >
        {/* table width dim */}
        <line x1="140" y1="92" x2="280" y2="92" />
        <line x1="140" y1="88" x2="140" y2="98" />
        <line x1="280" y1="88" x2="280" y2="98" />
        {/* depth dim */}
        <line x1="350" y1="110" x2="350" y2="370" />
        <line x1="346" y1="110" x2="354" y2="110" />
        <line x1="346" y1="370" x2="354" y2="370" />
      </g>

      <g
        fill="#7FE3EE"
        fontSize="11"
        style={{ fontFamily: "'JetBrains Mono Variable', monospace", letterSpacing: "0.04em" }}
      >
        <text x="210" y="84" textAnchor="middle" className={animate ? styles.annot : ""}>
          table 57%
        </text>
        <text
          x="362"
          y="244"
          className={animate ? `${styles.annot} ${styles.annot2}` : ""}
          transform="rotate(90 362 244)"
          textAnchor="middle"
        >
          depth 61.5%
        </text>
        <text x="318" y="128" className={animate ? `${styles.annot} ${styles.annot3}` : ""}>
          crown 34.5°
        </text>
        <text x="124" y="398" className={animate ? `${styles.annot} ${styles.annot4}` : ""}>
          culet · none
        </text>
      </g>

      {/* corner ticks */}
      <g stroke="#4D82FF" strokeWidth="1.4">
        <path d="M40 40 h14 M40 40 v14" />
        <path d="M380 40 h-14 M380 40 v14" />
        <path d="M40 420 h14 M40 420 v-14" />
        <path d="M380 420 h-14 M380 420 v-14" />
      </g>
    </svg>
  );
}
