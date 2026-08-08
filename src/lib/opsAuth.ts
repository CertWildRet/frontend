/**
 * Client-side holder for the ops session token.
 *
 * WHERE THE TOKEN LIVES, AND WHY
 * A module-scope variable — not sessionStorage, not localStorage, not a cookie.
 * The requirement was "held while the tab is open, forgotten on leaving the site", and
 * only in-memory satisfies the second half: sessionStorage survives navigating away and
 * coming back, and a cookie survives across tabs and is attached to requests
 * automatically, which would create a CSRF surface that a custom header simply does not
 * have. The cost of this choice is honest and worth stating: A PAGE REFRESH RE-PROMPTS.
 *
 * `pagehide` clears it because the back/forward cache can restore a page's whole JS
 * heap — without that, leaving the site and pressing Back could restore an
 * authenticated view.
 *
 * None of this is the security boundary. An attacker with script execution on this
 * origin can call the API with the page's own fetch regardless of where a token sits.
 * The boundary is that the analytics service refuses to answer without a valid token.
 */

let token: string | null = null;
let expiresAt = 0;
let lastActivity = 0;
const listeners = new Set<() => void>();

/** Tab hidden this long and we forget, for the laptop-left-open case. */
const IDLE_MS = 30 * 60_000;

function notify(): void {
  for (const fn of listeners) fn();
}

export function setOpsToken(next: string, expUnixSec: number): void {
  token = next;
  expiresAt = expUnixSec * 1000;
  lastActivity = Date.now();
  notify();
}

export function clearOpsToken(): void {
  if (token === null) return;
  token = null;
  expiresAt = 0;
  notify();
}

/** The token, or null when absent or expired. Expiry is checked on read so a session
 *  cannot appear live after its deadline just because nothing has polled recently. */
export function getOpsToken(): string | null {
  if (!token) return null;
  if (Date.now() >= expiresAt) {
    clearOpsToken();
    return null;
  }
  return token;
}

export const opsExpiresAt = (): number => expiresAt;

export function subscribeOps(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== "undefined") {
  // Fires on tab close AND on navigating away — including the bfcache path, which a
  // plain unload listener misses.
  window.addEventListener("pagehide", clearOpsToken);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      lastActivity = Date.now();
    } else if (lastActivity && Date.now() - lastActivity > IDLE_MS) {
      clearOpsToken();
    }
  });
}

export class OpsUnauthorizedError extends Error {
  constructor() {
    super("ops session required");
    this.name = "OpsUnauthorizedError";
  }
}

export type OpsAuthResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "rate_limited" | "unconfigured" | "unreachable"; retryAfter?: number };

/** Exchange a password for a session token. The password is never stored anywhere. */
export async function opsLogin(password: string): Promise<OpsAuthResult> {
  let res: Response;
  try {
    res = await fetch("/api/ops/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  if (res.status === 503) return { ok: false, reason: "unconfigured" };
  if (res.status === 502) return { ok: false, reason: "unreachable" };
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, reason: "rate_limited", retryAfter: Number(body?.retry_after) || 30 };
  }
  if (!res.ok) return { ok: false, reason: "invalid" };
  const body = await res.json().catch(() => null);
  if (!body?.token || !body?.expires_at) return { ok: false, reason: "invalid" };
  setOpsToken(String(body.token), Number(body.expires_at));
  return { ok: true };
}
