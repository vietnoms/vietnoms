import { describe, it, expect } from "vitest";
import {
  computeScheduledAt,
  isDue,
  isSuppressed,
  isWindowActive,
} from "@/lib/marketing/scheduling";

const now = new Date("2026-06-11T12:00:00Z");

describe("computeScheduledAt", () => {
  it("adds the delay in hours", () => {
    expect(computeScheduledAt(now, 3)).toBe("2026-06-11T15:00:00.000Z");
  });

  it("supports zero delay", () => {
    expect(computeScheduledAt(now, 0)).toBe(now.toISOString());
  });
});

describe("isDue", () => {
  it("is due when scheduled time has passed", () => {
    expect(isDue("2026-06-11T11:00:00Z", now)).toBe(true);
  });

  it("is due exactly at the scheduled time", () => {
    expect(isDue("2026-06-11T12:00:00Z", now)).toBe(true);
  });

  it("is not due before the scheduled time", () => {
    expect(isDue("2026-06-11T13:00:00Z", now)).toBe(false);
  });

  it("is never due for unparseable timestamps", () => {
    expect(isDue("not-a-date", now)).toBe(false);
  });
});

describe("isSuppressed", () => {
  it("is not suppressed without a prior request", () => {
    expect(isSuppressed(null, 30, now)).toBe(false);
  });

  it("suppresses within the suppression window", () => {
    expect(isSuppressed("2026-06-01T12:00:00Z", 30, now)).toBe(true);
  });

  it("does not suppress after the window has passed", () => {
    expect(isSuppressed("2026-04-01T12:00:00Z", 30, now)).toBe(false);
  });
});

describe("isWindowActive", () => {
  it("is inactive when disabled regardless of dates", () => {
    expect(
      isWindowActive({ startsAt: null, endsAt: null, active: false }, now)
    ).toBe(false);
  });

  it("evergreen window is active", () => {
    expect(
      isWindowActive({ startsAt: null, endsAt: null, active: true }, now)
    ).toBe(true);
  });

  it("is inactive before the start date", () => {
    expect(
      isWindowActive(
        { startsAt: "2026-06-12T00:00:00Z", endsAt: null, active: true },
        now
      )
    ).toBe(false);
  });

  it("is active between start and end", () => {
    expect(
      isWindowActive(
        {
          startsAt: "2026-06-10T00:00:00Z",
          endsAt: "2026-06-12T00:00:00Z",
          active: true,
        },
        now
      )
    ).toBe(true);
  });

  it("is inactive after the end date", () => {
    expect(
      isWindowActive(
        { startsAt: null, endsAt: "2026-06-11T00:00:00Z", active: true },
        now
      )
    ).toBe(false);
  });

  it("ignores unparseable boundaries", () => {
    expect(
      isWindowActive({ startsAt: "garbage", endsAt: "garbage", active: true }, now)
    ).toBe(true);
  });
});
