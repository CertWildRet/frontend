"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CONCEPTS = [
  { href: "/1", label: "01" },
  { href: "/2", label: "02" },
  { href: "/3", label: "03" },
];

const VIEWS = [
  { href: "/2", label: "Landing" },
  { href: "/2/app", label: "Dashboard" },
];

const mono = { fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace" } as const;

export function ConceptSwitcher() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="concept switcher"
      className="fixed bottom-4 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-1 rounded-[4px] border border-[rgba(180,200,225,0.14)] bg-[#0F141D]/92 px-1.5 py-1.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md"
    >
      <span
        className="hidden px-1.5 text-[9px] uppercase tracking-[0.22em] text-[#626E7E] sm:inline"
        style={mono}
      >
        concept
      </span>
      {CONCEPTS.map((c) => {
        const active = c.href === "/2" ? pathname?.startsWith("/2") : pathname === c.href;
        return (
          <Link
            key={c.href}
            href={c.href}
            className={`flex h-7 w-7 items-center justify-center rounded-[3px] text-[11px] transition ${
              active
                ? "bg-[#EAEEF4] text-[#0A0E15]"
                : "text-[#94A1B3] hover:bg-[#131926]"
            }`}
            style={mono}
          >
            {c.label}
          </Link>
        );
      })}
      <span className="mx-0.5 h-5 w-px bg-[rgba(180,200,225,0.14)]" aria-hidden />
      {VIEWS.map((v) => {
        const active = pathname === v.href;
        return (
          <Link
            key={v.href}
            href={v.href}
            className={`rounded-[3px] px-2.5 py-1 text-[11px] transition ${
              active
                ? "bg-[#4D82FF] text-white"
                : "text-[#94A1B3] hover:bg-[#131926]"
            }`}
            style={mono}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
