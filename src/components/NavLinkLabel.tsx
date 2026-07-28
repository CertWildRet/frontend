import { IconSearch } from "@tabler/icons-react";
import type { NavItem } from "@/lib/nav";

export function NavLinkLabel({ item }: { item: NavItem }) {
  if (item.icon === "search") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <IconSearch size={15} stroke={1.75} aria-hidden />
        {item.label}
      </span>
    );
  }
  return <>{item.label}</>;
}
