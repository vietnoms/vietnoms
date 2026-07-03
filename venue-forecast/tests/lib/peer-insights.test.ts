import { describe, it, expect } from "vitest";
import {
  buildPeerInsight,
  computeOwnBaselineByDow,
  buildForecast,
} from "@/lib/forecast";
import type { PeerSalesPoint } from "@/lib/db/peer-insights";
import type {
  ConventionEventRow,
  DailySalesRow,
} from "@/lib/db/convention-events";

// 2026-04-13 is a Monday (dayOfWeek=1), 2026-04-20 is also a Monday
const MONDAY = 1;

function peerPoint(
  tenantId: number,
  date: string,
  revenue: number,
  isEvent = false
): PeerSalesPoint {
  return {
    tenantId,
    date,
    dayOfWeek: new Date(date + "T00:00:00").getDay(),
    revenue,
    eventVenueId: isEvent ? 1 : null,
  };
}

describe("buildPeerInsight", () => {
  it("returns null when fewer than 2 peers contribute", () => {
    const history: PeerSalesPoint[] = [
      peerPoint(2, "2026-03-02", 100000),
      peerPoint(2, "2026-03-09", 120000),
      peerPoint(2, "2026-03-16", 180000, true),
    ];
    expect(buildPeerInsight(MONDAY, history, 100000)).toBeNull();
  });

  it("computes median uplift across 3 peers", () => {
    const history: PeerSalesPoint[] = [
      // Tenant 2: baseline 100, event 150 → +50%
      peerPoint(2, "2026-03-02", 100_00),
      peerPoint(2, "2026-03-09", 100_00),
      peerPoint(2, "2026-03-16", 150_00, true),
      // Tenant 3: baseline 200, event 260 → +30%
      peerPoint(3, "2026-03-02", 200_00),
      peerPoint(3, "2026-03-09", 200_00),
      peerPoint(3, "2026-03-16", 260_00, true),
      // Tenant 4: baseline 500, event 700 → +40%
      peerPoint(4, "2026-03-02", 500_00),
      peerPoint(4, "2026-03-09", 500_00),
      peerPoint(4, "2026-03-16", 700_00, true),
    ];

    const result = buildPeerInsight(MONDAY, history, 400_00);
    expect(result).not.toBeNull();
    expect(result!.peerCount).toBe(3);
    // median of [0.50, 0.30, 0.40] = 0.40 → +40%
    expect(result!.upliftPercent).toBe(40);
    // 400_00 * 1.40 = 560_00
    expect(result!.projectedRevenue).toBe(560_00);
  });

  it("skips peers missing baseline or event-day data", () => {
    const history: PeerSalesPoint[] = [
      // Tenant 2: full data, +50%
      peerPoint(2, "2026-03-02", 100_00),
      peerPoint(2, "2026-03-16", 150_00, true),
      // Tenant 3: no event day observations — should be skipped
      peerPoint(3, "2026-03-02", 200_00),
      peerPoint(3, "2026-03-09", 200_00),
      // Tenant 4: +50%
      peerPoint(4, "2026-03-02", 500_00),
      peerPoint(4, "2026-03-16", 750_00, true),
    ];

    const result = buildPeerInsight(MONDAY, history, 100_00);
    expect(result).not.toBeNull();
    expect(result!.peerCount).toBe(2);
    expect(result!.upliftPercent).toBe(50);
  });

  it("ignores peers with zero baseline to avoid divide-by-zero", () => {
    const history: PeerSalesPoint[] = [
      // Tenant 2: zero baseline
      peerPoint(2, "2026-03-02", 0),
      peerPoint(2, "2026-03-16", 100_00, true),
      // Tenants 3 & 4: real data
      peerPoint(3, "2026-03-02", 100_00),
      peerPoint(3, "2026-03-16", 120_00, true),
      peerPoint(4, "2026-03-02", 200_00),
      peerPoint(4, "2026-03-16", 240_00, true),
    ];

    const result = buildPeerInsight(MONDAY, history, 100_00);
    expect(result).not.toBeNull();
    expect(result!.peerCount).toBe(2);
    expect(result!.upliftPercent).toBe(20);
  });

  it("matches only the requested day-of-week", () => {
    const history: PeerSalesPoint[] = [
      // Mon baseline
      peerPoint(2, "2026-03-02", 100_00),
      // Tue baseline (dayOfWeek=2) — irrelevant
      peerPoint(2, "2026-03-03", 999_00),
      // Mon event day
      peerPoint(2, "2026-03-16", 150_00, true),
      peerPoint(3, "2026-03-02", 200_00),
      peerPoint(3, "2026-03-16", 300_00, true),
    ];

    const result = buildPeerInsight(MONDAY, history, 100_00);
    expect(result).not.toBeNull();
    // peer 2: 100 → 150 = +50%; peer 3: 200 → 300 = +50%
    expect(result!.upliftPercent).toBe(50);
  });
});

describe("computeOwnBaselineByDow", () => {
  it("excludes event days from baseline calculation", () => {
    const events: ConventionEventRow[] = [
      {
        id: 1,
        venueId: 1,
        venueName: "V",
        eventName: "E",
        startDate: "2026-03-16",
        endDate: "2026-03-16",
        expectedAttendance: 5000,
        eventType: null,
        notes: null,
        source: "csv",
        starred: false,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const sales: DailySalesRow[] = [
      {
        id: 1,
        tenantId: 1,
        date: "2026-03-02", // Mon, no event → baseline
        revenue: 100_00,
        transactionCount: null,
        avgTicket: null,
        posSource: null,
        notes: null,
        createdAt: "",
      },
      {
        id: 2,
        tenantId: 1,
        date: "2026-03-09", // Mon, no event → baseline
        revenue: 120_00,
        transactionCount: null,
        avgTicket: null,
        posSource: null,
        notes: null,
        createdAt: "",
      },
      {
        id: 3,
        tenantId: 1,
        date: "2026-03-16", // Mon, event day → excluded
        revenue: 500_00,
        transactionCount: null,
        avgTicket: null,
        posSource: null,
        notes: null,
        createdAt: "",
      },
    ];

    const byDow = computeOwnBaselineByDow(sales, events);
    expect(byDow[1]).toBe(110_00); // median of [100_00, 120_00]
  });

  it("returns null for weekdays with no sales", () => {
    const byDow = computeOwnBaselineByDow([], []);
    expect(byDow[0]).toBeNull();
    expect(byDow[6]).toBeNull();
  });
});

describe("buildForecast with peer insights", () => {
  it("attaches peerInsight to days with active events when peers + baseline exist", () => {
    const events: ConventionEventRow[] = [
      {
        id: 1,
        venueId: 1,
        venueName: "V",
        eventName: "Future Event",
        startDate: "2026-05-18", // Monday
        endDate: "2026-05-18",
        expectedAttendance: 5000,
        eventType: null,
        notes: null,
        source: "csv",
        starred: false,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const ownSales: DailySalesRow[] = [
      // Non-event Mondays providing baseline
      {
        id: 1,
        tenantId: 1,
        date: "2026-04-13",
        revenue: 200_00,
        transactionCount: null,
        avgTicket: null,
        posSource: null,
        notes: null,
        createdAt: "",
      },
      {
        id: 2,
        tenantId: 1,
        date: "2026-04-20",
        revenue: 220_00,
        transactionCount: null,
        avgTicket: null,
        posSource: null,
        notes: null,
        createdAt: "",
      },
    ];
    const peerByVenue = new Map<number, PeerSalesPoint[]>();
    peerByVenue.set(1, [
      peerPoint(2, "2026-04-13", 100_00),
      peerPoint(2, "2026-04-20", 100_00),
      peerPoint(2, "2026-03-16", 150_00, true),
      peerPoint(3, "2026-04-13", 300_00),
      peerPoint(3, "2026-04-20", 300_00),
      peerPoint(3, "2026-03-16", 450_00, true),
    ]);

    const days = buildForecast(
      "2026-05-18",
      "2026-05-18",
      events,
      ownSales,
      peerByVenue
    );

    expect(days).toHaveLength(1);
    expect(days[0].peerInsight).not.toBeNull();
    expect(days[0].peerInsight!.peerCount).toBe(2);
    expect(days[0].peerInsight!.upliftPercent).toBe(50);
  });

  it("sets peerInsight to null on non-event days", () => {
    const days = buildForecast("2026-04-01", "2026-04-01", [], [], new Map());
    expect(days[0].peerInsight).toBeNull();
  });
});
