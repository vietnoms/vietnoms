import { RESTAURANT } from "./constants";

/** IANA timezone the restaurant operates in. All customer-facing times are in this zone. */
export const RESTAURANT_TZ = "America/Los_Angeles";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type DayName = (typeof DAY_NAMES)[number];
export type HoursEntry = (typeof RESTAURANT.hours)[number];

/** Find the hours entry (e.g. "Monday - Thursday") that covers a weekday. */
function findHoursForDay(dayName: DayName): HoursEntry | null {
  for (const entry of RESTAURANT.hours) {
    const parts = entry.days.split(" - ").map((s) => s.trim());
    if (parts.length === 1) {
      if (parts[0] === dayName) return entry;
    } else {
      const startIdx = DAY_NAMES.indexOf(parts[0] as DayName);
      const endIdx = DAY_NAMES.indexOf(parts[1] as DayName);
      const dayIdx = DAY_NAMES.indexOf(dayName);
      if (startIdx <= endIdx) {
        if (dayIdx >= startIdx && dayIdx <= endIdx) return entry;
      } else {
        if (dayIdx >= startIdx || dayIdx <= endIdx) return entry;
      }
    }
  }
  return null;
}

/** Minutes since midnight for a "h:mm AM/PM" string (e.g. "11:30 AM" is 690). */
export function timeToMinutes(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) throw new Error(`Invalid time format: ${timeStr}`);

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function parseTime(timeStr: string, refDate: Date): Date {
  const total = timeToMinutes(timeStr);
  const d = new Date(refDate);
  d.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return d;
}

function getTodayHours(date: Date = new Date()) {
  return findHoursForDay(DAY_NAMES[date.getDay()]);
}

export function isOpenNow(date: Date = new Date()): boolean {
  const hours = getTodayHours(date);
  if (!hours) return false;
  const open = parseTime(hours.open, date);
  const close = parseTime(hours.close, date);
  return date >= open && date < close;
}

export function getClosingTime(date: Date = new Date()): Date | null {
  const hours = getTodayHours(date);
  if (!hours) return null;
  return parseTime(hours.close, date);
}

export function getOpeningTime(date: Date = new Date()): Date | null {
  const hours = getTodayHours(date);
  if (!hours) return null;
  return parseTime(hours.open, date);
}

export function getOrderCutoff(date: Date = new Date()): Date | null {
  const closing = getClosingTime(date);
  if (!closing) return null;
  return new Date(closing.getTime() - 30 * 60 * 1000);
}

export function canAcceptOrders(date: Date = new Date()): boolean {
  if (!isOpenNow(date)) return false;
  const cutoff = getOrderCutoff(date);
  return cutoff !== null && date < cutoff;
}

export function getTodayHoursDisplay(date: Date = new Date()): string | null {
  const hours = getTodayHours(date);
  if (!hours) return null;
  return `${hours.open} - ${hours.close}`;
}

export const MAX_ADVANCE_DAYS = 7;

/** Find the next date+time the restaurant opens (could be later today or a future day). */
export function getNextOpeningTime(date: Date = new Date()): Date | null {
  // Check if we're before opening today
  const todayOpening = getOpeningTime(date);
  if (todayOpening && date < todayOpening) {
    return todayOpening;
  }

  // Otherwise check subsequent days (up to 8 to cover a full week)
  for (let i = 1; i <= 8; i++) {
    const futureDate = new Date(date);
    futureDate.setDate(futureDate.getDate() + i);
    futureDate.setHours(0, 0, 0, 0);
    const opening = getOpeningTime(futureDate);
    if (opening) return opening;
  }
  return null;
}

export function getDateHoursDisplay(date: Date): string | null {
  const hours = getTodayHours(date);
  if (!hours) return null;
  return `${hours.open} - ${hours.close}`;
}

export function generatePickupSlotsForDate(
  targetDate: Date,
  intervalMinutes: number = 15
): { label: string; value: string }[] {
  const now = new Date();
  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  if (isToday) {
    return generatePickupSlots(now, intervalMinutes);
  }

  // Future date: generate slots from opening time to cutoff
  const opening = getOpeningTime(targetDate);
  const cutoff = getOrderCutoff(targetDate);
  if (!opening || !cutoff) return [];

  const slots: { label: string; value: string }[] = [];
  const current = new Date(opening);

  while (current <= cutoff) {
    const label = current.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const value = `${current.getHours().toString().padStart(2, "0")}:${current
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    slots.push({ label, value });
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  return slots;
}

export function generatePickupSlots(
  date: Date = new Date(),
  intervalMinutes: number = 15
): { label: string; value: string }[] {
  const cutoff = getOrderCutoff(date);
  if (!cutoff) return [];

  const opening = getOpeningTime(date);

  // Start from now + 15 minutes, rounded up to next interval
  const startMs = date.getTime() + 15 * 60 * 1000;
  const startDate = new Date(startMs);
  const mins = startDate.getMinutes();
  const roundedMins = Math.ceil(mins / intervalMinutes) * intervalMinutes;
  startDate.setMinutes(roundedMins, 0, 0);

  // Don't allow slots before the store opens
  if (opening && startDate < opening) {
    startDate.setTime(opening.getTime());
  }

  const slots: { label: string; value: string }[] = [];
  const current = new Date(startDate);

  while (current <= cutoff) {
    const label = current.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const value = `${current.getHours().toString().padStart(2, "0")}:${current
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    slots.push({ label, value });
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Calendar-date helpers (timezone-safe)
//
// The helpers above operate on JS Date objects in the process's local zone, which is
// UTC on Vercel and whatever the visitor's machine uses in the browser. Catering
// scheduling works with plain "YYYY-MM-DD" + "HH:MM" strings that always mean the
// restaurant's wall-clock time, so these helpers never depend on the local zone.
// ---------------------------------------------------------------------------

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Slots are offered every 15 minutes, from opening until 30 minutes before close. */
export const CATERING_SLOT_INTERVAL_MINUTES = 15;
export const CATERING_LAST_SLOT_BEFORE_CLOSE_MINUTES = 30;

export function parseDateString(
  dateStr: string
): { year: number; month: number; day: number } | null {
  const m = typeof dateStr === "string" ? dateStr.match(DATE_RE) : null;
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function weekdayOf(dateStr: string): number | null {
  const p = parseDateString(dateStr);
  if (!p) return null;
  // Date.UTC keeps the calendar date intact regardless of the process timezone.
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

/** Restaurant hours for a calendar date, or null if closed / malformed. */
export function getHoursForDateString(dateStr: string): HoursEntry | null {
  const dow = weekdayOf(dateStr);
  if (dow === null) return null;
  return findHoursForDay(DAY_NAMES[dow]);
}

function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "16:00" becomes "4:00 PM" */
export function formatTime12(hhmm: string): string {
  const m = hhmm.match(TIME_RE);
  if (!m) return hhmm;
  const h = Number(m[1]) % 24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${period}`;
}

/** Pickup/delivery time slots available on a date, limited to the restaurant's hours. */
export function generateCateringTimeSlots(
  dateStr: string
): { label: string; value: string }[] {
  const hours = getHoursForDateString(dateStr);
  if (!hours) return [];
  const open = timeToMinutes(hours.open);
  const last = timeToMinutes(hours.close) - CATERING_LAST_SLOT_BEFORE_CLOSE_MINUTES;
  const slots: { label: string; value: string }[] = [];
  for (let t = open; t <= last; t += CATERING_SLOT_INTERVAL_MINUTES) {
    const value = minutesToHHMM(t);
    slots.push({ label: formatTime12(value), value });
  }
  return slots;
}

/** True when `timeStr` ("HH:MM") is one of the offered slots for that date. */
export function isValidCateringTime(dateStr: string, timeStr: string): boolean {
  if (typeof timeStr !== "string" || !TIME_RE.test(timeStr)) return false;
  return generateCateringTimeSlots(dateStr).some((s) => s.value === timeStr);
}

/** Offset (minutes) of `timeZone` from UTC at the given instant, e.g. -420 for PDT. */
function tzOffsetMinutes(utcDate: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcDate);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return Math.round((asUtc - utcDate.getTime()) / 60_000);
}

/**
 * Convert a wall-clock date + time in the restaurant's timezone to an ISO-8601 UTC
 * string (what Square expects for `pickupAt` / `deliverAt`).
 * Example: ("2026-09-12", "16:00") becomes "2026-09-12T23:00:00.000Z" during PDT.
 */
export function restaurantLocalToIso(dateStr: string, timeStr: string): string {
  const p = parseDateString(dateStr);
  const t = typeof timeStr === "string" ? timeStr.match(TIME_RE) : null;
  if (!p || !t) throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`);

  const naiveUtc = Date.UTC(p.year, p.month - 1, p.day, Number(t[1]), Number(t[2]));
  // Two passes so the offset is evaluated at the correct instant across DST boundaries.
  let utc = naiveUtc - tzOffsetMinutes(new Date(naiveUtc), RESTAURANT_TZ) * 60_000;
  utc = naiveUtc - tzOffsetMinutes(new Date(utc), RESTAURANT_TZ) * 60_000;
  return new Date(utc).toISOString();
}

/** "2026-09-12" becomes "Saturday, September 12, 2026" (long) or "Sat 9/12" (short). */
export function formatEventDate(dateStr: string, style: "long" | "short" = "long"): string {
  const p = parseDateString(dateStr);
  const dow = weekdayOf(dateStr);
  if (!p || dow === null) return dateStr;
  if (style === "short") return `${SHORT_DAY_NAMES[dow]} ${p.month}/${p.day}`;
  return `${DAY_NAMES[dow]}, ${MONTH_NAMES[p.month - 1]} ${p.day}, ${p.year}`;
}

/** Date plus optional "HH:MM" time: "Saturday, September 12, 2026 at 4:00 PM". */
export function formatEventDateTime(
  dateStr: string,
  timeStr?: string | null,
  style: "long" | "short" = "long"
): string {
  const date = formatEventDate(dateStr, style);
  if (!timeStr || !TIME_RE.test(timeStr)) return date;
  const time = formatTime12(timeStr);
  return style === "short" ? `${date} ${time}` : `${date} at ${time}`;
}
