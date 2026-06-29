import type { Metadata } from "next";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource-variable/sora";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { FacetMark } from "@/components/FacetMark";
import { StatTickerGate } from "@/components/StatTickerGate";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Diamond Pools · autonomous ORE and ZINC mining",
  description:
    "Deposit SOL, mine ORE and ZINC around the clock, and let a keeper work the board for you. A non-custodial Solana vault by Diamond Pools.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070912] text-[#EAECF6]" style={{ fontFamily: "'Sora Variable', system-ui, sans-serif" }}>
        <div className="atmosphere" aria-hidden>
          <div className="atmosphere-beam" />
          <div className="atmosphere-foil" />
        </div>
        <Providers>
          <SiteHeader />
          <StatTickerGate />
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
          <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,9,18,0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
            <div className="mx-auto max-w-6xl px-6 py-10">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xs">
                  <div className="flex items-center gap-1.5">
                    <FacetMark className="h-8 w-8" />
                    <span className="font-display text-[20px] font-bold tracking-[0.22em] text-[#EAECF6]">Diamond Pools</span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#9AA3C8]">
                    Pooled, non-custodial ORE and ZINC mining on Solana. Funds only ever flow vault to miner and back.
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
                  <span className="flex items-center gap-2 font-mono text-[12px] text-[#9AA3C8]">
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
      <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#7FA0E0]">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="text-sm text-[#9AA3C8] transition-colors hover:text-[#EAECF6]">
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
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9AA3C8] transition-colors hover:text-[#EAECF6]"
      style={{ background: 'rgba(14,18,34,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <span className="font-mono text-xs">{label === "X" ? "𝕏" : "◇"}</span>
    </a>
  );
}
