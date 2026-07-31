/**
 * ServiceChip — the autominer-service tag rendered beside a wallet pubkey.
 * `service` (from the analytics API: {id, label, color}) names the platform that
 * runs the wallet (Accumulana / Orestack / Ore.com / Refinore / Ruby), colored by
 * the service's registry hue. When only a generic crank is known (`poolCrank`),
 * falls back to the neutral POOL chip. Renders nothing without either.
 */
export type OreServiceTag = { id: string; label: string; color: string };

export function ServiceChip({
  service,
  poolCrank,
  className = "",
}: {
  service?: OreServiceTag | null;
  poolCrank?: string | null;
  className?: string;
}) {
  const base = "rounded border px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-[0.1em]";
  if (service) {
    return (
      <span
        className={`${base} ${className}`}
        style={{ color: service.color, borderColor: `${service.color}55`, backgroundColor: `${service.color}14` }}
        title={`Runs via ${service.label} (managed mining)`}
      >
        {service.label}
      </span>
    );
  }
  if (poolCrank) {
    return (
      <span
        className={`${base} border-line text-[#B7BDD2] ${className}`}
        title={`Managed by pool crank ${poolCrank}`}
      >
        pool
      </span>
    );
  }
  return null;
}
