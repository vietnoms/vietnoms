import { describe, it, expect } from "vitest";
import {
  getHoursForDateString,
  generateCateringTimeSlots,
  isValidCateringTime,
  restaurantLocalToIso,
  formatEventDate,
  formatEventDateTime,
  formatTime12,
  timeToMinutes,
} from "@/lib/restaurant-hours";

// 2026-09-12 is a Saturday; 2026-09-13 Sunday; 2026-09-09 Wednesday; 2026-09-11 Friday.

describe("getHoursForDateString", () => {
  it("resolves weekday hours from the calendar date alone", () => {
    expect(getHoursForDateString("2026-09-09")?.days).toBe("Monday - Thursday");
    expect(getHoursForDateString("2026-09-11")?.close).toBe("8:00 PM");
    expect(getHoursForDateString("2026-09-12")?.close).toBe("8:00 PM");
    expect(getHoursForDateString("2026-09-13")?.days).toBe("Sunday");
  });

  it("returns null for malformed dates", () => {
    expect(getHoursForDateString("09/12/2026")).toBeNull();
    expect(getHoursForDateString("")).toBeNull();
    expect(getHoursForDateString("2026-13-01")).toBeNull();
  });
});

describe("generateCateringTimeSlots", () => {
  it("starts at opening and stops 30 minutes before close", () => {
    const slots = generateCateringTimeSlots("2026-09-12"); // Sat 11:30 AM - 8:00 PM
    expect(slots[0]).toEqual({ label: "11:30 AM", value: "11:30" });
    expect(slots[slots.length - 1]).toEqual({ label: "7:30 PM", value: "19:30" });
    expect(slots.every((s) => timeToMinutes(s.label) >= timeToMinutes("11:30 AM"))).toBe(true);
  });

  it("uses the shorter Sunday hours", () => {
    const slots = generateCateringTimeSlots("2026-09-13"); // Sun 11:30 AM - 7:00 PM
    expect(slots[slots.length - 1].value).toBe("18:30");
  });

  it("never offers early-morning slots", () => {
    expect(generateCateringTimeSlots("2026-09-12").some((s) => s.value < "11:30")).toBe(false);
  });

  it("returns nothing for an invalid date", () => {
    expect(generateCateringTimeSlots("")).toEqual([]);
  });
});

describe("isValidCateringTime", () => {
  it("accepts a slot within hours", () => {
    expect(isValidCateringTime("2026-09-12", "16:00")).toBe(true);
    expect(isValidCateringTime("2026-09-12", "11:30")).toBe(true);
  });

  it("rejects 3 AM, before opening, after the cutoff, off-grid, and malformed times", () => {
    expect(isValidCateringTime("2026-09-12", "03:00")).toBe(false);
    expect(isValidCateringTime("2026-09-12", "10:00")).toBe(false);
    expect(isValidCateringTime("2026-09-12", "19:45")).toBe(false);
    expect(isValidCateringTime("2026-09-12", "16:05")).toBe(false);
    expect(isValidCateringTime("2026-09-12", "4:00 PM")).toBe(false);
    expect(isValidCateringTime("2026-09-12", "")).toBe(false);
  });
});

describe("restaurantLocalToIso", () => {
  it("converts Pacific wall-clock time to UTC during daylight time", () => {
    expect(restaurantLocalToIso("2026-09-12", "16:00")).toBe("2026-09-12T23:00:00.000Z");
  });

  it("converts during standard time", () => {
    expect(restaurantLocalToIso("2026-12-12", "12:00")).toBe("2026-12-12T20:00:00.000Z");
  });

  it("does not treat the wall-clock time as UTC (the 3:00 AM pickup bug)", () => {
    const iso = restaurantLocalToIso("2026-09-12", "10:00");
    expect(iso).not.toBe("2026-09-12T10:00:00.000Z");
    const shown = new Date(iso).toLocaleTimeString("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
    });
    expect(shown).toBe("10:00 AM");
  });

  it("throws on malformed input", () => {
    expect(() => restaurantLocalToIso("2026-09-12", "4pm")).toThrow();
    expect(() => restaurantLocalToIso("Sept 12", "16:00")).toThrow();
  });
});

describe("formatting", () => {
  it("formats dates for humans", () => {
    expect(formatEventDate("2026-09-12")).toBe("Saturday, September 12, 2026");
    expect(formatEventDate("2026-09-12", "short")).toBe("Sat 9/12");
    expect(formatEventDate("not-a-date")).toBe("not-a-date");
  });

  it("formats date + time", () => {
    expect(formatEventDateTime("2026-09-12", "16:00")).toBe("Saturday, September 12, 2026 at 4:00 PM");
    expect(formatEventDateTime("2026-09-12", "16:00", "short")).toBe("Sat 9/12 4:00 PM");
    expect(formatEventDateTime("2026-09-12", "")).toBe("Saturday, September 12, 2026");
    expect(formatEventDateTime("2026-09-12", null)).toBe("Saturday, September 12, 2026");
  });

  it("formats 24h times as 12h", () => {
    expect(formatTime12("00:15")).toBe("12:15 AM");
    expect(formatTime12("12:00")).toBe("12:00 PM");
    expect(formatTime12("19:30")).toBe("7:30 PM");
  });
});
