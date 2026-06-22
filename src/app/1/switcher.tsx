"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./pressure.module.css";

const CONCEPTS = [
  { label: "01", href: "/1" },
  { label: "02", href: "/2" },
  { label: "03", href: "/3" },
];

const VIEWS = [
  { label: "Landing", href: "/1" },
  { label: "Dashboard", href: "/1/app" },
];

export function ConceptSwitcher() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2"
      aria-label="Concept switcher"
    >
      <div
        className={`${styles.chip} flex items-center gap-1 border border-[rgba(201,210,222,0.16)] bg-[rgba(12,14,20,0.82)] px-2 py-1.5 backdrop-blur-xl`}
        style={{ boxShadow: "0 24px 60px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(201,210,222,0.18)" }}
      >
        {CONCEPTS.map((c) => {
          const active =
            c.href === "/1"
              ? pathname === "/1" || pathname === "/1/app"
              : pathname === c.href || pathname?.startsWith(c.href + "/");
          return (
            <Link
              key={c.label}
              href={c.href}
              className={`${styles.chip} px-2.5 py-1 text-[11px] tracking-[0.18em] transition-colors ${
                active
                  ? "bg-[rgba(244,248,255,0.92)] text-[#05060A]"
                  : "text-[#9AA7B8] hover:text-[#F4F8FF]"
              }`}
              style={{ fontFamily: "'JetBrains Mono Variable', monospace" }}
            >
              {c.label}
            </Link>
          );
        })}
        <span className="mx-1 h-4 w-px bg-[rgba(201,210,222,0.18)]" />
        {VIEWS.map((v) => {
          const active = pathname === v.href;
          return (
            <Link
              key={v.label}
              href={v.href}
              className={`${styles.chip} px-2.5 py-1 text-[11px] tracking-[0.14em] transition-colors ${
                active
                  ? "text-[#F4F8FF]"
                  : "text-[#6A7689] hover:text-[#C9D2DE]"
              }`}
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              {v.label}
              {active && (
                <span className="ml-1.5 inline-block h-1 w-1 rounded-full bg-[#9DB7D8] align-middle" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
