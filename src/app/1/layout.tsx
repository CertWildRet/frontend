import type { ReactNode } from "react";
import styles from "./pressure.module.css";
import { ConceptSwitcher } from "./switcher";

export default function PressureLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`fixed inset-0 z-[100] overflow-y-auto bg-[#05060A] text-[#F4F8FF] ${styles.canvas}`}
      style={{ fontFamily: "'Sora Variable', system-ui, sans-serif" }}
    >
      {/* ambient void texture — fine grid + vignette, one cold falloff */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 80% at 72% 24%, rgba(157,183,216,0.10), transparent 55%)," +
            "radial-gradient(100% 100% at 50% 120%, rgba(11,20,38,0.5), transparent 60%)," +
            "linear-gradient(180deg, #05060A 0%, #070810 60%, #05060A 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,210,222,0.6) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(201,210,222,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(100% 80% at 50% 30%, black, transparent 80%)",
        }}
      />
      <div className="relative z-10">{children}</div>
      <ConceptSwitcher />
    </div>
  );
}
