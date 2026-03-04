import { RESTAURANT } from "./constants";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function parseTime(timeStr: string, refDate: Date): Date {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) throw new Error(`Invalid time format: ${timeStr}`);

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const d = new Date(refDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function getTodayHours(date: Date = new Date()) {
  const dayName = DAY_NAMES[date.getDay()];

  for (const entry of RESTAURANT.hours) {
    const parts = entry.days.split(" - ").map((s) => s.trim());
    if (parts.length === 1) {
      if (parts[0] === dayName) return entry;
    } else {
      const startIdx = DAY_NAMES.indexOf(parts[0] as (typeof DAY_NAMES)[number]);
      const endIdx = DAY_NAMES.indexOf(parts[1] as (typeof DAY_NAMES)[number]);
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

export function generatePickupSlots(
  date: Date = new Date(),
  intervalMinutes: number = 15
): { label: string; value: string }[] {
  const cutoff = getOrderCutoff(date);
  if (!cutoff) return [];

  // Start from now + 15 minutes, rounded up to next interval
  const startMs = date.getTime() + 15 * 60 * 1000;
  const startDate = new Date(startMs);
  const mins = startDate.getMinutes();
  const roundedMins = Math.ceil(mins / intervalMinutes) * intervalMinutes;
  startDate.setMinutes(roundedMins, 0, 0);

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
