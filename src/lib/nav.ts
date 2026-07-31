/** Single source of truth for the primary nav (desktop SiteHeader + MobileNav). */
export type NavItem = {
  href: string;
  label: string;
  icon?: "search";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/stats", label: "Data" },
  { href: "/search", label: "Search Miner", icon: "search" },
  { href: "/automine", label: "Automine" },
  { href: "/profile", label: "Profile" },
  // Hidden for now — restore when shipping these surfaces again:
  // { href: "/ore", label: "ORE" },
  // { href: "/position", label: "Position" },
  // { href: "/referral", label: "Referral" },
];

/** Active when on the route itself or any nested route (e.g. /referral/[invite]). */
export function isActiveRoute(pathname: string, href: string): boolean {
  const path = href.split("?")[0]!;
  return pathname === path || pathname.startsWith(path + "/");
}

/** Path + query aware active state for primary nav links. */
export function isNavItemActive(
  pathname: string,
  searchParams: URLSearchParams,
  item: NavItem,
): boolean {
  void searchParams;
  return isActiveRoute(pathname, item.href);
}
