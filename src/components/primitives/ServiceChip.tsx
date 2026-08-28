/**
 * ServiceChip — the autominer-service tag rendered beside a wallet pubkey.
 * `service` ({id, label, color}) names the platform that runs the wallet
 * (Ore.com / Orestack / Minemore / Refinore / Accumulana / …), usually from
 * analytics or `resolveOreService` in `@/lib/oreProviders`. When only a generic
 * crank is known (`poolCrank`), falls back to the neutral POOL chip. Renders
 * nothing without either. Keep this chip generic — provider ids live in the registry.
 */
export type OreServiceTag = { id: string; label: string; color: string };

export function ServiceChip({
  service,
  poolCrank,
  className = "",
  compact = false,
}: {
  service?: OreServiceTag | null;
  poolCrank?: string | null;
  className?: string;
  /** Dense-table variant: matches the 10px sibling chips (won / solo ORE) so a
   *  tagged row keeps exactly the same height as an untagged one. */
  compact?: boolean;
}) {
  const base = compact
    ? "rounded border px-1 text-[10px] font-semibold uppercase leading-4 tracking-[0.06em]"
    : "rounded border px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-[0.1em]";
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
