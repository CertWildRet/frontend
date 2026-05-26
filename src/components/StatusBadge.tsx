type Props = {
  status: "ok" | "warn" | "down" | "info";
  label: string;
};

const COLORS: Record<Props["status"], string> = {
  ok: "bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/30",
  warn: "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/30",
  down: "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/30",
  info: "bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/30",
};

export function StatusBadge({ status, label }: Props) {
  return (
    <span className={`badge ${COLORS[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
