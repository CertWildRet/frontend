import type { ReactNode } from "react";
import styles from "./dispersion.module.css";
import { ConceptSwitcher } from "./switcher";

export default function DispersionLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`fixed inset-0 z-[100] overflow-y-auto bg-[#070912] text-[#EAECF6] ${styles.canvas}`}
      style={{ fontFamily: "'Sora Variable', system-ui, sans-serif" }}
    >
      {/* indigo-black base wash */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, #0E1222 0%, #090B16 50%, #070912 100%)",
        }}
      />
      {/* slow spectral aurora drift */}
      <div aria-hidden className={styles.aurora} />
      {/* occasional volumetric beam sweep */}
      <div aria-hidden className={styles.beamSweep} />
      {/* iridescent foil grain */}
      <div aria-hidden className={styles.foil} />
      {/* fine crystalline grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(154,167,216,0.7) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(154,167,216,0.7) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(110% 80% at 50% 24%, black, transparent 82%)",
          WebkitMaskImage:
            "radial-gradient(110% 80% at 50% 24%, black, transparent 82%)",
        }}
      />

      <div className="relative z-10">{children}</div>
      <ConceptSwitcher />
    </div>
  );
}
