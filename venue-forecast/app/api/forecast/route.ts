import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  listConventionEvents,
  listDailySales,
  listVenues,
} from "@/lib/db/convention-events";
import { buildForecast, groupByWeek } from "@/lib/forecast";

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const months = parseInt(searchParams.get("months") ?? "3", 10);
  const venueIdParam = searchParams.get("venueId");
  const venueId = venueIdParam ? parseInt(venueIdParam, 10) : undefined;

  const today = new Date();
  const startDate = today.toISOString().split("T")[0];
  const endDate = new Date(
    today.getFullYear(),
    today.getMonth() + months,
    today.getDate()
  )
    .toISOString()
    .split("T")[0];

  const [events, sales, venues] = await Promise.all([
    listConventionEvents({
      tenantId: session.tenantId,
      fromDate: startDate,
      toDate: endDate,
      venueId,
    }),
    listDailySales({
      tenantId: session.tenantId,
      fromDate: startDate,
      toDate: endDate,
    }),
    listVenues(session.tenantId),
  ]);

  const forecast = buildForecast(startDate, endDate, events, sales);
  const weeks = groupByWeek(forecast);

  const busyWeeks = weeks.filter(
    (w) => w.impactLevel === "high" || w.impactLevel === "critical"
  );

  return NextResponse.json({
    startDate,
    endDate,
    totalEvents: events.length,
    weeks,
    busyWeeks,
    upcomingEvents: events.slice(0, 20),
    venues,
  });
}
