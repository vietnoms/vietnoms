import { getTurso } from "@/lib/turso";

export interface RateLimitOptions {
  /** Max requests allowed per window */
  limit: number;
  /** Window length in seconds */
  windowSec: number;
}

export interface WindowState {
  windowStart: string | null; // ISO timestamp of current window start
  count: number;
}

export interface WindowEvaluation {
  allowed: boolean;
  newWindowStart: string;
  newCount: number;
}

/**
 * Pure fixed-window evaluation: given the stored window state and "now",
 * decide whether the request is allowed and what the new state should be.
 */
export function evaluateWindow(
  state: WindowState,
  now: Date,
  { limit, windowSec }: RateLimitOptions
): WindowEvaluation {
  const windowMs = windowSec * 1000;
  const startMs = state.windowStart ? Date.parse(state.windowStart) : NaN;

  if (Number.isNaN(startMs) || now.getTime() - startMs >= windowMs) {
    // New window
    return { allowed: true, newWindowStart: now.toISOString(), newCount: 1 };
  }

  const newCount = state.count + 1;
  return {
    allowed: newCount <= limit,
    newWindowStart: state.windowStart as string,
    newCount,
  };
}

/**
 * Check and consume one request against the fixed-window rate limit for `key`.
 * Fails open: a database error never blocks the underlying action.
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<{ allowed: boolean }> {
  try {
    const db = getTurso();
    const result = await db.execute({
      sql: "SELECT window_start, count FROM rate_limits WHERE key = ?",
      args: [key],
    });

    const state: WindowState =
      result.rows.length > 0
        ? {
            windowStart: result.rows[0].window_start as string,
            count: Number(result.rows[0].count),
          }
        : { windowStart: null, count: 0 };

    const evaluation = evaluateWindow(state, new Date(), options);

    await db.execute({
      sql: `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = excluded.count`,
      args: [key, evaluation.newWindowStart, evaluation.newCount],
    });

    return { allowed: evaluation.allowed };
  } catch (error) {
    console.error("Rate limit check failed (failing open):", error);
    return { allowed: true };
  }
}

/** Best-effort client IP extraction for rate-limit keys behind Vercel's proxy. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
