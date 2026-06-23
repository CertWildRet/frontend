"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./dispersion.module.css";

const CONCEPTS = [
  { label: "01", href: "/1" },
  { label: "02", href: "/2" },
  { label: "03", href: "/3" },
];

const VIEWS = [
  { label: "Landing", href: "/3" },
  { label: "Dashboard", href: "/3/app" },
];

export function ConceptSwitcher() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2"
      aria-label="Concept switcher"
    >
      <div
        className={`${styles.glass} ${styles.spectralEdge} flex items-center gap-1 rounded-full px-2 py-1.5`}
      >
        {CONCEPTS.map((c) => {
          const active =
            c.href === "/3"
              ? pathname === "/3" || pathname === "/3/app"
              : pathname === c.href || pathname?.startsWith(c.href + "/");
          return (
            <Link
              key={c.label}
              href={c.href}
              className={`rounded-full px-2.5 py-1 text-[12px] tracking-[0.22em] transition-colors ${
                active
                  ? "bg-[rgba(234,236,246,0.92)] text-[#070912]"
                  : "text-[#9AA7C8] hover:text-[#EAECF6]"
              }`}
              style={{ fontFamily: "'JetBrains Mono Variable', monospace" }}
            >
              {c.label}
            </Link>
          );
        })}
        <span className="mx-1 h-4 w-px bg-[rgba(154,167,216,0.2)]" />
        {VIEWS.map((v) => {
          const active = pathname === v.href;
          return (
            <Link
              key={v.label}
              href={v.href}
              className={`rounded-full px-2.5 py-1 text-[12px] tracking-[0.14em] transition-colors ${
                active ? "text-[#EAECF6]" : "text-[#6E7AA0] hover:text-[#C6CCEC]"
              }`}
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              {v.label}
              {active && (
                <span
                  className="ml-1.5 inline-block h-1 w-1 rounded-full align-middle"
                  style={{
                    background:
                      "linear-gradient(90deg,#22E0E6,#9A6BFF)",
                    boxShadow: "0 0 6px rgba(91,108,255,0.9)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
