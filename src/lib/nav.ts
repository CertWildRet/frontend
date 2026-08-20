/** Single source of truth for the primary nav (desktop SiteHeader + MobileNav). */
export type NavItem = {
  href: string;
  label: string;
  icon?: "search";
  /** Opens a modal instead of navigating (href still used for active state). */
  opensModal?: "search-miner";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/search", label: "Search", icon: "search", opensModal: "search-miner" },
  { href: "/stats", label: "Data" },
  { href: "/automine", label: "Automine" },
  { href: "/profile", label: "Profile" },
  // Hidden for now — restore when shipping these surfaces again:
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

export function opensSearchMinerModal(item: NavItem): boolean {
  return item.opensModal === "search-miner";
}
