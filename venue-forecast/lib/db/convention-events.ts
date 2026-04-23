import { getTurso } from "@/lib/turso";

export interface ConventionEventRow {
  id: number;
  tenantId: number;
  venueId: number | null;
  venueName: string | null;
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
  tenantId: number;
  name: string;
  slug: string;
  address: string | null;
  priority: number;
  createdAt: string;
}

function mapEventRow(row: Record<string, unknown>): ConventionEventRow {
  return {
    id: Number(row.id),
    tenantId: Number(row.tenant_id),
    venueId: row.venue_id ? Number(row.venue_id) : null,
    venueName: (row.venue_name as string) || null,
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
    tenantId: Number(row.tenant_id),
    name: row.name as string,
    slug: row.slug as string,
    address: (row.address as string) || null,
    priority: Number(row.priority),
    createdAt: row.created_at as string,
  };
}

// --- Convention Events ---

export async function createConventionEvent(input: {
  tenantId: number;
  venueId?: number;
  eventName: string;
  startDate: string;
  endDate: string;
  expectedAttendance?: number;
  eventType?: string;
  notes?: string;
  source?: string;
}): Promise<{ id: number }> {
  const db = getTurso();
  const result = await db.execute({
    sql: `INSERT INTO convention_events
          (tenant_id, venue_id, event_name, start_date, end_date,
           expected_attendance, event_type, notes, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.tenantId,
      input.venueId ?? null,
      input.eventName,
      input.startDate,
      input.endDate,
      input.expectedAttendance ?? null,
      input.eventType ?? null,
      input.notes ?? null,
      input.source ?? "csv",
    ],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function upsertConventionEvent(input: {
  tenantId: number;
  venueId?: number;
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
          WHERE tenant_id = ? AND event_name = ? AND start_date = ?`,
    args: [input.tenantId, input.eventName, input.startDate],
  });

  if (existing.rows.length > 0) {
    const id = Number(existing.rows[0].id);
    await db.execute({
      sql: `UPDATE convention_events
            SET end_date = ?, expected_attendance = ?, event_type = ?,
                venue_id = COALESCE(?, venue_id), notes = ?,
                source = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        input.endDate,
        input.expectedAttendance ?? null,
        input.eventType ?? null,
        input.venueId ?? null,
        input.notes ?? null,
        input.source ?? "csv",
        id,
      ],
    });
    return { id };
  }

  return createConventionEvent(input);
}

export async function listConventionEvents(opts: {
  tenantId: number;
  fromDate?: string;
  toDate?: string;
  venueId?: number;
  limit?: number;
}): Promise<ConventionEventRow[]> {
  const db = getTurso();
  const conditions: string[] = ["ce.tenant_id = ?"];
  const args: (string | number)[] = [opts.tenantId];

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

  const where = `WHERE ${conditions.join(" AND ")}`;
  const limit = opts.limit ?? 200;
  args.push(limit);

  const result = await db.execute({
    sql: `SELECT ce.*, v.name as venue_name
          FROM convention_events ce
          LEFT JOIN venues v ON ce.venue_id = v.id
          ${where}
          ORDER BY ce.start_date ASC LIMIT ?`,
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
    sql: `DELETE FROM convention_events WHERE id = ? AND tenant_id = ?`,
    args: [id, tenantId],
  });
}

export async function updateEventStarred(
  tenantId: number,
  id: number,
  starred: boolean
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `UPDATE convention_events
          SET starred = ?, updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ?`,
    args: [starred ? 1 : 0, id, tenantId],
  });
}

// --- Daily Sales ---

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

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await db.execute({
    sql: `SELECT * FROM daily_sales ${where} ORDER BY date ASC`,
    args,
  });

  return result.rows.map((row) =>
    mapSalesRow(row as unknown as Record<string, unknown>)
  );
}

// --- Venues ---

export async function createVenue(input: {
  tenantId: number;
  name: string;
  slug: string;
  address?: string;
  priority?: number;
}): Promise<{ id: number }> {
  const db = getTurso();
  const result = await db.execute({
    sql: `INSERT INTO venues (tenant_id, name, slug, address, priority)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      input.tenantId,
      input.name,
      input.slug,
      input.address ?? null,
      input.priority ?? 0,
    ],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function listVenues(tenantId: number): Promise<VenueRow[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT * FROM venues WHERE tenant_id = ? ORDER BY priority DESC, name ASC`,
    args: [tenantId],
  });
  return result.rows.map((row) =>
    mapVenueRow(row as unknown as Record<string, unknown>)
  );
}

export async function deleteVenue(
  tenantId: number,
  id: number
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `UPDATE convention_events SET venue_id = NULL
          WHERE venue_id = ? AND tenant_id = ?`,
    args: [id, tenantId],
  });
  await db.execute({
    sql: `DELETE FROM venues WHERE id = ? AND tenant_id = ?`,
    args: [id, tenantId],
  });
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
