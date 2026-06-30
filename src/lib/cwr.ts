// Chain layer for the dORE frontend.
//
// Reads use the SDK's read-only client (a dummy wallet - no signer needed).
// Deposit/withdraw are built as raw instructions (the user pubkey is explicit),
// assembled into a tx, and signed+sent by the connected wallet adapter, then
// confirmed by POLLING getSignatureStatus - NO websocket subscription, so it
// works through the key-hiding /api/rpc proxy as well as a direct RPC.

import { BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
  type TransactionSignature,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import {
  CwrVault,
  Bucket,
  STORE_MINT,
  ORE_PROGRAM_ID,
  ZINC_MINT,
  ZINC_TOKEN_PROGRAM,
  ZINC_ATA_PROGRAM,
  ZINC_PROGRAM_ID,
  ZINC_CONFIG,
  ZINC_TREASURY,
  deriveBucketAddresses,
  findFeeSchedule,
  findFeeBucket,
  findPosition,
  findPendingState,
  findPendingTreasury,
  findPendingDeposit,
  findMiningAuthority,
  oreMinerPda,
  oreBoardPda,
  zincPoolPda,
  zincPositionPda,
  zincCustodyAta,
  zincUserAta,
  zincPlayerProfilePda,
  zincRoundRewardTokenAccountPda,
} from "@cwr/sdk";

export { BN, Bucket };

// ── Constants ──────────────────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "BLi7NKqekZGh5zWNwmUK2bzs2tAR3sPC7A1VrgQdEaYL",
);
/** V1 ships the Simple bucket only. */
export const SIMPLE: Bucket = Bucket.Simple;
/** dZINC pool lives in bucket 1 (Bucket.Zinc === 1). */
export const ZINC: Bucket = Bucket.Zinc;
/** Contract min_deposit for the Simple bucket (DepositBelowMinimum below this). */
export const MIN_DEPOSIT_SOL = 0.1;
export const SHARE_DECIMALS = 9;
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const NAV_SCALE = 1e18;
/** ZINC token is a classic SPL mint with 9 decimals (raw grams -> ZINC). */
export const ZINC_DECIMALS = 9;
export const zincGramsToNumber = (bn: BN | bigint | number): number =>
  Number(bn.toString()) / 10 ** ZINC_DECIMALS;

// ── RPC endpoint resolution ──────────────────────────────────────────────────
// Prefer an explicit public RPC; otherwise route through the same-origin proxy
// (/api/rpc) which holds the paid key server-side (see app/api/rpc/route.ts).
export function rpcEndpoint(): string {
  const direct = process.env.NEXT_PUBLIC_RPC_URL;
  if (direct && direct.length > 0) return direct;
  if (typeof window !== "undefined") return `${window.location.origin}/api/rpc`;
  // Server/prerender: no origin to build the proxy URL from. Return a valid
  // absolute placeholder so `new Connection()` doesn't throw - it's never
  // actually called during prerender (pages fetch client-side in effects);
  // the client re-resolves to the same-origin /api/rpc proxy on hydration.
  return "https://api.mainnet-beta.solana.com";
}

export function makeVault(connection: Connection): CwrVault {
  return new CwrVault({ connection, programId: PROGRAM_ID });
}

// ── Unit conversions ─────────────────────────────────────────────────────────
export const lamportsToSol = (bn: BN | bigint | number): number =>
  Number(bn.toString()) / LAMPORTS_PER_SOL;
export const sharesToNumber = (bn: BN | bigint | number): number =>
  Number(bn.toString()) / 10 ** SHARE_DECIMALS;
export const navX18ToNumber = (bn: BN | bigint | number): number =>
  Number(bn.toString()) / NAV_SCALE;
export const solToLamports = (sol: number): BN =>
  new BN(Math.round(sol * LAMPORTS_PER_SOL));
export const sharesToRaw = (shares: number): BN =>
  new BN(Math.round(shares * 10 ** SHARE_DECIMALS));

// ── Instruction builders (deposit / withdraw) ────────────────────────────────
// Mirror the SDK UserApi account wiring but return raw instructions so the
// connected wallet (not a Keypair) can sign. `owner` is the depositor pubkey.

export async function buildDepositIxs(
  connection: Connection,
  owner: PublicKey,
  lamports: BN,
): Promise<TransactionInstruction[]> {
  const vault = makeVault(connection);
  const program = vault.client.program;
  const addrs = deriveBucketAddresses(PROGRAM_ID, SIMPLE);
  const [feeSchedule] = findFeeSchedule(PROGRAM_ID);
  const [feeBucket] = findFeeBucket(PROGRAM_ID);
  const [position] = findPosition(PROGRAM_ID, SIMPLE, owner);
  const [miningAuthority] = findMiningAuthority(PROGRAM_ID, SIMPLE);
  const [oreMiner] = oreMinerPda(miningAuthority);
  const userAta = getAssociatedTokenAddressSync(addrs.shareMint, owner);

  const ixs: TransactionInstruction[] = [];
  const ataInfo = await connection.getAccountInfo(userAta);
  if (!ataInfo) {
    ixs.push(
      createAssociatedTokenAccountIdempotentInstruction(owner, userAta, owner, addrs.shareMint),
    );
  }
  const depositIx = await program.methods
    .deposit(lamports)
    .accountsPartial({
      config: vault.client.configPda,
      bucket: addrs.bucket,
      treasury: addrs.treasury,
      shareMint: addrs.shareMint,
      userShareAta: userAta,
      user: owner,
      position,
      oreMiner,
      feeBucket,
      feeSchedule,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  ixs.push(depositIx);
  return ixs;
}

export async function buildWithdrawIxs(
  connection: Connection,
  owner: PublicKey,
  shares: BN,
): Promise<TransactionInstruction[]> {
  const vault = makeVault(connection);
  const program = vault.client.program;
  const addrs = deriveBucketAddresses(PROGRAM_ID, SIMPLE);
  const userShareAta = getAssociatedTokenAddressSync(addrs.shareMint, owner);
  const [feeSchedule] = findFeeSchedule(PROGRAM_ID);
  const [feeBucket] = findFeeBucket(PROGRAM_ID);
  const [position] = findPosition(PROGRAM_ID, SIMPLE, owner);
  const userStoreAta = getAssociatedTokenAddressSync(STORE_MINT, owner);

  const ixs: TransactionInstruction[] = [];
  const storeAtaInfo = await connection.getAccountInfo(userStoreAta);
  if (!storeAtaInfo) {
    ixs.push(
      createAssociatedTokenAccountIdempotentInstruction(owner, userStoreAta, owner, STORE_MINT),
    );
  }
  const withdrawIx = await program.methods
    .withdraw(shares)
    .accountsPartial({
      bucket: addrs.bucket,
      treasury: addrs.treasury,
      shareMint: addrs.shareMint,
      userShareAta,
      user: owner,
      position,
      feeBucket,
      feeSchedule,
      config: vault.client.configPda,
      storeTreasury: addrs.storeTreasury,
      userStoreAta,
      storeMint: STORE_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  ixs.push(withdrawIx);
  return ixs;
}

// ── dZINC pool (bucket 1) deposit / withdraw ──────────────────────────────────
// Mirror buildDepositIxs / buildWithdrawIxs but route through the ZincPool +
// per-user ZincPosition. There is NO ore_miner and NO stORE leg: withdraw pays
// the pro-rata SMELTED ZINC in-kind from the mining-authority custody ATA into
// the user's ZINC ATA (a classic SPL Token ATA). Account wiring mirrors the SDK
// UserApi.depositZinc / withdrawZinc but returns raw instructions so the
// connected wallet (not a Keypair) can sign, exactly like the dORE builders.

export async function buildDepositZincIxs(
  connection: Connection,
  owner: PublicKey,
  lamports: BN,
): Promise<TransactionInstruction[]> {
  const vault = makeVault(connection);
  const program = vault.client.program;
  const addrs = deriveBucketAddresses(PROGRAM_ID, ZINC);
  const [zincPool] = zincPoolPda(PROGRAM_ID, ZINC);
  const [zincPosition] = zincPositionPda(PROGRAM_ID, ZINC, owner);
  const [feeSchedule] = findFeeSchedule(PROGRAM_ID);
  const [feeBucket] = findFeeBucket(PROGRAM_ID);
  const userShareAta = getAssociatedTokenAddressSync(addrs.shareMint, owner);

  const ixs: TransactionInstruction[] = [];
  const ataInfo = await connection.getAccountInfo(userShareAta);
  if (!ataInfo) {
    ixs.push(
      createAssociatedTokenAccountIdempotentInstruction(owner, userShareAta, owner, addrs.shareMint),
    );
  }
  const depositIx = await program.methods
    .depositZinc(lamports)
    .accountsPartial({
      config: vault.client.configPda,
      bucket: addrs.bucket,
      zincPool,
      treasury: addrs.treasury,
      shareMint: addrs.shareMint,
      userShareAta,
      user: owner,
      zincPosition,
      feeBucket,
      feeSchedule,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  ixs.push(depositIx);
  return ixs;
}

export async function buildWithdrawZincIxs(
  connection: Connection,
  owner: PublicKey,
  shares: BN,
): Promise<TransactionInstruction[]> {
  const vault = makeVault(connection);
  const program = vault.client.program;
  const addrs = deriveBucketAddresses(PROGRAM_ID, ZINC);
  const [zincPool] = zincPoolPda(PROGRAM_ID, ZINC);
  const [zincPosition] = zincPositionPda(PROGRAM_ID, ZINC, owner);
  const [feeSchedule] = findFeeSchedule(PROGRAM_ID);
  const [feeBucket] = findFeeBucket(PROGRAM_ID);
  const [miningAuthority] = findMiningAuthority(PROGRAM_ID, ZINC);
  const custodyAta = zincCustodyAta(miningAuthority);
  const userShareAta = getAssociatedTokenAddressSync(addrs.shareMint, owner);
  const userZincAta = zincUserAta(owner);

  const ixs: TransactionInstruction[] = [];
  // The in-kind smelted-ZINC payout lands in the user's ZINC ATA (classic SPL
  // Token program); create it idempotently so the transfer cannot fail.
  const zincAtaInfo = await connection.getAccountInfo(userZincAta);
  if (!zincAtaInfo) {
    ixs.push(
      createAssociatedTokenAccountIdempotentInstruction(
        owner,
        userZincAta,
        owner,
        ZINC_MINT,
        ZINC_TOKEN_PROGRAM,
        ZINC_ATA_PROGRAM,
      ),
    );
  }
  const withdrawIx = await program.methods
    .withdrawZinc(shares)
    .accountsPartial({
      bucket: addrs.bucket,
      zincPool,
      treasury: addrs.treasury,
      shareMint: addrs.shareMint,
      userShareAta,
      user: owner,
      zincPosition,
      feeBucket,
      feeSchedule,
      config: vault.client.configPda,
      miningAuthority,
      zincCustodyAta: custodyAta,
      userZincAta,
      zincMint: ZINC_MINT,
      tokenProgram: ZINC_TOKEN_PROGRAM,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  ixs.push(withdrawIx);
  return ixs;
}

// ── dZINC settle_harvest (window-open gate; permissionless) ───────────────────
// Mirrors buildSettleUoreIxs for the dORE pool. A fresh OPEN window starts
// window_settled=false and deposit/withdraw both revert until it is settled. For
// dZINC, settle claims the round's won SOL and SMELTS the accrued ZINC (-10%)
// into the custody ATA, advancing the smelted-ZINC-per-share accumulator and
// flipping window_settled=true. Permissionless: any wallet can run it (only pays
// the network fee). Raw ix (wallet-signed) mirroring CrankApi.settleHarvestZinc.
export async function buildSettleHarvestZincIxs(
  connection: Connection,
  owner: PublicKey,
): Promise<TransactionInstruction[]> {
  const vault = makeVault(connection);
  const program = vault.client.program;
  const addrs = deriveBucketAddresses(PROGRAM_ID, ZINC);
  const [zincPool] = zincPoolPda(PROGRAM_ID, ZINC);
  const [miningAuthority] = findMiningAuthority(PROGRAM_ID, ZINC);
  const custodyAta = zincCustodyAta(miningAuthority);
  const [zincPlayerProfile] = zincPlayerProfilePda(miningAuthority);
  const [zincRewardTa] = zincRoundRewardTokenAccountPda();

  const settleIx = await program.methods
    .settleHarvestZinc()
    .accountsPartial({
      bucket: addrs.bucket,
      zincPool,
      treasury: addrs.treasury,
      miningAuthority,
      zincCustodyAta: custodyAta,
      zincMint: ZINC_MINT,
      zincPlayerProfile,
      zincConfig: ZINC_CONFIG,
      zincTreasury: ZINC_TREASURY,
      zincRoundZincRewardTokenAccount: zincRewardTa,
      zincProgram: ZINC_PROGRAM_ID,
      caller: owner,
      tokenProgram: ZINC_TOKEN_PROGRAM,
      associatedTokenProgram: ZINC_ATA_PROGRAM,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  // claim SOL + smelt CPI + accumulator advance + (first-settle) ATA create -
  // raise the CU ceiling (free; no CU price set, so no extra priority fee).
  return [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), settleIx];
}

// ── dZINC value model (read) ─────────────────────────────────────────────────
// Simpler than dORE: NO ore miner, NO stORE oracle. Recoverable value is just
//   - SOL leg : bucket.sol_in_vault (pro-rata by share)
//   - ZINC leg: zincPool.zinc_in_vault smelted ZINC HELD (pro-rata by share),
//               shown as a raw ZINC amount (no ZINC price feed -> not folded
//               into the SOL price).
// dZINC price = sol_in_vault / total_shares (the SOL-leg NPS). Returns null when
// the dZINC pool (bucket 1) is not deployed yet so callers can render
// "not live yet" instead of crashing.
export type ZincPoolStats = {
  initialized: boolean;
  paused: boolean;
  ddHalt: boolean;
  /** 0 = BETTING (mining), 1 = OPEN (deposit/claim). From the generic Bucket. */
  phase: number;
  phaseStartedTs: number;
  openSecs: number;
  bettingSecs: number;
  windowSettled: boolean;
  totalShares: number;
  /** SOL custody backing the dZINC supply (= bucket.sol_in_vault). Exact. */
  solInVaultSol: number;
  /** Pro-rata SOL price per dZINC share (sol_in_vault / total_shares). */
  navPerShareSol: number;
  /** Smelted ZINC the pool HOLDS, in ZINC units (= zincPool.zinc_in_vault / 1e9). */
  smeltedZincHeld: number;
  /**
   * Won SOL currently claimable back into the vault (recoverable now): the
   * mining_authority's ZINC PlayerProfile.claimable_round_sol_lamports. The keeper
   * sweeps this each settled window, so it is usually small. Exact.
   */
  wonClaimableSol: number;
  /**
   * Live ZINC/SOL spot price from the Meteora ZINC-WSOL pool vault reserves (both
   * 9-dec, so wsol_reserve / zinc_reserve is directly SOL per ZINC). 0 if unread.
   */
  zincPriceSol: number;
  /** Smelted ZINC held, valued in SOL at the live Meteora price. */
  zincHeldValueSol: number;
  /** Frozen withdraw price for the OPEN window (bucket.claims_window_nps); 0 when closed. */
  claimsWindowNps: number;
  pullFeeBps: number;
  pullFeeEnabled: boolean;
  entryFeeBps: number;
  exitFeeBps: number;
};

// Meteora ZINC/WSOL pool vaults (the AMM the buyback routes through). Reading the
// two vault reserves gives the live ZINC/SOL spot price (both mints are 9-dec, so
// wsol_reserve / zinc_reserve is directly SOL per ZINC). Public pool addresses, not
// secrets; the PRICE is read live from chain, never hardcoded.
const ZINC_POOL_WSOL_VAULT = new PublicKey("2nHJ653XtiRRRnaa9AUHxPzrNZGM4RvdXZgWwWDHcdNr");
const ZINC_POOL_ZINC_VAULT = new PublicKey("3XnY1yd5VpZXbBzaaBFVd9TEYMfeN1A1RxwSQsqqr6UQ");
/** SPL token-account `amount` (u64) at byte offset 64. 0n on a short buffer. */
function splTokenAmount(data?: Uint8Array | null): bigint {
  if (!data || data.length < 72) return 0n;
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return dv.getBigUint64(64, true);
}

/**
 * Decode the dZINC mining_authority's ZINC PlayerProfile far enough to read the
 * two mining-economics fields (gross_deployed_lamports + claimable_round_sol_
 * lamports). The leading streak markers are Option<u64> (variable length), so we
 * walk sequentially. Layout from the verified zinc.ts decode. Returns null if the
 * account is missing/too short (no deploy has ever fired).
 */
function decodeZincProfileEcon(
  data: Uint8Array,
): { grossDeployed: bigint; claimableRoundSol: bigint } | null {
  if (data.length < 80) return null;
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let off = 8 + 32 + 1 + 8; // disc, player, initialized, rounds_count
  const skipOpt = () => {
    const tag = data[off];
    off += 1;
    if (tag !== 0) off += 8;
  };
  skipOpt(); // last_streak_round
  skipOpt(); // current_streak_round
  off += 8; // current_streak_count
  const grossDeployed = dv.getBigUint64(off, true);
  off += 8; // gross_deployed_lamports
  off += 8; // net_deployed_lamports
  const affTag = data[off];
  off += 1;
  if (affTag !== 0) off += 32; // affiliate: Option<Address>
  off += 8; // pending_affiliate_pay_lamports
  off += 8; // total_affiliate_pay_lamports
  if (off + 8 > data.length) return null;
  const claimableRoundSol = dv.getBigUint64(off, true);
  return { grossDeployed, claimableRoundSol };
}

export async function readZincPoolStats(connection: Connection): Promise<ZincPoolStats | null> {
  const vault = makeVault(connection);
  // The dZINC mining_authority's ZINC PlayerProfile carries the lifetime mining
  // economics (gross deployed + claimable won SOL). Read it alongside the pool.
  const [miningAuthority] = findMiningAuthority(PROGRAM_ID, ZINC);
  const [zincProfilePda] = zincPlayerProfilePda(miningAuthority);
  // The ZincPool sidecar existing is what makes bucket 1 a live dZINC pool.
  // If it (or the generic bucket) is missing, the pool isn't deployed yet.
  const [zp, b, profInfo, poolVaults] = await Promise.all([
    vault.read.zincPool(ZINC).catch(() => null),
    vault.read.bucket(ZINC).catch(() => null),
    connection.getAccountInfo(zincProfilePda).catch(() => null),
    connection
      .getMultipleAccountsInfo([ZINC_POOL_WSOL_VAULT, ZINC_POOL_ZINC_VAULT])
      .catch(() => null),
  ]);
  if (!zp || !b) return null;

  const prof = profInfo ? decodeZincProfileEcon(profInfo.data) : null;
  const wonClaimableSol = prof ? lamportsToSol(prof.claimableRoundSol) : 0;

  // Live ZINC/SOL from the Meteora pool vault reserves (both 9-dec -> raw ratio = SOL/ZINC).
  const wsolRaw = splTokenAmount(poolVaults?.[0]?.data);
  const zincRaw = splTokenAmount(poolVaults?.[1]?.data);
  const rawPrice = zincRaw > 0n ? Number(wsolRaw) / Number(zincRaw) : 0;
  const zincPriceSol = rawPrice >= 0.001 && rawPrice <= 100 ? rawPrice : 0; // sanity band

  const totalShares = sharesToNumber(b.totalShares);
  const solInVaultSol = lamportsToSol(b.solInVault);
  const navPerShareSol = totalShares > 0 ? solInVaultSol / totalShares : 0;
  const smeltedZincHeld = zincGramsToNumber(zp.zincInVault);
  const zincHeldValueSol = smeltedZincHeld * zincPriceSol;

  return {
    initialized: true,
    paused: !!zp.paused || !!b.paused,
    ddHalt: !!zp.ddHalt,
    phase: Number(b.phase),
    phaseStartedTs: Number(b.phaseStartedTs.toString()),
    openSecs: Number(b.openSecs.toString()),
    bettingSecs: Number(b.bettingSecs.toString()),
    windowSettled: b.windowSettled,
    totalShares,
    solInVaultSol,
    navPerShareSol,
    smeltedZincHeld,
    wonClaimableSol,
    zincPriceSol,
    zincHeldValueSol,
    claimsWindowNps: b.claimsWindowNps ? navX18ToNumber(b.claimsWindowNps) : 0,
    pullFeeBps: b.params.pullFeeBps,
    pullFeeEnabled: b.params.pullFeeEnabled,
    entryFeeBps: b.params.entryFeeBps,
    exitFeeBps: b.params.exitFeeBps,
  };
}

/** A wallet's dZINC share balance (raw share-token units -> number). 0 if none. */
export async function readZincUserShares(connection: Connection, owner: PublicKey): Promise<number> {
  const vault = makeVault(connection);
  const bn = await vault.read.userShares(ZINC, owner);
  return sharesToNumber(bn);
}

// ── park / cancel (parked-capital buffer: deposit while cranking) ────────────
// Park escrows SOL during the BETTING window (when normal deposit is closed)
// with NO shares minted; it converts to shares via finalize_pending once the
// next OPEN window has settled (the keeper does that automatically). Cancel
// pulls the un-shared escrow back any time.
//
// These two are built FROM THE DISCRIMINATOR + account layout directly (not via
// the SDK's program.methods / findPending* helpers) on purpose: park/cancel are
// new instructions, and a stale cached @cwr/abi/@cwr/sdk on the host can lack
// them. Building them by hand makes the park UI immune to that, it only needs
// the program id and the (stable) PDA seeds, both pinned here.

const CONFIG_SEED_BUF = Buffer.from("config");
const PENDING_STATE_SEED_BUF = Buffer.from("pending_state");
const PENDING_TREASURY_SEED_BUF = Buffer.from("pending_treasury");
const PENDING_SEED_BUF = Buffer.from("pending");
const SIMPLE_BUCKET_BYTE = Buffer.from([SIMPLE as number]);
// Anchor 8-byte discriminators (sha256("global:<ix>")[:8]) from the IDL.
const PARK_DEPOSIT_DISC = Buffer.from([78, 114, 71, 170, 175, 185, 137, 182]);
const CANCEL_PENDING_DISC = Buffer.from([74, 87, 109, 242, 64, 192, 151, 71]);

const findPda = (seeds: (Buffer | Uint8Array)[], pid: PublicKey = PROGRAM_ID): PublicKey =>
  PublicKey.findProgramAddressSync(seeds, pid)[0];
const meta = (pubkey: PublicKey, isSigner: boolean, isWritable: boolean) => ({ pubkey, isSigner, isWritable });

export async function buildParkDepositIxs(
  _connection: Connection,
  owner: PublicKey,
  lamports: BN,
): Promise<TransactionInstruction[]> {
  const config = findPda([CONFIG_SEED_BUF]);
  const bucket = deriveBucketAddresses(PROGRAM_ID, SIMPLE).bucket;
  const pendingState = findPda([PENDING_STATE_SEED_BUF, SIMPLE_BUCKET_BYTE]);
  const pendingTreasury = findPda([PENDING_TREASURY_SEED_BUF, SIMPLE_BUCKET_BYTE]);
  const pendingDeposit = findPda([PENDING_SEED_BUF, SIMPLE_BUCKET_BYTE, owner.toBuffer()]);
  const [miningAuthority] = findMiningAuthority(PROGRAM_ID, SIMPLE);
  const [oreMiner] = oreMinerPda(miningAuthority);

  // ParkDeposit accounts, in IDL order. data = disc(8) + amount(u64 LE).
  const keys = [
    meta(config, false, false),
    meta(bucket, false, false),
    meta(pendingState, false, true),
    meta(pendingTreasury, false, true),
    meta(oreMiner, false, false),
    meta(owner, true, true),
    meta(pendingDeposit, false, true),
    meta(SystemProgram.programId, false, false),
  ];
  const data = Buffer.concat([PARK_DEPOSIT_DISC, lamports.toArrayLike(Buffer, "le", 8)]);
  return [new TransactionInstruction({ programId: PROGRAM_ID, keys, data })];
}

export async function buildCancelPendingIxs(
  _connection: Connection,
  owner: PublicKey,
): Promise<TransactionInstruction[]> {
  const bucket = deriveBucketAddresses(PROGRAM_ID, SIMPLE).bucket;
  const pendingState = findPda([PENDING_STATE_SEED_BUF, SIMPLE_BUCKET_BYTE]);
  const pendingTreasury = findPda([PENDING_TREASURY_SEED_BUF, SIMPLE_BUCKET_BYTE]);
  const pendingDeposit = findPda([PENDING_SEED_BUF, SIMPLE_BUCKET_BYTE, owner.toBuffer()]);

  // CancelPending accounts, in IDL order. data = disc(8), no args.
  const keys = [
    meta(bucket, false, false),
    meta(pendingState, false, true),
    meta(pendingTreasury, false, true),
    meta(owner, true, true),
    meta(pendingDeposit, false, true),
    meta(SystemProgram.programId, false, false),
  ];
  return [new TransactionInstruction({ programId: PROGRAM_ID, keys, data: Buffer.from(CANCEL_PENDING_DISC) })];
}

/**
 * Read a wallet's open parked-deposit ticket (null if none). Decodes the
 * PendingDeposit account by hand (no SDK dependency): the Borsh layout is
 * disc(8) + owner(32) + bucket_id(1) + bump(1) + amount(u64@42) + parked_at(i64@50).
 */
export async function readPendingTicket(
  connection: Connection,
  owner: PublicKey,
): Promise<{ amountLamports: BN; parkedAt: number } | null> {
  const pendingDeposit = findPda([PENDING_SEED_BUF, SIMPLE_BUCKET_BYTE, owner.toBuffer()]);
  const info = await connection.getAccountInfo(pendingDeposit).catch(() => null);
  if (!info || info.data.length < 58) return null;
  const amountLamports = new BN(info.data.subarray(42, 50), "le");
  if (amountLamports.isZero()) return null;
  const parkedAt = new BN(info.data.subarray(50, 58), "le").toNumber();
  return { amountLamports, parkedAt };
}

// ── dZINC park (bucket 1) — mirrors the ORE park, SOL-only NAV ───────────────
// Park SOL into the dZINC pending buffer during the cranking window (when the
// normal depositZinc path is closed). No shares minted; convertible later by the
// keeper via finalize_pending_zinc, or reversible any time via cancel_pending.
export async function buildParkDepositZincIxs(
  connection: Connection,
  owner: PublicKey,
  lamports: BN,
): Promise<TransactionInstruction[]> {
  const vault = makeVault(connection);
  const program = vault.client.program;
  const addrs = deriveBucketAddresses(PROGRAM_ID, ZINC);
  const [zincPool] = zincPoolPda(PROGRAM_ID, ZINC);
  const [pendingState] = findPendingState(PROGRAM_ID, ZINC);
  const [pendingTreasury] = findPendingTreasury(PROGRAM_ID, ZINC);
  const [pendingDeposit] = findPendingDeposit(PROGRAM_ID, ZINC, owner);
  const ix = await program.methods
    .parkDepositZinc(lamports)
    .accountsPartial({
      config: vault.client.configPda,
      bucket: addrs.bucket,
      zincPool,
      pendingState,
      pendingTreasury,
      user: owner,
      pendingDeposit,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return [ix];
}

// Cancel an open dZINC parked ticket (full refund, ticket closed). cancel_pending
// is bucket-generic; this wires it for the ZINC bucket's pending PDAs.
export async function buildCancelPendingZincIxs(
  connection: Connection,
  owner: PublicKey,
): Promise<TransactionInstruction[]> {
  const vault = makeVault(connection);
  const program = vault.client.program;
  const addrs = deriveBucketAddresses(PROGRAM_ID, ZINC);
  const [pendingState] = findPendingState(PROGRAM_ID, ZINC);
  const [pendingTreasury] = findPendingTreasury(PROGRAM_ID, ZINC);
  const [pendingDeposit] = findPendingDeposit(PROGRAM_ID, ZINC, owner);
  const ix = await program.methods
    .cancelPending()
    .accountsPartial({
      bucket: addrs.bucket,
      pendingState,
      pendingTreasury,
      owner,
      pendingDeposit,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return [ix];
}

/** Read a wallet's open dZINC parked ticket (null if none). Same PendingDeposit
 *  layout as ORE: amount(u64@42), parked_at(i64@50). */
export async function readPendingTicketZinc(
  connection: Connection,
  owner: PublicKey,
): Promise<{ amountLamports: BN; parkedAt: number } | null> {
  const [pendingDeposit] = findPendingDeposit(PROGRAM_ID, ZINC, owner);
  const info = await connection.getAccountInfo(pendingDeposit).catch(() => null);
  if (!info || info.data.length < 58) return null;
  const amountLamports = new BN(info.data.subarray(42, 50), "le");
  if (amountLamports.isZero()) return null;
  const parkedAt = new BN(info.data.subarray(50, 58), "le").toNumber();
  return { amountLamports, parkedAt };
}

// ── settle (lazy-settle, permissionless user action) ─────────────────────────
// A fresh OPEN window starts window_settled=false; deposit AND withdraw both
// require window_settled (contract reverts WindowNotSettled otherwise), and the
// keeper NEVER settles by design. So the first user to interact in a window must
// run the settle gate, flipping window_settled=true and unlocking the window for
// everyone. Permissionless: any wallet can call it (it just pays the gas).
//
// Stage 2 (dORE) replaced the old settle_harvest (claim+wrap ORE->stORE) with
// the SLIM settle_uore: it claims only the won SOL (working capital) and advances
// the two uORE accumulators from the growth of the unclaimed miner legs, leaving
// the miner unclaimed so refining compounds. ORE is claimed+wrapped separately by
// the operator-gated batch_replenish, NOT here. Raw ix (wallet-signed) mirroring
// the SDK CrankApi.settleUore wiring.
export async function buildSettleUoreIxs(
  connection: Connection,
  owner: PublicKey,
): Promise<TransactionInstruction[]> {
  const vault = makeVault(connection);
  const program = vault.client.program;
  const addrs = deriveBucketAddresses(PROGRAM_ID, SIMPLE);
  const [miningAuthority] = findMiningAuthority(PROGRAM_ID, SIMPLE);
  const [oreMiner] = oreMinerPda(miningAuthority);
  const [oreBoard] = oreBoardPda();

  const settleIx = await program.methods
    .settleUore()
    .accountsPartial({
      bucket: addrs.bucket,
      treasury: addrs.treasury,
      miningAuthority,
      oreMiner,
      oreBoard,
      oreProgram: ORE_PROGRAM_ID,
      caller: owner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  // ClaimSOL + read_miner + two accumulator advances; modest CU, but raise the
  // ceiling defensively (free - no CU price set, so no extra priority fee).
  return [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), settleIx];
}

// ── Send + poll-confirm (no websocket) ───────────────────────────────────────
// Matches the wallet-adapter's sendTransaction (options typed loosely to avoid
// importing SendTransactionOptions and to sidestep param-variance friction).
type SendFn = (
  transaction: Transaction,
  connection: Connection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any,
) => Promise<TransactionSignature>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sendIxs(
  connection: Connection,
  sendTransaction: SendFn,
  ixs: TransactionInstruction[],
  owner: PublicKey,
): Promise<string> {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = owner;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  const sig = await sendTransaction(tx, connection);
  await pollConfirm(connection, sig, lastValidBlockHeight);
  return sig;
}

async function pollConfirm(
  connection: Connection,
  sig: string,
  lastValidBlockHeight: number,
  timeoutMs = 60_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const st = await connection.getSignatureStatus(sig, { searchTransactionHistory: false });
    const v = st?.value;
    if (v?.err) throw new Error(`Transaction failed: ${JSON.stringify(v.err)}`);
    if (v?.confirmationStatus === "confirmed" || v?.confirmationStatus === "finalized") return;
    const height = await connection.getBlockHeight("confirmed");
    if (height > lastValidBlockHeight) throw new Error("Transaction expired before confirmation.");
    await sleep(1500);
  }
  throw new Error("Confirmation timed out.");
}

export function explorerTx(sig: string): string {
  return `https://solscan.io/tx/${sig}`;
}
