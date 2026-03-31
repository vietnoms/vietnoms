import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  listConventionEvents,
  upsertConventionEvent,
  deleteConventionEvent,
} from "@/lib/db/convention-events";
import { parseEventsCsv } from "@/lib/forecast";

async function authorize(req: NextRequest): Promise<boolean> {
  // Service-to-service auth via API key (used by Vietnoms Tools on Railway)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey && process.env.FORECAST_API_KEY && apiKey === process.env.FORECAST_API_KEY) {
    return true;
  }
  // Fall back to admin cookie auth
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;

  const events = await listConventionEvents({ fromDate, toDate });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  // CSV upload
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const csvText = await file.text();
    let events;
    try {
      events = parseEventsCsv(csvText);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid CSV format" },
        { status: 400 }
      );
    }

    if (events.length === 0) {
      return NextResponse.json({ error: "No valid events found in CSV" }, { status: 400 });
    }

    let imported = 0;
    for (const event of events) {
      await upsertConventionEvent({ ...event, source: "csv" });
      imported++;
    }

    return NextResponse.json({ imported, total: events.length });
  }

  // Single event JSON
  const body = await req.json();
  const { eventName, startDate, endDate, expectedAttendance, eventType, notes } = body;

  if (!eventName || !startDate) {
    return NextResponse.json(
      { error: "eventName and startDate are required" },
      { status: 400 }
    );
  }

  const result = await upsertConventionEvent({
    eventName,
    startDate,
    endDate: endDate || startDate,
    expectedAttendance: expectedAttendance ? parseInt(expectedAttendance, 10) : undefined,
    eventType,
    notes,
    source: "manual",
  });

  return NextResponse.json({ id: result.id });
}

export async function DELETE(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await deleteConventionEvent(parseInt(id, 10));
  return NextResponse.json({ ok: true });
}
