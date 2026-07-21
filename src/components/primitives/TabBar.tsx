"use client";

import type { ReactNode } from "react";

/**
 * Shared selection chrome — matches the SiteHeader active nav pill
 * (spectral-edge fill + spectral border + blue outer glow).
 */
export const tabDisplayFont = { fontFamily: "'Chakra Petch', sans-serif" } as const;

export const tabActiveGlow = {
  boxShadow:
    "0 0 24px -6px rgba(91,108,255,0.65), inset 0 1px 0 rgba(255,255,255,0.15)",
} as const;

export const tabActiveClass =
  "spectral-edge relative rounded-lg font-semibold text-white";

export const tabIdleClass =
  "rounded-lg border border-transparent font-semibold text-[#C6CCEC] transition-colors hover:bg-[rgba(234,236,246,0.06)] hover:text-[#EAECF6]";

export const tabBarIdleClass =
  "rounded-lg border border-white/25 font-semibold text-[#C6CCEC]/80 transition-colors hover:bg-[rgba(234,236,246,0.06)] hover:text-[#EAECF6] hover:border-white/35";

export type TabItem<T extends string = string> = {
  id: T;
  label: ReactNode;
  title?: string;
};

type CommonProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  "aria-label"?: string;
};

function TabButton<T extends string>({
  item,
  active,
  onSelect,
  size,
  idleClass = tabIdleClass,
}: {
  item: TabItem<T>;
  active: boolean;
  onSelect: () => void;
  size: "lg" | "sm";
  idleClass?: string;
}) {
  const pad =
    size === "lg"
      ? "px-3.5 py-1.5 text-[14px]"
      : "px-2.5 py-1 text-[13px]";

  return (
    <button
      type="button"
      title={item.title}
      onClick={onSelect}
      style={active ? { ...tabDisplayFont, ...tabActiveGlow } : tabDisplayFont}
      className={
        active
          ? `${tabActiveClass} ${pad}`
          : `${idleClass} ${pad}`
      }
    >
      {item.label}
    </button>
  );
}

/**
 * Page-level tab bar (e.g. Stats: Overview / Trends / Motherlode…).
 * Active tab uses the same spectral glass pill as the site nav.
 */
export function TabBar<T extends string>({
  items,
  value,
  onChange,
  className = "",
  "aria-label": ariaLabel = "Tabs",
}: CommonProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex flex-wrap gap-1 border-b border-line pb-2 ${className}`}
    >
      {items.map((item) => (
        <TabButton
          key={item.id}
          item={item}
          active={value === item.id}
          onSelect={() => onChange(item.id)}
          size="lg"
          idleClass={tabBarIdleClass}
        />
      ))}
    </div>
  );
}

/**
 * Compact filter / range / sort control.
 * - `track`: bordered ink well (ORE/ZINC, 7D/30D)
 * - `loose`: compact wrapping chips in their own bordered well, so adjacent
 *   sibling controls read as separate groups instead of one long option row
 */
export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  variant = "track",
  className = "",
  "aria-label": ariaLabel,
}: CommonProps<T> & { variant?: "track" | "loose" }) {
  if (variant === "loose") {
    return (
      <div
        role="group"
        aria-label={ariaLabel}
        className={`inline-flex flex-wrap items-center gap-1 rounded-lg border border-line bg-ink-800 p-0.5 ${className}`}
      >
        {items.map((item) => (
          <TabButton
            key={item.id}
            item={item}
            active={value === item.id}
            onSelect={() => onChange(item.id)}
            size="sm"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex w-full rounded-lg border border-line bg-ink-800 p-0.5 sm:w-auto ${className}`}
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.title}
            onClick={() => onChange(item.id)}
            style={active ? { ...tabDisplayFont, ...tabActiveGlow } : tabDisplayFont}
            className={
              active
                ? "spectral-edge relative flex-1 rounded-md px-3 py-1.5 text-center text-[13px] font-semibold text-white sm:flex-none sm:px-2.5"
                : "flex-1 rounded-md border border-transparent px-3 py-1.5 text-center text-[13px] font-semibold text-[#C6CCEC] transition-colors hover:bg-[rgba(234,236,246,0.06)] hover:text-[#EAECF6] sm:flex-none sm:px-2.5"
            }
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
