import type { ReactNode } from "react";
import styles from "./loupe.module.css";
import { ConceptSwitcher } from "./switcher";

export default function LoupeLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`fixed inset-0 z-[100] overflow-y-auto bg-[#0A0E15] text-[#EAEEF4] ${styles.canvas}`}
      style={{ fontFamily: "'Sora Variable', system-ui, sans-serif" }}
    >
      {/* faint blueprint parallax layer */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-0 ${styles.parallax}`}
      />
      <div className="relative z-10">{children}</div>
      <ConceptSwitcher />
    </div>
  );
}
