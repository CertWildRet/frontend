/**
 * Official ORE round distribution mask — matches upstream
 * `ore_api::state::Round::distribution_mask` (keccak256 + Fisher–Yates).
 *
 * Bit i (0..24) set  → tile i is SOLO (winner-take-all ORE)
 * Bit i clear        → tile i is SPLIT (ORE shared among winning-tile miners)
 * Exactly 10 of 25 tiles are solo each round.
 */
import { keccak_256 } from "@noble/hashes/sha3";

export const TILE_COUNT = 25;
export const SOLO_TILE_BITS = 10;

export type TileMode = "solo" | "split";

export type RoundTileModes = {
  roundId: number;
  distributionMask: number;
  soloTiles: number[];
  splitTiles: number[];
  tileModes: TileMode[];
};

/** u64 little-endian bytes for a round id (JS number or bigint). */
function u64LeBytes(n: number | bigint): Uint8Array {
  const v = typeof n === "bigint" ? n : BigInt(n);
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, v, true);
  return out;
}

/**
 * Pure `distribution_mask(round_id) -> u32`.
 * First 25 bits matter; exactly 10 are set (solo tiles).
 */
export function distributionMask(roundId: number | bigint): number {
  let randomness = keccak_256(u64LeBytes(roundId));
  const indices = new Uint8Array(TILE_COUNT);
  for (let i = 0; i < TILE_COUNT; i++) indices[i] = i;

  let randomOffset = 0;
  // Fisher–Yates shuffle seeded from keccak(round_id)
  for (let i = TILE_COUNT - 1; i >= 1; i--) {
    if (randomOffset + 2 > randomness.length) {
      randomness = keccak_256(randomness);
      randomOffset = 0;
    }
    const r = randomness[randomOffset]! | (randomness[randomOffset + 1]! << 8);
    const j = r % (i + 1);
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
    randomOffset += 2;
  }

  let mask = 0;
  for (let k = 0; k < SOLO_TILE_BITS; k++) {
    mask |= 1 << indices[k]!;
  }
  return mask >>> 0;
}

/** Decode a mask into the API shape used by orestack `GET /api/rounds/{id}/tile-modes`. */
export function tileModesFromMask(roundId: number, mask: number): RoundTileModes {
  const soloTiles: number[] = [];
  const splitTiles: number[] = [];
  const tileModes: TileMode[] = [];
  for (let i = 0; i < TILE_COUNT; i++) {
    if ((mask & (1 << i)) !== 0) {
      soloTiles.push(i);
      tileModes.push("solo");
    } else {
      splitTiles.push(i);
      tileModes.push("split");
    }
  }
  return {
    roundId,
    distributionMask: mask >>> 0,
    soloTiles,
    splitTiles,
    tileModes,
  };
}

/** Full tile-modes payload for one round (matches orestack API JSON). */
export function roundTileModes(roundId: number): RoundTileModes {
  return tileModesFromMask(roundId, distributionMask(roundId));
}

/** Most recent `count` rounds ending at `latestRoundId` (inclusive), newest first. */
export function recentRoundTileModes(latestRoundId: number, count = 20): RoundTileModes[] {
  const n = Math.max(0, Math.min(count, latestRoundId + 1));
  const out: RoundTileModes[] = [];
  for (let i = 0; i < n; i++) {
    out.push(roundTileModes(latestRoundId - i));
  }
  return out;
}
