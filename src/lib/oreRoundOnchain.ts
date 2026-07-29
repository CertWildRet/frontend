/**
 * Live ORE round reads from chain (Board + Round PDAs).
 *
 * Analytics `/ore/round/:id` can lag hundreds of rounds and only has partial
 * historical tile deploys once Round PDAs are reclaimed. Hawg-style boards need
 * the live Round account: per-tile SOL, counts, and winning square from slot_hash.
 */
import { BN } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { oreBoardPda, oreRoundPda } from "@cwr/sdk";
import { TILE_COUNT } from "@/lib/distributionMask";

const U64 = 8;
const DISC = 8;
const PUBKEY = 32;
const SLOT_HASH = 32;

export type OnchainRoundTiles = {
  roundId: number;
  /** SOL deployed on each tile (length 25). */
  perTileSol: number[];
  /** Miner counts per tile (length 25). */
  perTileCount: number[];
  totalDeployedSol: number;
  totalWinningsSol: number;
  totalMiners: number;
  /** 0-based winning square, or null if round not yet settled. */
  winningTile: number | null;
  topMiner: string | null;
  /** Round account missing (reclaimed) or undecodable. */
  missing: boolean;
};

function readU64(data: Buffer, offset: number): bigint {
  return data.readBigUInt64LE(offset);
}

function readU64Number(data: Buffer, offset: number): number {
  return Number(readU64(data, offset));
}

/** Board.round_id — current live round on chain. */
export async function fetchBoardRoundId(connection: Connection): Promise<number> {
  const [board] = oreBoardPda();
  const info = await connection.getAccountInfo(board, "confirmed");
  if (!info?.data || info.data.length < DISC + U64) {
    throw new Error("ORE board account missing");
  }
  return readU64Number(Buffer.from(info.data), DISC);
}

/**
 * Winning square from Round.slot_hash — matches `Round::rng` + `winning_square`
 * in ore_api (unset while hash is zero / all-ones).
 */
export function winningTileFromSlotHash(slotHash: Uint8Array): number | null {
  if (slotHash.length < 32) return null;
  let allZero = true;
  let allFf = true;
  for (let i = 0; i < 32; i++) {
    const b = slotHash[i]!;
    if (b !== 0) allZero = false;
    if (b !== 0xff) allFf = false;
  }
  if (allZero || allFf) return null;

  const view = new DataView(slotHash.buffer, slotHash.byteOffset, 32);
  const r1 = view.getBigUint64(0, true);
  const r2 = view.getBigUint64(8, true);
  const r3 = view.getBigUint64(16, true);
  const r4 = view.getBigUint64(24, true);
  const rng = r1 ^ r2 ^ r3 ^ r4;
  return Number(rng % 25n);
}

/** Decode a Round account (steel: 8-byte disc + Pod Round). */
export function decodeRoundAccount(data: Buffer, expectId?: number): OnchainRoundTiles | null {
  // disc + id + deployed[25] + mass[25] + count[25] + slot_hash + …
  const minLen = DISC + U64 + U64 * TILE_COUNT * 3 + SLOT_HASH;
  if (data.length < minLen) return null;

  let o = DISC;
  const roundId = readU64Number(data, o);
  o += U64;
  if (expectId != null && roundId !== expectId) return null;

  const perTileSol: number[] = [];
  for (let i = 0; i < TILE_COUNT; i++, o += U64) {
    perTileSol.push(Number(readU64(data, o)) / 1e9);
  }
  o += U64 * TILE_COUNT; // mass
  const perTileCount: number[] = [];
  for (let i = 0; i < TILE_COUNT; i++, o += U64) {
    perTileCount.push(readU64Number(data, o));
  }
  const slotHash = Uint8Array.from(data.subarray(o, o + SLOT_HASH));
  o += SLOT_HASH;
  o += U64; // expires_at
  o += U64; // motherlode
  o += PUBKEY; // rent_payer
  o += U64 * TILE_COUNT; // rewards
  o += U64; // total_vaulted
  const totalWinningsSol = data.length >= o + U64 ? Number(readU64(data, o)) / 1e9 : 0;
  o += U64;
  const totalMiners = data.length >= o + U64 ? readU64Number(data, o) : 0;
  o += U64;
  let topMiner: string | null = null;
  if (data.length >= o + PUBKEY) {
    const key = new PublicKey(data.subarray(o, o + PUBKEY));
    const s = key.toBase58();
    // Unset / split sentinel — treat default and known split marker as no solo winner
    if (s !== "11111111111111111111111111111111" && !s.startsWith("SpLiT1111111111111111111111111111111111111")) {
      topMiner = s;
    } else if (s.startsWith("SpLiT1111111111111111111111111111111111111")) {
      topMiner = s; // keep split address so UI can show "split"
    }
  }

  return {
    roundId,
    perTileSol,
    perTileCount,
    totalDeployedSol: perTileSol.reduce((a, b) => a + b, 0),
    totalWinningsSol,
    totalMiners,
    winningTile: winningTileFromSlotHash(slotHash),
    topMiner,
    missing: false,
  };
}

/** Fetch + decode one Round PDA. `missing: true` when the account is gone. */
export async function fetchOnchainRoundTiles(
  connection: Connection,
  roundId: number,
): Promise<OnchainRoundTiles> {
  const [pda] = oreRoundPda(new BN(roundId));
  const info = await connection.getAccountInfo(pda, "confirmed");
  if (!info?.data) {
    return {
      roundId,
      perTileSol: Array(TILE_COUNT).fill(0),
      perTileCount: Array(TILE_COUNT).fill(0),
      totalDeployedSol: 0,
      totalWinningsSol: 0,
      totalMiners: 0,
      winningTile: null,
      topMiner: null,
      missing: true,
    };
  }
  const decoded = decodeRoundAccount(Buffer.from(info.data), roundId);
  if (!decoded) {
    throw new Error(`Could not decode round #${roundId}`);
  }
  return decoded;
}
