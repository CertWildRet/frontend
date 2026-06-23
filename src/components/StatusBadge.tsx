type Props = {
  status: "ok" | "warn" | "down" | "info";
  label: string;
};

// Active / live states (open, mining): white text, green border, green dot.
// warn/paused keep their amber/red text + dot.
const COLORS: Record<Props["status"], string> = {
  ok: "border-pos/40 text-white",
  warn: "border-amber/30 text-amber",
  down: "border-red/30 text-red",
  info: "border-pos/40 text-white",
};
const DOT: Record<Props["status"], string> = {
  ok: "bg-pos",
  warn: "bg-current",
  down: "bg-current",
  info: "bg-pos",
};

export function StatusBadge({ status, label }: Props) {
  return (
    <span className={`chip ${COLORS[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      {label}
    </span>
  );
}
