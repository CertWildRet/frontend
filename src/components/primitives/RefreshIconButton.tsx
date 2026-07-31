import { IconRefresh } from "@tabler/icons-react";

type Variant = "default" | "amber" | "chip";

const VARIANT_CLASS: Record<Variant, string> = {
  default:
    "rounded border border-line px-2 py-1 text-fog-muted transition-colors hover:border-steel hover:text-white disabled:cursor-default disabled:opacity-50",
  amber:
    "rounded border border-amber/40 px-2 py-1 text-amber transition-colors hover:border-amber hover:text-white disabled:opacity-50",
  chip: "chip text-fog-muted hover:text-white disabled:opacity-50",
};

/**
 * Icon-only refresh/retry control — replaces text "refresh" / "retry" buttons.
 */
export function RefreshIconButton({
  onClick,
  disabled,
  className = "",
  title = "Refresh",
  variant = "default",
  size = 15,
}: {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  variant?: Variant;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center ${VARIANT_CLASS[variant]} ${className}`}
    >
      <IconRefresh size={size} stroke={1.75} aria-hidden />
    </button>
  );
}
