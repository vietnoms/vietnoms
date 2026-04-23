import { describe, it, expect } from "vitest";
import {
  scoreEventImpact,
  impactLevelFromScore,
  buildForecast,
  groupByWeek,
  parseEventsCsv,
  parseSalesCsv,
} from "@/lib/forecast";
import type { ConventionEventRow } from "@/lib/db/convention-events";

describe("scoreEventImpact", () => {
  it("returns low scores for small events", () => {
    expect(scoreEventImpact(0)).toBeLessThanOrEqual(10);
    expect(scoreEventImpact(100)).toBeLessThan(25);
  });

  it("returns medium scores for mid-size events", () => {
    const score = scoreEventImpact(1000);
    expect(score).toBeGreaterThanOrEqual(25);
    expect(score).toBeLessThanOrEqual(50);
  });

  it("returns high scores for large events", () => {
    const score = scoreEventImpact(5000);
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThanOrEqual(80);
  });

  it("returns critical scores for massive events", () => {
    const score = scoreEventImpact(15000);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("caps at 100", () => {
    expect(scoreEventImpact(100000)).toBeLessThanOrEqual(100);
  });
});

describe("impactLevelFromScore", () => {
  it("maps scores to correct levels", () => {
    expect(impactLevelFromScore(5)).toBe("low");
    expect(impactLevelFromScore(19)).toBe("low");
    expect(impactLevelFromScore(20)).toBe("medium");
    expect(impactLevelFromScore(44)).toBe("medium");
    expect(impactLevelFromScore(45)).toBe("high");
    expect(impactLevelFromScore(69)).toBe("high");
    expect(impactLevelFromScore(70)).toBe("critical");
    expect(impactLevelFromScore(100)).toBe("critical");
  });
});

describe("buildForecast", () => {
  const makeEvent = (overrides: Partial<ConventionEventRow>): ConventionEventRow => ({
    id: 1,
    venueId: 1,
    venueName: "Convention Center",
    eventName: "Test Convention",
    startDate: "2026-04-10",
    endDate: "2026-04-12",
    expectedAttendance: 5000,
    eventType: "convention",
    notes: null,
    source: "csv",
    starred: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  });

  it("returns days in range with events matched", () => {
    const events = [makeEvent({})];
    const days = buildForecast("2026-04-09", "2026-04-13", events);

    expect(days).toHaveLength(5);
    // Day before event
    expect(days[0].events).toHaveLength(0);
    // Event days
    expect(days[1].events).toHaveLength(1);
    expect(days[2].events).toHaveLength(1);
    expect(days[3].events).toHaveLength(1);
    // Day after event
    expect(days[4].events).toHaveLength(0);
  });

  it("assigns impact levels based on attendance", () => {
    const events = [makeEvent({ expectedAttendance: 10000 })];
    const days = buildForecast("2026-04-10", "2026-04-10", events);

    expect(days[0].impactLevel).toBe("critical");
  });

  it("handles days with no events", () => {
    const days = buildForecast("2026-04-01", "2026-04-03", []);
    expect(days).toHaveLength(3);
    days.forEach((d) => {
      expect(d.events).toHaveLength(0);
      expect(d.impactScore).toBe(0);
      expect(d.impactLevel).toBe("low");
    });
  });

  it("includes historical revenue when provided", () => {
    const sales = [{ id: 1, tenantId: 1, date: "2026-04-10", revenue: 150000, transactionCount: 85, avgTicket: null, posSource: null, notes: null, createdAt: "" }];
    const days = buildForecast("2026-04-10", "2026-04-10", [], sales);
    expect(days[0].historicalRevenue).toBe(150000);
  });
});

describe("groupByWeek", () => {
  it("groups days into Monday-Sunday weeks", () => {
    // 2026-04-06 is a Monday
    const events = [
      {
        id: 1, venueId: 1, venueName: "Convention Center",
        eventName: "Big Show", startDate: "2026-04-07", endDate: "2026-04-09",
        expectedAttendance: 8000, eventType: "convention", notes: null,
        source: "csv", starred: false, createdAt: "", updatedAt: "",
      },
    ] satisfies ConventionEventRow[];

    const days = buildForecast("2026-04-06", "2026-04-19", events);
    const weeks = groupByWeek(days);

    expect(weeks).toHaveLength(2);
    expect(weeks[0].eventCount).toBe(1);
    expect(weeks[1].eventCount).toBe(0);
  });
});

describe("parseEventsCsv", () => {
  it("parses basic CSV with common headers", () => {
    const csv = `Event Name,Start Date,End Date,Expected Attendance,Event Type
Big Tech Conf,04/15/2026,04/17/2026,8000,conference
Small Meetup,2026-04-20,2026-04-20,200,`;

    const events = parseEventsCsv(csv);
    expect(events).toHaveLength(2);

    expect(events[0].eventName).toBe("Big Tech Conf");
    expect(events[0].startDate).toBe("2026-04-15");
    expect(events[0].endDate).toBe("2026-04-17");
    expect(events[0].expectedAttendance).toBe(8000);
    expect(events[0].eventType).toBe("conference");

    expect(events[1].startDate).toBe("2026-04-20");
    expect(events[1].expectedAttendance).toBe(200);
  });

  it("handles quoted fields with commas", () => {
    const csv = `Event Name,Start Date,End Date,Guest Count
"Smith, Jones & Associates Annual",04/10/2026,04/10/2026,"1,500"`;

    const events = parseEventsCsv(csv);
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe("Smith, Jones & Associates Annual");
    expect(events[0].expectedAttendance).toBe(1500);
  });

  it("throws on missing required columns", () => {
    const csv = `Name,Date\nTest,04/10/2026`;
    expect(() => parseEventsCsv(csv)).toThrow("Event Name");
  });

  it("uses start date as end date when end date is missing", () => {
    const csv = `Event Name,Start Date\nSolo Event,2026-05-01`;
    const events = parseEventsCsv(csv);
    expect(events[0].endDate).toBe("2026-05-01");
  });
});

describe("parseSalesCsv", () => {
  it("parses sales data with dollar amounts", () => {
    const csv = `Date,Revenue,Transactions
04/10/2026,$1500.50,85
04/11/2026,"$2,300.00",120`;

    const sales = parseSalesCsv(csv);
    expect(sales).toHaveLength(2);
    expect(sales[0].date).toBe("2026-04-10");
    expect(sales[0].revenue).toBe(150050); // cents
    expect(sales[0].transactionCount).toBe(85);
    expect(sales[1].revenue).toBe(230000);
  });

  it("throws on missing required columns", () => {
    const csv = `Date,Amount\n04/10/2026,100`;
    // "Amount" does not match "revenue" or "sales" or "total"
    // Actually it does not — let me check. No it doesn't.
    // Wait, the header check includes "amount" — let me re-check the code.
    // Actually parseSalesCsv does check for "amount" in the revenue index.
    // So this should work. Let me test with truly missing columns.
    const csv2 = `When,How Much\n04/10/2026,100`;
    expect(() => parseSalesCsv(csv2)).toThrow("Date");
  });
});
