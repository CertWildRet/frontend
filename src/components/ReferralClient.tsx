"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { utils } from "@coral-xyz/anchor";
import { WalletButton } from "./WalletButton";
import {
  REFERRAL_URL,
  registerMessage,
  joinMessage,
  optInMessage,
  registerReferrer,
  joinReferral,
  setOptIn,
  fetchReferrer,
  fetchMetrics,
  fetchClaimAttestation,
  buildClaimReferralIxs,
  lamportsToSol,
  type ReferrerStats,
  type Metrics,
} from "@/lib/referral";

const fmt = (n: number, d = 4) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function ReferralClient({ inviteCode }: { inviteCode?: string }) {
  const { connection } = useConnection();
  const { publicKey, signMessage, sendTransaction } = useWallet();
  const me = publicKey?.toBase58() ?? null;

  const [stats, setStats] = useState<ReferrerStats | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [joined, setJoined] = useState(false);

  const configured = REFERRAL_URL.length > 0;

  const refresh = useCallback(async () => {
    if (!me || !configured) return;
    try {
      const s = await fetchReferrer(me);
      setStats(s);
      setNotRegistered(false);
    } catch {
      setStats(null);
      setNotRegistered(true);
    }
  }, [me, configured]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (configured) fetchMetrics().then(setMetrics).catch(() => {});
  }, [configured]);

  const sign = useCallback(
    async (message: string): Promise<string> => {
      if (!signMessage) throw new Error("wallet can't sign messages");
      const sig = await signMessage(new TextEncoder().encode(message));
      return utils.bytes.bs58.encode(Buffer.from(sig));
    },
    [signMessage],
  );

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? String(e) });
    } finally {
      setBusy(null);
    }
  };

  const onRegister = () =>
    run("register", async () => {
      const sig = await sign(registerMessage(me!));
      const r = await registerReferrer(me!, sig);
      setMsg({ kind: "ok", text: `Registered. Your code: ${r.code}` });
      await refresh();
    });

  const onJoin = () =>
    run("join", async () => {
      const sig = await sign(joinMessage(me!, inviteCode!));
      const r = await joinReferral(me!, inviteCode!, sig);
      setJoined(true);
      setMsg({ kind: "ok", text: r.bound ? "You're in! Your deposits now credit your referrer." : "Already linked." });
    });

  const onOptIn = (next: boolean) =>
    run("optin", async () => {
      const sig = await sign(optInMessage(me!, next));
      await setOptIn(me!, next, sig);
      await refresh();
    });

  const onClaim = () =>
    run("claim", async () => {
      const att = await fetchClaimAttestation(me!);
      const ixs = await buildClaimReferralIxs(connection, publicKey!, att.messageHex, att.signatureHex);
      const tx = new Transaction().add(...ixs);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setMsg({ kind: "ok", text: `Claimed. tx ${sig.slice(0, 8)}…` });
      await refresh();
    });

  const shareLink = stats ? `${origin()}/referral/join=${stats.code}` : "";

  if (!configured) {
    return (
      <Card>
        <h3 className="font-display text-base font-semibold text-white">Referral program</h3>
        <p className="mt-2 font-mono text-[12px] text-fog-muted">
          The referral service isn&apos;t configured yet. Check back shortly.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {metrics && <MetricsBar m={metrics} />}

      {!me ? (
        <Card>
          <h3 className="font-display text-base font-semibold text-white">Connect to start</h3>
          <p className="mb-4 mt-1 font-mono text-[12px] text-fog-muted">
            Connect your wallet to {inviteCode ? "accept your invite" : "register and earn 0.1% of every deposit you bring"}.
          </p>
          <WalletButton />
        </Card>
      ) : inviteCode ? (
        <Card>
          <h3 className="font-display text-base font-semibold text-white">You were invited</h3>
          <p className="mb-4 mt-1 font-mono text-[12px] text-fog-muted">
            Join via code <span className="text-[#9DB7D8]">{inviteCode}</span>. Your future deposits will credit your
            referrer 0.1% of the volume they work — it costs you nothing.
          </p>
          {joined ? (
            <a href="/crank" className="btn-primary inline-block px-5 py-2">Go deposit →</a>
          ) : (
            <button onClick={onJoin} disabled={!!busy} className="btn-primary px-5 py-2 disabled:opacity-50">
              {busy === "join" ? "Signing…" : "Accept invite"}
            </button>
          )}
        </Card>
      ) : notRegistered ? (
        <Card>
          <h3 className="font-display text-base font-semibold text-white">Become a referrer</h3>
          <p className="mb-4 mt-1 font-mono text-[12px] text-fog-muted">
            Get a share link. Earn 0.1% of the deploy volume the pool works from everyone you bring, paid from the
            protocol fee — not from them. Claim your drip anytime.
          </p>
          <button onClick={onRegister} disabled={!!busy} className="btn-primary px-5 py-2 disabled:opacity-50">
            {busy === "register" ? "Signing…" : "Register & get my link"}
          </button>
        </Card>
      ) : stats ? (
        <Dashboard
          stats={stats}
          shareLink={shareLink}
          busy={busy}
          onClaim={onClaim}
          onOptIn={onOptIn}
        />
      ) : (
        <Card><p className="font-mono text-[12px] text-fog-muted">Loading…</p></Card>
      )}

      {msg && (
        <p className={`font-mono text-[12px] ${msg.kind === "ok" ? "text-pos" : "text-[#ec9b9b]"}`}>{msg.text}</p>
      )}
    </div>
  );
}

function Dashboard({
  stats, shareLink, busy, onClaim, onOptIn,
}: {
  stats: ReferrerStats;
  shareLink: string;
  busy: string | null;
  onClaim: () => void;
  onOptIn: (next: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const claimable = lamportsToSol(stats.claimableLamports);
  const accrued = lamportsToSol(stats.accruedLamports);
  const claimed = lamportsToSol(stats.claimedLamports);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Your referrals</h3>
        <span className="chip border-pos/40 text-white"><span className="live-dot text-pos" /> active</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Claimable" value={fmt(claimable)} unit="SOL" accent />
        <Stat label="Accrued (lifetime)" value={fmt(accrued)} unit="SOL" />
        <Stat label="Claimed" value={fmt(claimed)} unit="SOL" />
        <Stat label="Referred" value={String(stats.referredCount)} />
      </div>

      <div className="mt-5">
        <div className="label mb-1.5">Your share link</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border border-line bg-ink-800/60 px-3 py-2 font-mono text-[12px] text-fog-dim">
            {shareLink}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="btn-outline shrink-0 px-3 py-2 text-xs"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={onClaim}
          disabled={!!busy || claimable <= 0}
          className="btn-primary px-5 py-2 disabled:opacity-50"
        >
          {busy === "claim" ? "Claiming…" : claimable > 0 ? `Claim ${fmt(claimable)} SOL` : "Nothing to claim"}
        </button>
        <label className="flex cursor-pointer items-center gap-2 font-mono text-[12px] text-fog-muted">
          <input
            type="checkbox"
            checked={stats.autoOptIn}
            disabled={!!busy}
            onChange={(e) => onOptIn(e.target.checked)}
            className="accent-[#9DB7D8]"
          />
          Auto-payout (the keeper sends my rewards)
        </label>
      </div>
    </Card>
  );
}

function MetricsBar({ m }: { m: Metrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Referrers" value={Number(m.referrers).toLocaleString()} card />
      <Stat label="Referred users" value={Number(m.referred_users).toLocaleString()} card />
      <Stat label="Total referrer earnings" value={fmt(lamportsToSol(m.total_referrer_earned))} unit="SOL" card />
      <Stat label="Total paid out" value={fmt(lamportsToSol(m.total_paid_out))} unit="SOL" card />
    </div>
  );
}

function Stat({ label, value, unit, accent, card }: { label: string; value: string; unit?: string; accent?: boolean; card?: boolean }) {
  return (
    <div className={card ? "card px-4 py-3" : "rounded-lg border border-line bg-ink-800/60 px-3 py-2.5"}>
      <div className="label">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`num text-lg ${accent ? "gradient-text" : "text-white"}`}>{value}</span>
        {unit && <span className="font-mono text-[12px] text-fog-muted">{unit}</span>}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

function origin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://diamondpools.com";
}
