import { NextRequest, NextResponse } from "next/server";
import {
  getTenantBySlug,
  findOrCreateVenue,
  subscribeTenantToVenue,
  upsertConventionEvent,
} from "@/lib/db/convention-events";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedKey = process.env.INGEST_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { tenant_slug, events } = body;

  if (!tenant_slug || !Array.isArray(events)) {
    return NextResponse.json(
      { error: "tenant_slug and events[] required" },
      { status: 400 }
    );
  }

  const tenant = await getTenantBySlug(tenant_slug);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  let imported = 0;
  const errors: string[] = [];

  for (const event of events) {
    try {
      if (!event.venue) {
        errors.push(`${event.eventName}: missing venue`);
        continue;
      }

      const venue = await findOrCreateVenue({
        name: event.venue,
        address: event.venueAddress,
        city: event.venueCity,
      });
      await subscribeTenantToVenue({
        tenantId: tenant.id,
        venueId: venue.id,
      });

      await upsertConventionEvent({
        tenantId: tenant.id,
        venueId: venue.id,
        eventName: event.eventName,
        startDate: event.startDate,
        endDate: event.endDate || event.startDate,
        expectedAttendance: event.expectedAttendance,
        eventType: event.eventType,
        notes: event.notes,
        source: "email",
      });
      imported++;
    } catch (e) {
      errors.push(
        `${event.eventName}: ${e instanceof Error ? e.message : "unknown error"}`
      );
    }
  }

  return NextResponse.json({ imported, total: events.length, errors });
}
