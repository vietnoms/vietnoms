import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  listConventionEvents,
  upsertConventionEvent,
  deleteConventionEvent,
  updateEventStarred,
} from "@/lib/db/convention-events";
import { parseEventsCsv } from "@/lib/forecast";

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;
  const venueIdParam = searchParams.get("venueId");
  const venueId = venueIdParam ? parseInt(venueIdParam, 10) : undefined;

  const events = await listConventionEvents({
    tenantId: session.tenantId,
    fromDate,
    toDate,
    venueId,
  });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

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
      return NextResponse.json(
        { error: "No valid events found in CSV" },
        { status: 400 }
      );
    }

    let imported = 0;
    for (const event of events) {
      await upsertConventionEvent({
        ...event,
        tenantId: session.tenantId,
        source: "csv",
      });
      imported++;
    }

    return NextResponse.json({ imported, total: events.length });
  }

  const body = await req.json();
  const { eventName, startDate, endDate, expectedAttendance, eventType, notes, venueId } =
    body;

  if (!eventName || !startDate) {
    return NextResponse.json(
      { error: "eventName and startDate are required" },
      { status: 400 }
    );
  }

  const result = await upsertConventionEvent({
    tenantId: session.tenantId,
    venueId: venueId ? parseInt(venueId, 10) : undefined,
    eventName,
    startDate,
    endDate: endDate || startDate,
    expectedAttendance: expectedAttendance
      ? parseInt(expectedAttendance, 10)
      : undefined,
    eventType,
    notes,
    source: "manual",
  });

  return NextResponse.json({ id: result.id });
}

export async function PATCH(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, starred } = body;

  if (typeof id !== "number" || typeof starred !== "boolean") {
    return NextResponse.json(
      { error: "id (number) and starred (boolean) required" },
      { status: 400 }
    );
  }

  await updateEventStarred(session.tenantId, id, starred);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await deleteConventionEvent(session.tenantId, parseInt(id, 10));
  return NextResponse.json({ ok: true });
}
