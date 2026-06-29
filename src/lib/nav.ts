/** Single source of truth for the primary nav (desktop SiteHeader + MobileNav). */
export const NAV_ITEMS = [
  { href: "/ore", label: "ORE" },
  { href: "/zinc", label: "ZINC" },
  { href: "/position", label: "Position" },
  { href: "/referral", label: "Referral" },
] as const;

/** Active when on the route itself or any nested route (e.g. /referral/[invite]). */
export function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
