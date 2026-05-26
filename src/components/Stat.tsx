type Props = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
};

export function Stat({ label, value, hint }: Props) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value mt-1">{value}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}
