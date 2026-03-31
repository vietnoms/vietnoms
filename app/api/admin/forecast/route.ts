import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listConventionEvents, listDailySales } from "@/lib/db/convention-events";
import { buildForecast, groupByWeek } from "@/lib/forecast";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const months = parseInt(searchParams.get("months") ?? "3", 10);

  const today = new Date();
  const startDate = today.toISOString().split("T")[0];
  const endDate = new Date(today.getFullYear(), today.getMonth() + months, today.getDate())
    .toISOString()
    .split("T")[0];

  const [events, sales] = await Promise.all([
    listConventionEvents({ fromDate: startDate, toDate: endDate }),
    listDailySales({ fromDate: startDate, toDate: endDate }),
  ]);

  const forecast = buildForecast(startDate, endDate, events, sales);
  const weeks = groupByWeek(forecast);

  // Find busy periods (high or critical impact weeks)
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
  });
}
