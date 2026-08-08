import type { Metadata } from "next";
import { HealthClient } from "./HealthClient";
import { OpsGate } from "./OpsGate";

// Ops readout — URL-only by design (no nav item), so keep it out of indexes.
export const metadata: Metadata = {
  title: "Platform health · Diamond Pools",
  robots: { index: false, follow: false },
};

export default function PlatformHealthPage() {
  // The gate wraps everything so no poller starts and no partial data renders before
  // a session exists. The real enforcement is server-side (analytics returns 401 for
  // /ore/health and /admin/*); this is the part a human sees.
  return (
    <OpsGate>
      <HealthClient />
    </OpsGate>
  );
}
