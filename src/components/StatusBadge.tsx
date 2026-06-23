type Props = {
  status: "ok" | "warn" | "down" | "info";
  label: string;
};

// Active / live states (open, mining) read green; warn/paused keep amber/red.
const COLORS: Record<Props["status"], string> = {
  ok: "border-pos/30 text-pos",
  warn: "border-amber/30 text-amber",
  down: "border-red/30 text-red",
  info: "border-pos/30 text-pos",
};

export function StatusBadge({ status, label }: Props) {
  return (
    <span className={`chip ${COLORS[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
