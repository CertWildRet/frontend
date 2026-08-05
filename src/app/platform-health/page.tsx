import type { Metadata } from "next";
import { HealthClient } from "./HealthClient";

// Ops readout — URL-only by design (no nav item), so keep it out of indexes.
export const metadata: Metadata = {
  title: "Platform health · Diamond Pools",
  robots: { index: false, follow: false },
};

export default function PlatformHealthPage() {
  return <HealthClient />;
}
