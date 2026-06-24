/**
 * Referral client: talks to the off-chain referral service for registration,
 * dashboard, attestations, and metrics; builds the on-chain claim_referral tx
 * SELF-CONTAINED (immune to the stale @cwr/sdk cache, like the park/cancel ixs).
 */
import {
  Connection,
  Ed25519Program,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { PROGRAM_ID } from "./cwr";

export const REFERRAL_URL = (process.env.NEXT_PUBLIC_REFERRAL_URL || "").replace(/\/$/, "");

// claim_referral discriminator = sha256("global:claim_referral")[:8].
const CLAIM_REFERRAL_DISC = Buffer.from([219, 247, 18, 148, 63, 247, 112, 198]);
const REFERRAL_CONFIG_SEED = Buffer.from("referral_config");
const REFERRAL_TREASURY_SEED = Buffer.from("referral_treasury");
const REFERRER_SEED = Buffer.from("referrer");
const pda = (seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];

// ─── SIWS messages (must match the service's siws.ts byte-for-byte) ─────────
export const registerMessage = (referrer: string) =>
  `CWR referral program: register ${referrer}`;
export const joinMessage = (referred: string, code: string) =>
  `CWR referral program: join code ${code} as ${referred}`;
export const optInMessage = (referrer: string, optIn: boolean) =>
  `CWR referral program: set auto-payout ${optIn ? "on" : "off"} for ${referrer}`;

// ─── Service API ────────────────────────────────────────────────────────────
const unreachable = () =>
  new Error(`Can't reach the referral service (${REFERRAL_URL || "NEXT_PUBLIC_REFERRAL_URL not set"}). It may be offline or blocking this origin (CORS).`);

async function post(path: string, body: unknown): Promise<any> {
  const url = `${REFERRAL_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[referral] POST", url, e);
    throw unreachable();
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[referral] POST", url, res.status, json);
    throw new Error(json?.error ?? `Request failed (${res.status}) on ${path}`);
  }
  return json;
}
async function get(path: string): Promise<any> {
  const url = `${REFERRAL_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    console.error("[referral] GET", url, e);
    throw unreachable();
  }
  if (!res.ok) {
    console.error("[referral] GET", url, res.status);
    throw new Error(`Request failed (${res.status}) on ${path}`);
  }
  return res.json();
}

export type ReferrerStats = {
  referrer: string;
  code: string;
  autoOptIn: boolean;
  accruedLamports: string;
  finalizedAccruedLamports: string;
  claimedLamports: string;
  claimableLamports: string;
  referredCount: number;
};
export type Metrics = {
  referrers: string;
  referred_users: string;
  total_deployed: string;
  total_carve: string;
  total_referrer_earned: string;
  total_paid_out: string;
  finalized_slot: string;
};

export const registerReferrer = (referrer: string, signature: string) =>
  post("/api/register", { referrer, signature });
export const joinReferral = (referred: string, code: string, signature: string) =>
  post("/api/join", { referred, code, signature });
export const setOptIn = (referrer: string, optIn: boolean, signature: string) =>
  post("/api/opt-in", { referrer, optIn, signature });
export const fetchReferrer = (pubkey: string): Promise<ReferrerStats> =>
  get(`/api/referrer/${pubkey}`);
export const fetchMetrics = (): Promise<Metrics> => get("/api/metrics");
export const fetchClaimAttestation = (
  pubkey: string,
): Promise<{ cumulativeLamports: string; messageHex: string; signatureHex: string }> =>
  get(`/api/claim-attestation/${pubkey}`);

// ─── On-chain claim_referral (self-contained) ──────────────────────────────
/** Read the settlement authority (referral_config.settlement_authority @ 8..40). */
async function settlementAuthority(connection: Connection): Promise<PublicKey> {
  const info = await connection.getAccountInfo(pda([REFERRAL_CONFIG_SEED]));
  if (!info) throw new Error("referral program not initialized on-chain");
  return new PublicKey(info.data.subarray(8, 40));
}

/**
 * Build [ed25519(attestation), claim_referral] for the referrer to sign. The
 * attestation (message + signature) comes from the service; the referrer signs
 * + receives. Idempotent on-chain (the watermark pays cumulative - claimed).
 */
export async function buildClaimReferralIxs(
  connection: Connection,
  referrer: PublicKey,
  attestationMessageHex: string,
  attestationSignatureHex: string,
): Promise<TransactionInstruction[]> {
  const auth = await settlementAuthority(connection);
  const edIx = Ed25519Program.createInstructionWithPublicKey({
    publicKey: auth.toBytes(),
    message: Buffer.from(attestationMessageHex, "hex"),
    signature: Buffer.from(attestationSignatureHex, "hex"),
  });
  const claimIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: referrer, isSigner: true, isWritable: true },
      { pubkey: pda([REFERRER_SEED, referrer.toBuffer()]), isSigner: false, isWritable: true },
      { pubkey: pda([REFERRAL_CONFIG_SEED]), isSigner: false, isWritable: false },
      { pubkey: pda([REFERRAL_TREASURY_SEED]), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: CLAIM_REFERRAL_DISC,
  });
  return [edIx, claimIx];
}

export const lamportsToSol = (lamports: string | number | bigint): number =>
  Number(BigInt(lamports)) / 1e9;
