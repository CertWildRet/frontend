type Props = {
  status: "ok" | "warn" | "down" | "info";
  label: string;
};

const COLORS: Record<Props["status"], string> = {
  ok: "border-gold/30 text-gold",
  warn: "border-amber/30 text-amber",
  down: "border-red/30 text-red",
  info: "border-gold/30 text-gold",
};

export function StatusBadge({ status, label }: Props) {
  return (
    <span className={`chip ${COLORS[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
