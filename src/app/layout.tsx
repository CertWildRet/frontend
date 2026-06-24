import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource-variable/sora";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { WalletButton } from "@/components/WalletButton";
import { FacetMark } from "@/components/FacetMark";
import { StatTicker } from "@/components/StatTicker";

export const metadata: Metadata = {
  title: "CWR · autonomous ORE mining",
  description:
    "Deposit SOL, mint CWR, and let a keeper work the ORE board around the clock. A non-custodial Solana vault.",
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/crank", label: "Crank" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="atmosphere" aria-hidden />
        <Providers>
          <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-8">
                <Link href="/" className="group flex items-center gap-1.5">
                  <FacetMark className="h-9 w-9 transition group-hover:drop-shadow-[0_0_10px_rgba(157,183,216,0.45)]" />
                  <span className="font-display text-[23px] font-bold tracking-[0.22em] text-[#F4F8FF]">
                    CWR
                  </span>
                </Link>
                <nav className="hidden gap-1 sm:flex">
                  {NAV_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="rounded-md px-3 py-1.5 text-sm text-fog-dim transition hover:bg-ink-800 hover:text-white"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <WalletButton />
            </div>
          </header>
          <StatTicker />
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
          <footer className="border-t border-line/80 bg-ink-950/40">
            <div className="mx-auto max-w-6xl px-6 py-10">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xs">
                  <div className="flex items-center gap-1.5">
                    <FacetMark className="h-8 w-8" />
                    <span className="font-display text-[20px] font-bold tracking-[0.22em] text-[#F4F8FF]">CWR</span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-fog-muted">
                    Pooled, non-custodial ORE mining on Solana. Funds only ever flow vault to ORE and back.
                  </p>
                </div>
                <div className="flex gap-12">
                  <FooterCol title="Product" links={["Pools", "How it works", "FAQ"]} />
                  <FooterCol title="Legal" links={["About", "Terms", "Privacy"]} />
                </div>
                <div className="flex flex-col items-start gap-4 sm:items-end">
                  <div className="flex gap-2">
                    <Social label="X" href="#" />
                    <Social label="Discord" href="#" />
                  </div>
                  <span className="flex items-center gap-2 font-mono text-[12px] text-fog-muted">
                    <FacetMark className="h-4 w-4" /> built on Solana
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="label">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="text-sm text-fog-dim transition hover:text-white">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Social({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fog-dim transition hover:border-gold hover:text-gold"
    >
      <span className="font-mono text-xs">{label === "X" ? "𝕏" : "◇"}</span>
    </a>
  );
}
