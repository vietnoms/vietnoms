import { NextRequest, NextResponse } from "next/server";
import {
  getTenantBySlug,
  upsertConventionEvent,
  listVenues,
  createVenue,
} from "@/lib/db/convention-events";
import { slugify } from "@/lib/utils";

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

  const venues = await listVenues(tenant.id);
  const venueMap = new Map(venues.map((v) => [v.slug, v.id]));

  let imported = 0;
  const errors: string[] = [];

  for (const event of events) {
    try {
      let venueId: number | undefined;

      if (event.venue) {
        const venueSlug = slugify(event.venue);
        if (venueMap.has(venueSlug)) {
          venueId = venueMap.get(venueSlug);
        } else {
          const { id } = await createVenue({
            tenantId: tenant.id,
            name: event.venue,
            slug: venueSlug,
          });
          venueId = id;
          venueMap.set(venueSlug, id);
        }
      }

      await upsertConventionEvent({
        tenantId: tenant.id,
        venueId,
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
