import { getTurso } from "@/lib/turso";
import { slugify } from "@/lib/utils";

export interface ConventionEventRow {
  id: number;
  venueId: number;
  venueName: string;
  eventName: string;
  startDate: string;
  endDate: string;
  expectedAttendance: number | null;
  eventType: string | null;
  notes: string | null;
  source: string;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailySalesRow {
  id: number;
  tenantId: number;
  date: string;
  revenue: number;
  transactionCount: number | null;
  avgTicket: number | null;
  posSource: string | null;
  notes: string | null;
  createdAt: string;
}

export interface VenueRow {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  priority: number;
  createdAt: string;
}

function mapEventRow(row: Record<string, unknown>): ConventionEventRow {
  return {
    id: Number(row.id),
    venueId: Number(row.venue_id),
    venueName: row.venue_name as string,
    eventName: row.event_name as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    expectedAttendance: row.expected_attendance
      ? Number(row.expected_attendance)
      : null,
    eventType: (row.event_type as string) || null,
    notes: (row.notes as string) || null,
    source: row.source as string,
    starred: Boolean(row.starred),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapSalesRow(row: Record<string, unknown>): DailySalesRow {
  return {
    id: Number(row.id),
    tenantId: Number(row.tenant_id),
    date: row.date as string,
    revenue: Number(row.revenue),
    transactionCount: row.transaction_count
      ? Number(row.transaction_count)
      : null,
    avgTicket: row.avg_ticket ? Number(row.avg_ticket) : null,
    posSource: (row.pos_source as string) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
  };
}

function mapVenueRow(row: Record<string, unknown>): VenueRow {
  return {
    id: Number(row.id),
    name: row.name as string,
    slug: row.slug as string,
    address: (row.address as string) || null,
    city: (row.city as string) || null,
    priority: Number(row.priority ?? 0),
    createdAt: row.created_at as string,
  };
}

// --- Venues (canonical + subscriptions) ---

export async function findOrCreateVenue(input: {
  name: string;
  address?: string;
  city?: string;
}): Promise<{ id: number }> {
  const db = getTurso();
  const slug = slugify(input.name);
  const existing = await db.execute({
    sql: `SELECT id FROM venues WHERE slug = ?`,
    args: [slug],
  });
  if (existing.rows.length > 0) {
    return { id: Number(existing.rows[0].id) };
  }
  const result = await db.execute({
    sql: `INSERT INTO venues (name, slug, address, city) VALUES (?, ?, ?, ?)`,
    args: [input.name, slug, input.address ?? null, input.city ?? null],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function subscribeTenantToVenue(input: {
  tenantId: number;
  venueId: number;
  priority?: number;
}): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `INSERT INTO tenant_venues (tenant_id, venue_id, priority)
          VALUES (?, ?, ?)
          ON CONFLICT(tenant_id, venue_id) DO UPDATE SET priority = excluded.priority`,
    args: [input.tenantId, input.venueId, input.priority ?? 0],
  });
}

export async function unsubscribeTenantFromVenue(
  tenantId: number,
  venueId: number
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `DELETE FROM tenant_venues WHERE tenant_id = ? AND venue_id = ?`,
    args: [tenantId, venueId],
  });
}

export async function listVenues(tenantId: number): Promise<VenueRow[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT v.id, v.name, v.slug, v.address, v.city, v.created_at,
                 tv.priority
          FROM venues v
          INNER JOIN tenant_venues tv ON tv.venue_id = v.id
          WHERE tv.tenant_id = ?
          ORDER BY tv.priority DESC, v.name ASC`,
    args: [tenantId],
  });
  return result.rows.map((row) =>
    mapVenueRow(row as unknown as Record<string, unknown>)
  );
}

// --- Convention Events (shared, per-venue) ---

export async function upsertConventionEvent(input: {
  tenantId: number;
  venueId: number;
  eventName: string;
  startDate: string;
  endDate: string;
  expectedAttendance?: number;
  eventType?: string;
  notes?: string;
  source?: string;
}): Promise<{ id: number }> {
  const db = getTurso();
  const existing = await db.execute({
    sql: `SELECT id FROM convention_events
          WHERE venue_id = ? AND event_name = ? AND start_date = ?`,
    args: [input.venueId, input.eventName, input.startDate],
  });

  if (existing.rows.length > 0) {
    const id = Number(existing.rows[0].id);
    await db.execute({
      sql: `UPDATE convention_events
            SET end_date = ?,
                expected_attendance = COALESCE(?, expected_attendance),
                event_type = COALESCE(?, event_type),
                notes = COALESCE(?, notes),
                source = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        input.endDate,
        input.expectedAttendance ?? null,
        input.eventType ?? null,
        input.notes ?? null,
        input.source ?? "csv",
        id,
      ],
    });
    return { id };
  }

  const result = await db.execute({
    sql: `INSERT INTO convention_events
          (venue_id, event_name, start_date, end_date, expected_attendance,
           event_type, notes, source, added_by_tenant)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.venueId,
      input.eventName,
      input.startDate,
      input.endDate,
      input.expectedAttendance ?? null,
      input.eventType ?? null,
      input.notes ?? null,
      input.source ?? "csv",
      input.tenantId,
    ],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function listConventionEvents(opts: {
  tenantId: number;
  fromDate?: string;
  toDate?: string;
  venueId?: number;
}): Promise<ConventionEventRow[]> {
  const db = getTurso();
  // SQL binds in positional order: JOIN predicate first, then WHERE clause.
  const args: (string | number)[] = [opts.tenantId, opts.tenantId];
  const conditions: string[] = [
    `ce.venue_id IN (SELECT venue_id FROM tenant_venues WHERE tenant_id = ?)`,
  ];

  if (opts.fromDate) {
    conditions.push("ce.end_date >= ?");
    args.push(opts.fromDate);
  }
  if (opts.toDate) {
    conditions.push("ce.start_date <= ?");
    args.push(opts.toDate);
  }
  if (opts.venueId) {
    conditions.push("ce.venue_id = ?");
    args.push(opts.venueId);
  }

  const result = await db.execute({
    sql: `SELECT ce.*, v.name as venue_name,
                 CASE WHEN tes.event_id IS NULL THEN 0 ELSE 1 END AS starred
          FROM convention_events ce
          INNER JOIN venues v ON ce.venue_id = v.id
          LEFT JOIN tenant_event_stars tes
            ON tes.event_id = ce.id AND tes.tenant_id = ?
          WHERE ${conditions.join(" AND ")}
          ORDER BY ce.start_date ASC
          LIMIT 500`,
    args,
  });

  return result.rows.map((row) =>
    mapEventRow(row as unknown as Record<string, unknown>)
  );
}

export async function deleteConventionEvent(
  tenantId: number,
  id: number
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `DELETE FROM convention_events
          WHERE id = ? AND added_by_tenant = ?`,
    args: [id, tenantId],
  });
  await db.execute({
    sql: `DELETE FROM tenant_event_stars WHERE event_id = ?`,
    args: [id],
  });
}

export async function updateEventStarred(
  tenantId: number,
  eventId: number,
  starred: boolean
): Promise<void> {
  const db = getTurso();
  if (starred) {
    await db.execute({
      sql: `INSERT INTO tenant_event_stars (tenant_id, event_id)
            VALUES (?, ?)
            ON CONFLICT(tenant_id, event_id) DO NOTHING`,
      args: [tenantId, eventId],
    });
  } else {
    await db.execute({
      sql: `DELETE FROM tenant_event_stars
            WHERE tenant_id = ? AND event_id = ?`,
      args: [tenantId, eventId],
    });
  }
}

// --- Daily Sales (per-tenant) ---

export async function upsertDailySales(input: {
  tenantId: number;
  date: string;
  revenue: number;
  transactionCount?: number;
  avgTicket?: number;
  posSource?: string;
  notes?: string;
}): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `INSERT INTO daily_sales
          (tenant_id, date, revenue, transaction_count, avg_ticket, pos_source, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(tenant_id, date) DO UPDATE SET
            revenue = excluded.revenue,
            transaction_count = excluded.transaction_count,
            avg_ticket = excluded.avg_ticket,
            pos_source = excluded.pos_source,
            notes = excluded.notes`,
    args: [
      input.tenantId,
      input.date,
      input.revenue,
      input.transactionCount ?? null,
      input.avgTicket ?? null,
      input.posSource ?? null,
      input.notes ?? null,
    ],
  });
}

export async function listDailySales(opts: {
  tenantId: number;
  fromDate?: string;
  toDate?: string;
}): Promise<DailySalesRow[]> {
  const db = getTurso();
  const conditions: string[] = ["tenant_id = ?"];
  const args: (string | number)[] = [opts.tenantId];

  if (opts.fromDate) {
    conditions.push("date >= ?");
    args.push(opts.fromDate);
  }
  if (opts.toDate) {
    conditions.push("date <= ?");
    args.push(opts.toDate);
  }

  const result = await db.execute({
    sql: `SELECT * FROM daily_sales WHERE ${conditions.join(" AND ")} ORDER BY date ASC`,
    args,
  });

  return result.rows.map((row) =>
    mapSalesRow(row as unknown as Record<string, unknown>)
  );
}

export async function getTenantBySlug(
  slug: string
): Promise<{ id: number; name: string; apiKey: string | null } | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT id, name, api_key FROM tenants WHERE slug = ?`,
    args: [slug],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: row.name as string,
    apiKey: (row.api_key as string) || null,
  };
}
