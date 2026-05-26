import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CWR — Certified Wild Retards",
  description:
    "Three-tier Solana vault mining ORE: Simple (instant), Refined (7d), Ultra (30d).",
};

const NAV_LINKS = [
  { href: "/", label: "Buckets" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/health", label: "Brain Health" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-bg-border bg-bg-surface/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-white">CWR</span>
              <span className="text-xs text-muted">certified-wild-retards</span>
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
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 py-12 text-xs text-muted">
          Backend:{" "}
          <code className="text-gray-400">
            {process.env.NEXT_PUBLIC_BACKEND_URL || "(not configured — set NEXT_PUBLIC_BACKEND_URL)"}
          </code>
        </footer>
      </body>
    </html>
  );
}
