import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { WalletButton } from "@/components/WalletButton";

export const metadata: Metadata = {
  title: "CWR — mine ORE, hands-free",
  description:
    "Deposit SOL, mint CWR, and let a 24/7 crank mine the ORE board for you. A non-custodial Solana vault.",
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/crank", label: "Crank" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <header className="sticky top-0 z-20 border-b border-bg-border bg-bg-surface/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold tracking-tight text-white">CWR</span>
                  <span className="hidden text-xs text-muted sm:inline">certified wild retards</span>
                </Link>
                <nav className="flex gap-1">
                  {NAV_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="rounded-md px-3 py-1.5 text-sm text-gray-300 transition hover:bg-bg-elevated hover:text-white"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <WalletButton />
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
          <footer className="mx-auto max-w-6xl px-6 py-12 text-xs text-muted">
            CWR · non-custodial ORE mining on Solana · funds only ever flow vault ↔ ORE/stORE.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
