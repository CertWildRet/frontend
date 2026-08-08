"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOpsToken, opsLogin, subscribeOps } from "@/lib/opsAuth";

/**
 * Lock screen for the ops page.
 *
 * Nothing inside renders until a session exists — no pollers start, no skeletons, no
 * layout of the real page. Be clear-eyed about what this is: hiding a React tree is a
 * curtain, not a lock. The actual enforcement is that the analytics service returns 401
 * for /ore/health and /admin/* without a valid token, so the data never reaches the
 * browser in the first place.
 */
export function OpsGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // The token lives in a module variable that other code (an expiring poll) can clear,
  // so mirror its state rather than trusting a local boolean.
  useEffect(() => subscribeOps(() => setAuthed(getOpsToken() != null)), []);
  useEffect(() => { setAuthed(getOpsToken() != null); }, []);
  useEffect(() => { if (!authed) inputRef.current?.focus(); }, [authed]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || cooldown > 0 || !password) return;
    setBusy(true);
    setError(null);
    const res = await opsLogin(password);
    setBusy(false);
    setPassword("");
    if (res.ok) { setAuthed(true); return; }
    // Branch on the reason, never on ok alone: rendering an unreachable service as
    // "wrong password" sends someone hunting for a password that was already correct.
    if (res.reason === "rate_limited") {
      setCooldown(res.retryAfter ?? 30);
      setError("Too many attempts.");
    } else if (res.reason === "unconfigured") {
      setError("The ops gate is not configured on the analytics service (OPS_PASSWORD_HASH is unset).");
    } else if (res.reason === "unreachable") {
      setError("Can't reach the analytics service — it may be restarting. Try again in a moment.");
    } else {
      setError("Incorrect password.");
    }
    inputRef.current?.focus();
  }, [busy, cooldown, password]);

  if (authed) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-[rgba(91,108,255,0.16)] bg-white/[0.02] p-6">
        <h1 className="text-lg font-semibold text-white">Restricted · Platform health</h1>
        <p className="mt-2 text-sm leading-relaxed text-fog-muted">
          This page shows ingestion forensics, outage history and API usage by caller.
          Enter the ops password to continue.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            maxLength={128}
            placeholder="Ops password"
            className="w-full rounded-lg border border-[rgba(91,108,255,0.24)] bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-fog-dim focus:border-[#22E0E6]"
          />
          <button
            type="submit"
            disabled={busy || cooldown > 0 || !password}
            className="w-full rounded-lg border border-[rgba(91,108,255,0.4)] bg-white/[0.04] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.08] disabled:opacity-40"
          >
            {busy ? "Checking…" : cooldown > 0 ? `Locked out · ${cooldown}s` : "Unlock"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-[#F87171]">{error}</p>}
        <p className="mt-5 text-xs leading-relaxed text-fog-dim">
          The session is held in memory for this tab only and is forgotten when you leave
          the site — <span className="text-fog-muted">refreshing the page will ask again</span>.
        </p>
      </div>
    </div>
  );
}
