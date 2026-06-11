/**
 * Pure scheduling helpers shared by review requests, announcements/specials,
 * and the social post scheduler. All take explicit `now` for testability.
 */

export function computeScheduledAt(now: Date, delayHours: number): string {
  return new Date(now.getTime() + delayHours * 60 * 60 * 1000).toISOString();
}

export function isDue(scheduledAt: string, now: Date): boolean {
  const ts = Date.parse(scheduledAt);
  if (Number.isNaN(ts)) return false;
  return ts <= now.getTime();
}

/**
 * True when a customer received a review request recently enough that
 * we should not ask again.
 */
export function isSuppressed(
  lastRequestAt: string | null,
  suppressionDays: number,
  now: Date
): boolean {
  if (!lastRequestAt) return false;
  const ts = Date.parse(lastRequestAt);
  if (Number.isNaN(ts)) return false;
  return now.getTime() - ts < suppressionDays * 24 * 60 * 60 * 1000;
}

export interface ScheduleWindow {
  startsAt: string | null; // NULL = starts immediately
  endsAt: string | null; // NULL = evergreen
  active: boolean;
}

/** True when an announcement/special should currently be visible. */
export function isWindowActive(window: ScheduleWindow, now: Date): boolean {
  if (!window.active) return false;

  if (window.startsAt) {
    const start = Date.parse(window.startsAt);
    if (!Number.isNaN(start) && now.getTime() < start) return false;
  }

  if (window.endsAt) {
    const end = Date.parse(window.endsAt);
    if (!Number.isNaN(end) && now.getTime() > end) return false;
  }

  return true;
}
