import type { Metadata } from "next";
import Image from "next/image";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource-variable/sora";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/Providers";
import { StatTickerGate } from "@/components/StatTickerGate";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Diamond Pools · autonomous ORE and ZINC mining",
  description:
    "Deposit SOL, mine ORE around the clock, and let a miner work the board for you. A non-custodial Solana vault by Diamond Pools.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "any", type: "image/png" },
    ],
    apple: "/icon.png",
  },
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
                    <Image
                      src="/logo.png"
                      alt="Diamond Pools"
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0 object-contain"
                    />
                    <span className="font-display text-[20px] font-bold tracking-[0.22em] text-[#EAECF6]">Diamond Pools</span>
                  </div>
                </div>
                {/* <div className="flex gap-12">
                  <FooterCol title="Product" links={["How it works", "FAQ"]} />
                  <FooterCol title="Legal" links={["About", "Terms", "Privacy"]} />
                </div> */}
                <div className="flex flex-col items-start gap-4 sm:items-end">
                  <div className="flex gap-2">
                    <Social label="X" href="https://x.com/orestackapp" />
                    <Social label="Discord" href="https://discord.gg/KP7bBKFsg" />
                  </div>
                  <span className="flex items-center gap-2 font-mono text-[12px] text-[#9AA3C8]">
                    Built on
                    <Image
                      src="/solana-logo.png"
                      alt="Solana"
                      width={80}
                      height={20}
                      className="h-5 w-auto"
                    />
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
        <Analytics />
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
      {label === "X" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      )}
    </a>
  );
}
