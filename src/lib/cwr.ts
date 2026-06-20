// Chain layer for the CWR frontend.
//
// Reads use the SDK's read-only client (a dummy wallet — no signer needed).
// Deposit/withdraw are built as raw instructions (the user pubkey is explicit),
// assembled into a tx, and signed+sent by the connected wallet adapter, then
// confirmed by POLLING getSignatureStatus — NO websocket subscription, so it
// works through the key-hiding /api/rpc proxy as well as a direct RPC.

import { BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
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
  deriveBucketAddresses,
  findFeeSchedule,
  findFeeBucket,
  findPosition,
  findMiningAuthority,
  oreMinerPda,
} from "@cwr/sdk";

export { BN, Bucket };

// ── Constants ──────────────────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "CLDmHatW3uszqHqCYgMkAk9jFW1Zse5yPV6RWdTArx2E",
);
/** V1 ships the Simple bucket only. */
export const SIMPLE: Bucket = Bucket.Simple;
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
  // absolute placeholder so `new Connection()` doesn't throw — it's never
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
