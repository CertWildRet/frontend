/**
 * Normalize daily analytics series to complete UTC calendar days so chart edges
 * don't show partial-day dips (rolling window start + incomplete "today").
 */

export type CompleteUtcDayRange = "30d" | "90d" | "all";

const DAY_SECS = 86_400;

/** Unix seconds at UTC midnight for the calendar day containing `ms`. */
export function utcDayStart(ms: number): number {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000);
}

/**
 * Drop a leading partial day when a rolling window started mid-UTC-day.
 * Prefers calendar alignment (oldest ≠ expectedStart for an N-day window
 * ending yesterday). Falls back to a minted_ore heuristic when present.
 */
function dropLeadingPartial<T extends { day_ts: number; minted_ore?: number }>(
  pts: T[],
  n: number,
  yesterdayStart: number,
): T[] {
  if (pts.length === 0) return pts;

  const expectedStart = yesterdayStart - (n - 1) * DAY_SECS;
  const oldest = pts[0];

  // Contiguous N-day (or shorter) series ending yesterday: drop oldest if it
  // isn't the midnight-aligned window start.
  const endsYesterday = pts[pts.length - 1].day_ts === yesterdayStart;
  if (endsYesterday && oldest.day_ts > expectedStart) {
    return pts.slice(1);
  }

  // Belt-and-suspenders: leading minted total << next few days ⇒ partial day.
  if (
    typeof oldest.minted_ore === "number" &&
    pts.length >= 4
  ) {
    const next = [pts[1], pts[2], pts[3]]
      .map((p) => p.minted_ore)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
      .sort((a, b) => a - b);
    if (next.length === 3) {
      const median = next[1];
      if (median > 0 && oldest.minted_ore < median * 0.5) {
        return pts.slice(1);
      }
    }
  }

  return pts;
}

/**
 * Keep complete UTC days only.
 * - Always drops today (incomplete).
 * - For 30d / 90d: keep the last N complete days ending yesterday.
 * - For all: keep full history of complete days.
 */
export function completeUtcDays<T extends { day_ts: number; minted_ore?: number }>(
  points: T[],
  range: CompleteUtcDayRange,
  nowMs = Date.now(),
): T[] {
  const todayStart = utcDayStart(nowMs);
  const yesterdayStart = todayStart - DAY_SECS;

  let pts = points
    .filter((p) => p.day_ts < todayStart)
    .slice()
    .sort((a, b) => a.day_ts - b.day_ts);

  if (range === "all") return pts;

  const n = range === "30d" ? 30 : 90;
  if (pts.length > n) {
    pts = pts.slice(-n);
  }
  return dropLeadingPartial(pts, n, yesterdayStart);
}
