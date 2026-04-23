import type { ConventionEventRow, DailySalesRow } from "@/lib/db/convention-events";
import type { PeerSalesPoint } from "@/lib/db/peer-insights";

export type ImpactLevel = "low" | "medium" | "high" | "critical";

export interface PeerInsight {
  upliftPercent: number;    // e.g., 45 means +45%
  peerCount: number;        // tenants contributing (≥ 2 required)
  projectedRevenue: number; // cents, applied to own baseline
}

export interface ForecastDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=Sun ... 6=Sat
  events: ConventionEventRow[];
  totalAttendance: number;
  impactLevel: ImpactLevel;
  impactScore: number; // 0-100
  historicalRevenue: number | null; // cents, from matching past event data
  peerInsight: PeerInsight | null;
}

export interface ForecastWeek {
  weekStart: string; // Monday YYYY-MM-DD
  weekEnd: string; // Sunday YYYY-MM-DD
  days: ForecastDay[];
  peakAttendance: number;
  totalAttendance: number;
  impactLevel: ImpactLevel;
  eventCount: number;
}

/**
 * Score an event's impact on restaurant traffic based on attendance.
 * Returns 0-100.
 */
export function scoreEventImpact(attendance: number): number {
  // Thresholds tuned for a convention center next to a restaurant:
  // <500 = minimal, 500-2000 = noticeable, 2000-10000 = busy, 10000+ = slammed
  if (attendance <= 0) return 5;
  if (attendance < 500) return Math.round(10 + (attendance / 500) * 15); // 10-25
  if (attendance < 2000) return Math.round(25 + ((attendance - 500) / 1500) * 25); // 25-50
  if (attendance < 10000) return Math.round(50 + ((attendance - 2000) / 8000) * 30); // 50-80
  return Math.min(100, Math.round(80 + ((attendance - 10000) / 20000) * 20)); // 80-100
}

export function impactLevelFromScore(score: number): ImpactLevel {
  if (score >= 70) return "critical";
  if (score >= 45) return "high";
  if (score >= 20) return "medium";
  return "low";
}

/**
 * Build a day-by-day forecast from events and optional historical sales.
 *
 * When ownSalesHistory and peerHistoryByVenue are provided, each day with an
 * event at a matching venue gets a `peerInsight` derived from anonymized peer
 * restaurant sales uplift patterns on past comparable days.
 */
export function buildForecast(
  startDate: string,
  endDate: string,
  events: ConventionEventRow[],
  ownSalesHistory?: DailySalesRow[],
  peerHistoryByVenue?: Map<number, PeerSalesPoint[]>
): ForecastDay[] {
  const ownSalesMap = new Map<string, DailySalesRow>();
  if (ownSalesHistory) {
    for (const s of ownSalesHistory) {
      ownSalesMap.set(s.date, s);
    }
  }

  // Own baselines per weekday (median of non-event days), used for projection.
  const ownBaselineByDow = computeOwnBaselineByDow(
    ownSalesHistory ?? [],
    events
  );

  const days: ForecastDay[] = [];
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    const dayOfWeek = current.getDay();

    const activeEvents = events.filter(
      (e) => e.startDate <= dateStr && e.endDate >= dateStr
    );

    const totalAttendance = activeEvents.reduce(
      (sum, e) => sum + (e.expectedAttendance ?? 0),
      0
    );

    const impactScore = activeEvents.length > 0
      ? Math.min(100, activeEvents.reduce((sum, e) => sum + scoreEventImpact(e.expectedAttendance ?? 0), 0))
      : 0;

    const sales = ownSalesMap.get(dateStr);

    let peerInsight: PeerInsight | null = null;
    if (peerHistoryByVenue && activeEvents.length > 0) {
      const ownBaseline = ownBaselineByDow[dayOfWeek] ?? null;
      // Use the highest-attendance active event's venue for peer matching
      const primaryEvent = activeEvents.reduce((a, b) =>
        (a.expectedAttendance ?? 0) >= (b.expectedAttendance ?? 0) ? a : b
      );
      const peerHistory = peerHistoryByVenue.get(primaryEvent.venueId);
      if (peerHistory && ownBaseline !== null) {
        peerInsight = buildPeerInsight(dayOfWeek, peerHistory, ownBaseline);
      }
    }

    days.push({
      date: dateStr,
      dayOfWeek,
      events: activeEvents,
      totalAttendance,
      impactScore,
      impactLevel: impactLevelFromScore(impactScore),
      historicalRevenue: sales?.revenue ?? null,
      peerInsight,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Compute a per-weekday baseline (median revenue) from own sales on
 * non-event days, for use in projecting event-day revenue via peer uplift.
 */
export function computeOwnBaselineByDow(
  sales: DailySalesRow[],
  events: ConventionEventRow[]
): Record<number, number | null> {
  const eventDates = new Set<string>();
  for (const ev of events) {
    const start = new Date(ev.startDate + "T00:00:00");
    const end = new Date(ev.endDate + "T00:00:00");
    const cur = new Date(start);
    while (cur <= end) {
      eventDates.add(cur.toISOString().split("T")[0]);
      cur.setDate(cur.getDate() + 1);
    }
  }

  const byDow: Record<number, number[]> = {};
  for (const s of sales) {
    if (eventDates.has(s.date)) continue;
    const dow = new Date(s.date + "T00:00:00").getDay();
    (byDow[dow] ??= []).push(s.revenue);
  }

  const out: Record<number, number | null> = {};
  for (let dow = 0; dow < 7; dow++) {
    out[dow] = byDow[dow]?.length ? median(byDow[dow]) : null;
  }
  return out;
}

/**
 * Aggregate peer uplift for a given day-of-week, requiring k-anonymity (N≥2).
 * Groups peer sales by tenant, computes each peer's event-day uplift vs their
 * own non-event baseline, then returns the median uplift across peers.
 */
export function buildPeerInsight(
  dayOfWeek: number,
  peerHistory: PeerSalesPoint[],
  ownBaseline: number
): PeerInsight | null {
  const byTenant = new Map<number, PeerSalesPoint[]>();
  for (const pt of peerHistory) {
    const arr = byTenant.get(pt.tenantId) ?? [];
    arr.push(pt);
    byTenant.set(pt.tenantId, arr);
  }

  const perPeerUplifts: number[] = [];
  const tenantPoints: PeerSalesPoint[][] = Array.from(byTenant.values());
  for (const points of tenantPoints) {
    const baselineRevenues = points
      .filter((p) => p.eventVenueId === null && p.dayOfWeek === dayOfWeek)
      .map((p) => p.revenue);
    const eventRevenues = points
      .filter((p) => p.eventVenueId !== null && p.dayOfWeek === dayOfWeek)
      .map((p) => p.revenue);

    if (baselineRevenues.length === 0 || eventRevenues.length === 0) continue;

    const peerBaseline = median(baselineRevenues);
    if (peerBaseline <= 0) continue;

    const eventMedian = median(eventRevenues);
    perPeerUplifts.push((eventMedian - peerBaseline) / peerBaseline);
  }

  if (perPeerUplifts.length < 2) return null;

  const medianUplift = median(perPeerUplifts);
  return {
    upliftPercent: Math.round(medianUplift * 100),
    peerCount: perPeerUplifts.length,
    projectedRevenue: Math.round(ownBaseline * (1 + medianUplift)),
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[(n - 1) / 2];
}

/**
 * Group forecast days into weeks (Mon-Sun).
 */
export function groupByWeek(days: ForecastDay[]): ForecastWeek[] {
  const weeks: ForecastWeek[] = [];
  let currentWeek: ForecastDay[] = [];

  for (const day of days) {
    // Start a new week on Monday (dayOfWeek === 1)
    if (day.dayOfWeek === 1 && currentWeek.length > 0) {
      weeks.push(summarizeWeek(currentWeek));
      currentWeek = [];
    }
    currentWeek.push(day);
  }

  if (currentWeek.length > 0) {
    weeks.push(summarizeWeek(currentWeek));
  }

  return weeks;
}

function summarizeWeek(days: ForecastDay[]): ForecastWeek {
  const peakAttendance = Math.max(...days.map((d) => d.totalAttendance));
  const totalAttendance = days.reduce((sum, d) => sum + d.totalAttendance, 0);
  const peakScore = Math.max(...days.map((d) => d.impactScore));
  const eventCount = new Set(days.flatMap((d) => d.events.map((e) => e.id))).size;

  return {
    weekStart: days[0].date,
    weekEnd: days[days.length - 1].date,
    days,
    peakAttendance,
    totalAttendance,
    impactLevel: impactLevelFromScore(peakScore),
    eventCount,
  };
}

/**
 * Parse a convention center CSV into event objects.
 * Expects columns: Event Name, Start Date, End Date, Expected Attendance, Event Type, Notes
 * Dates can be MM/DD/YYYY or YYYY-MM-DD.
 */
export function parseEventsCsv(csvText: string): Array<{
  eventName: string;
  startDate: string;
  endDate: string;
  expectedAttendance?: number;
  eventType?: string;
  notes?: string;
}> {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

  const nameIdx = header.findIndex((h) => h.includes("event") && h.includes("name"));
  const startIdx = header.findIndex((h) => h.includes("start"));
  const endIdx = header.findIndex((h) => h.includes("end"));
  const attendanceIdx = header.findIndex(
    (h) => h.includes("attend") || h.includes("guest") || h.includes("count")
  );
  const typeIdx = header.findIndex((h) => h.includes("type") || h.includes("category"));
  const notesIdx = header.findIndex(
    (h) => h.includes("note") || h.includes("description") || h.includes("detail")
  );

  if (nameIdx === -1 || startIdx === -1) {
    throw new Error(
      "CSV must have at least 'Event Name' and 'Start Date' columns"
    );
  }

  const events: Array<{
    eventName: string;
    startDate: string;
    endDate: string;
    expectedAttendance?: number;
    eventType?: string;
    notes?: string;
  }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    const eventName = cols[nameIdx]?.trim();
    if (!eventName) continue;

    const startDate = normalizeDate(cols[startIdx]?.trim());
    const endDate = endIdx !== -1 && cols[endIdx]?.trim()
      ? normalizeDate(cols[endIdx].trim())
      : startDate;

    if (!startDate) continue;

    const attendance =
      attendanceIdx !== -1 ? parseInt(cols[attendanceIdx]?.replace(/[^0-9]/g, ""), 10) : undefined;

    events.push({
      eventName,
      startDate,
      endDate: endDate || startDate,
      expectedAttendance: attendance && !isNaN(attendance) ? attendance : undefined,
      eventType: typeIdx !== -1 ? cols[typeIdx]?.trim() || undefined : undefined,
      notes: notesIdx !== -1 ? cols[notesIdx]?.trim() || undefined : undefined,
    });
  }

  return events;
}

/**
 * Parse a sales CSV into daily sales objects.
 * Expects columns: Date, Revenue, Transactions (optional), Notes (optional)
 */
export function parseSalesCsv(csvText: string): Array<{
  date: string;
  revenue: number;
  transactionCount?: number;
  notes?: string;
}> {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

  const dateIdx = header.findIndex((h) => h.includes("date"));
  const revenueIdx = header.findIndex(
    (h) => h.includes("revenue") || h.includes("sales") || h.includes("total") || h.includes("amount")
  );
  const txIdx = header.findIndex(
    (h) => h.includes("transaction") || h.includes("order") || h.includes("count")
  );
  const notesIdx = header.findIndex((h) => h.includes("note"));

  if (dateIdx === -1 || revenueIdx === -1) {
    throw new Error("CSV must have at least 'Date' and 'Revenue' columns");
  }

  const sales: Array<{
    date: string;
    revenue: number;
    transactionCount?: number;
    notes?: string;
  }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    const date = normalizeDate(cols[dateIdx]?.trim());
    if (!date) continue;

    const revenueStr = cols[revenueIdx]?.replace(/[$,\s]/g, "");
    const revenue = parseFloat(revenueStr);
    if (isNaN(revenue)) continue;

    // Convert dollars to cents if the value looks like dollars (has decimal point)
    const revenueCents = revenueStr.includes(".")
      ? Math.round(revenue * 100)
      : Math.round(revenue);

    const txCount =
      txIdx !== -1 ? parseInt(cols[txIdx]?.replace(/[^0-9]/g, ""), 10) : undefined;

    sales.push({
      date,
      revenue: revenueCents,
      transactionCount: txCount && !isNaN(txCount) ? txCount : undefined,
      notes: notesIdx !== -1 ? cols[notesIdx]?.trim() || undefined : undefined,
    });
  }

  return sales;
}

/** Parse a single CSV line, handling quoted fields */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/** Normalize dates to YYYY-MM-DD format */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const m = slashMatch[1].padStart(2, "0");
    const d = slashMatch[2].padStart(2, "0");
    return `${slashMatch[3]}-${m}-${d}`;
  }

  // Try Date constructor as fallback
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return "";
}
