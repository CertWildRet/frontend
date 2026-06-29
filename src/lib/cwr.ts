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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import {
  CwrVault,
  Bucket,
  STORE_MINT,
  ORE_MINT,
  ORE_PROGRAM_ID,
  ORE_STAKE_PROGRAM_ID,
  ORE_LST_PROGRAM_ID,
  deriveBucketAddresses,
  findFeeSchedule,
  findFeeBucket,
  findPosition,
  findMiningAuthority,
  oreMinerPda,
  oreBoardPda,
  oreTreasuryPda,
  oreLstVaultPda,
  oreStakeStakePda,
  oreStakeTreasuryPda,
  oreStakeVestingPda,
} from "@cwr/sdk";

export { BN, Bucket };

// ── Constants ──────────────────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "BLi7NKqekZGh5zWNwmUK2bzs2tAR3sPC7A1VrgQdEaYL",
);
/** V1 ships the Simple bucket only. */
export const SIMPLE: Bucket = Bucket.Simple;
/** Contract min_deposit for the Simple bucket (DepositBelowMinimum below this). */
export const MIN_DEPOSIT_SOL = 0.1;
export const SHARE_DECIMALS = 9;
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const NAV_SCALE = 1e18;

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

// ── settle_harvest (lazy-settle, permissionless user action) ─────────────────
// A fresh OPEN window starts window_settled=false; deposit AND withdraw both
// require window_settled (contract reverts WindowNotSettled otherwise), and the
// keeper NEVER settles by design. So the first user to interact in a window must
// run settle_harvest - it claims the mined round's SOL+ORE into the treasury and
// wraps the ORE to stORE, flipping window_settled=true and unlocking the window
// for everyone. Permissionless: any wallet can call it (it just pays the gas).
// Raw ix (wallet-signed) mirroring the SDK CrankApi.settleHarvest wiring.
export async function buildSettleHarvestIxs(
  connection: Connection,
  owner: PublicKey,
): Promise<TransactionInstruction[]> {
  const vault = makeVault(connection);
  const program = vault.client.program;
  const addrs = deriveBucketAddresses(PROGRAM_ID, SIMPLE);
  const [miningAuthority] = findMiningAuthority(PROGRAM_ID, SIMPLE);
  const [oreMiner] = oreMinerPda(miningAuthority);
  const [oreBoard] = oreBoardPda();
  const [oreTreasury] = oreTreasuryPda();
  const [oreLstVault] = oreLstVaultPda();
  const [oreLstStake] = oreStakeStakePda(oreLstVault);
  const [oreLstTreasury] = oreStakeTreasuryPda();
  const [oreLstVesting] = oreStakeVestingPda();

  const ata = (mint: PublicKey, ownerPk: PublicKey) =>
    getAssociatedTokenAddressSync(mint, ownerPk, true);
  const miningAuthorityOreAta = ata(ORE_MINT, miningAuthority);
  const miningAuthorityStoreAta = ata(STORE_MINT, miningAuthority);
  const oreTreasuryOreAta = ata(ORE_MINT, oreTreasury);
  const oreLstVaultOreAta = ata(ORE_MINT, oreLstVault);
  const oreLstStakeOreAta = ata(ORE_MINT, oreLstStake);
  const oreLstTreasuryOreAta = ata(ORE_MINT, oreLstTreasury);

  const settleIx = await program.methods
    .settleHarvest()
    .accountsPartial({
      bucket: addrs.bucket,
      treasury: addrs.treasury,
      miningAuthority,
      storeTreasury: addrs.storeTreasury,
      miningAuthorityOreAta,
      miningAuthorityStoreAta,
      oreMint: ORE_MINT,
      storeMint: STORE_MINT,
      oreMiner,
      oreBoard,
      oreTreasury,
      oreTreasuryOreAta,
      oreProgram: ORE_PROGRAM_ID,
      oreLstVault,
      oreLstVaultOreAta,
      oreLstStake,
      oreLstStakeOreAta,
      oreLstTreasury,
      oreLstTreasuryOreAta,
      oreLstVesting,
      oreStakeProgram: ORE_STAKE_PROGRAM_ID,
      oreLstProgram: ORE_LST_PROGRAM_ID,
      caller: owner,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  // settle does up to 2 ATA creates + ClaimSOL + ClaimORE + the 17-account
  // ore-lst Wrap - well past the 200k default CU. Raise the ceiling (free; no
  // CU price set, so no extra priority fee).
  return [ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }), settleIx];
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
