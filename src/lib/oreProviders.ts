/**
 * Autominer provider registry for /stats chips + the miners-by-provider chart.
 *
 * Analytics already fingerprints some platforms into `service: {id,label,color}`
 * (today mostly Ore.com / Orestack via crank signer). Fee-tip providers
 * (Minemore / Refinore / Accumulana) may only show up as a fee wallet on
 * `via_pool` or `managed_by[].pubkey` until analytics tags them — this registry
 * covers both paths without inventing new HTTP APIs.
 */
import { CHART } from "@/lib/chartColors";
import type { OreServiceTag } from "@/lib/oreStats";

export type OreProviderId =
  | "orecom"
  | "orestack"
  | "minemore"
  | "refinore"
  | "accumulana";

export type OreProviderDef = {
  id: OreProviderId;
  /** Title Case UI label. */
  label: string;
  color: string;
  /**
   * Fee / crank wallets that identify this provider when seen as `via_pool` or
   * `managed_by[].pubkey`. Empty when the platform is only known via analytics
   * `service.id` (e.g. Orestack self-signed deploys).
   */
  wallets: readonly string[];
};

/** Stable display order for chips / histogram bars. */
export const ORE_PROVIDERS: readonly OreProviderDef[] = [
  {
    id: "orecom",
    label: "Ore.com",
    color: "#B7BDD2",
    // Live crank signer on Ore.com-managed deploys (also appears as via_pool).
    wallets: ["HaWGEatzkfVVCkfdD1nTbQ1qQ18sACQMnrqvkj3t3Pt"] as const,
  },
  {
    id: "orestack",
    label: "Orestack",
    // Matches live analytics service tag hue.
    color: "#FBBF24",
    wallets: [] as const,
  },
  {
    id: "minemore",
    label: "Minemore",
    color: CHART.cyan,
    wallets: ["3sj1M66WBUnGTjf9CNZnh5nd5LA1grBG4hSY4YcViTPh"] as const,
  },
  {
    id: "refinore",
    label: "Refinore",
    color: CHART.pink,
    wallets: ["HMAYjHeogmdm5J1EuBhhbbSvMrWARsEt38SsGZTrB7Mm"] as const,
  },
  {
    id: "accumulana",
    label: "Accumulana",
    color: CHART.violet,
    wallets: ["32eM5hdEZVgSBrdzF79U4BspCD6RMn4cttBmrTXbwhH9"] as const,
  },
] as const;

const BY_ID: ReadonlyMap<string, OreProviderDef> = new Map(
  ORE_PROVIDERS.map((p) => [p.id, p]),
);

const BY_WALLET: ReadonlyMap<string, OreProviderDef> = (() => {
  const m = new Map<string, OreProviderDef>();
  for (const p of ORE_PROVIDERS) {
    for (const w of p.wallets) m.set(w, p);
  }
  return m;
})();

export const providerById = (id: string): OreProviderDef | null =>
  BY_ID.get(id) ?? null;

export const providerByWallet = (pubkey: string | null | undefined): OreProviderDef | null =>
  pubkey ? BY_WALLET.get(pubkey) ?? null : null;

export const toServiceTag = (p: OreProviderDef): OreServiceTag => ({
  id: p.id,
  label: p.label,
  color: p.color,
});

/** Normalize a known analytics service id through the registry; pass unknowns through. */
export function enrichServiceTag(service: OreServiceTag | null | undefined): OreServiceTag | null {
  if (!service?.id) return null;
  const known = providerById(service.id);
  return known ? toServiceTag(known) : service;
}

export type ProviderMatchInput = {
  service?: OreServiceTag | null;
  viaPool?: string | null;
  managedBy?: { pubkey: string; service?: OreServiceTag | null }[] | null;
};

/**
 * All provider ids matched for one miner. Used for the histogram (Many = 2+).
 * Sources: analytics `service`, `via_pool`, and each `managed_by` pubkey/service.
 */
export function matchProviderIds(input: ProviderMatchInput): OreProviderId[] {
  const ids = new Set<OreProviderId>();
  const add = (id: string | null | undefined) => {
    const p = id ? providerById(id) : null;
    if (p) ids.add(p.id);
  };
  const addWallet = (pk: string | null | undefined) => {
    const p = providerByWallet(pk);
    if (p) ids.add(p.id);
  };

  add(input.service?.id);
  addWallet(input.viaPool);
  for (const m of input.managedBy ?? []) {
    add(m.service?.id);
    addWallet(m.pubkey);
  }
  return ORE_PROVIDERS.map((p) => p.id).filter((id) => ids.has(id));
}

/**
 * Single chip identity for a miner row / detail header.
 * Prefers analytics `service` (enriched). Else a sole wallet/registry match.
 * Multi-match without an analytics service → null (ServiceChip may fall back to pool).
 */
export function resolveOreService(input: ProviderMatchInput): OreServiceTag | null {
  if (input.service?.id) return enrichServiceTag(input.service);
  const ids = matchProviderIds(input);
  if (ids.length === 1) {
    const p = providerById(ids[0]!);
    return p ? toServiceTag(p) : null;
  }
  return null;
}

export type ProviderHistogramBucketId = OreProviderId | "many" | "independent";

export type ProviderHistogramBucket = {
  id: ProviderHistogramBucketId;
  label: string;
  color: string;
  count: number;
};

export type ProviderMinerSignal = {
  authority: string;
} & ProviderMatchInput;

const MANY: Omit<ProviderHistogramBucket, "count"> = {
  id: "many",
  label: "Many",
  color: CHART.amber,
};

const INDEPENDENT: Omit<ProviderHistogramBucket, "count"> = {
  id: "independent",
  label: "Independent",
  color: "#6B7280",
};

/**
 * Unique miner counts per provider. A miner matching 2+ providers counts only
 * in Many (never double-counted). Unlabeled miners land in Independent.
 * Dedupes by `authority` across the input list.
 */
export function countMinersByProvider(miners: ProviderMinerSignal[]): ProviderHistogramBucket[] {
  const seen = new Set<string>();
  const counts = new Map<ProviderHistogramBucketId, number>();
  for (const p of ORE_PROVIDERS) counts.set(p.id, 0);
  counts.set("many", 0);
  counts.set("independent", 0);

  for (const m of miners) {
    if (seen.has(m.authority)) continue;
    seen.add(m.authority);
    const ids = matchProviderIds(m);
    if (ids.length === 0) {
      counts.set("independent", (counts.get("independent") ?? 0) + 1);
    } else if (ids.length === 1) {
      const id = ids[0]!;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    } else {
      counts.set("many", (counts.get("many") ?? 0) + 1);
    }
  }

  const rows: ProviderHistogramBucket[] = ORE_PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    color: p.color,
    count: counts.get(p.id) ?? 0,
  }));

  const manyCount = counts.get("many") ?? 0;
  if (manyCount > 0) rows.push({ ...MANY, count: manyCount });

  const indepCount = counts.get("independent") ?? 0;
  if (indepCount > 0) rows.push({ ...INDEPENDENT, count: indepCount });

  return rows;
}
