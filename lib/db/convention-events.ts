import { getTurso } from "@/lib/turso";

export interface ConventionEventRow {
  id: number;
  eventName: string;
  startDate: string;
  endDate: string;
  expectedAttendance: number | null;
  eventType: string | null;
  notes: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailySalesRow {
  id: number;
  date: string;
  revenue: number;
  transactionCount: number | null;
  notes: string | null;
  createdAt: string;
}

function mapEventRow(row: Record<string, unknown>): ConventionEventRow {
  return {
    id: Number(row.id),
    eventName: row.event_name as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    expectedAttendance: row.expected_attendance ? Number(row.expected_attendance) : null,
    eventType: (row.event_type as string) || null,
    notes: (row.notes as string) || null,
    source: row.source as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapSalesRow(row: Record<string, unknown>): DailySalesRow {
  return {
    id: Number(row.id),
    date: row.date as string,
    revenue: Number(row.revenue),
    transactionCount: row.transaction_count ? Number(row.transaction_count) : null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
  };
}

// --- Convention Events ---

export async function createConventionEvent(input: {
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
          (event_name, start_date, end_date, expected_attendance, event_type, notes, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
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
  eventName: string;
  startDate: string;
  endDate: string;
  expectedAttendance?: number;
  eventType?: string;
  notes?: string;
  source?: string;
}): Promise<{ id: number }> {
  const db = getTurso();
  // Check if an event with the same name and start date already exists
  const existing = await db.execute({
    sql: `SELECT id FROM convention_events WHERE event_name = ? AND start_date = ?`,
    args: [input.eventName, input.startDate],
  });

  if (existing.rows.length > 0) {
    const id = Number(existing.rows[0].id);
    await db.execute({
      sql: `UPDATE convention_events
            SET end_date = ?, expected_attendance = ?, event_type = ?, notes = ?,
                source = ?, updated_at = datetime('now')
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

  return createConventionEvent(input);
}

export async function listConventionEvents(opts?: {
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): Promise<ConventionEventRow[]> {
  const db = getTurso();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (opts?.fromDate) {
    conditions.push("end_date >= ?");
    args.push(opts.fromDate);
  }
  if (opts?.toDate) {
    conditions.push("start_date <= ?");
    args.push(opts.toDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ?? 200;
  args.push(limit);

  const result = await db.execute({
    sql: `SELECT * FROM convention_events ${where} ORDER BY start_date ASC LIMIT ?`,
    args,
  });

  return result.rows.map((row) => mapEventRow(row as unknown as Record<string, unknown>));
}

export async function deleteConventionEvent(id: number): Promise<void> {
  const db = getTurso();
  await db.execute({ sql: `DELETE FROM convention_events WHERE id = ?`, args: [id] });
}

// --- Daily Sales ---

export async function upsertDailySales(input: {
  date: string;
  revenue: number;
  transactionCount?: number;
  notes?: string;
}): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `INSERT INTO daily_sales (date, revenue, transaction_count, notes)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(date) DO UPDATE SET
            revenue = excluded.revenue,
            transaction_count = excluded.transaction_count,
            notes = excluded.notes`,
    args: [
      input.date,
      input.revenue,
      input.transactionCount ?? null,
      input.notes ?? null,
    ],
  });
}

export async function listDailySales(opts?: {
  fromDate?: string;
  toDate?: string;
}): Promise<DailySalesRow[]> {
  const db = getTurso();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (opts?.fromDate) {
    conditions.push("date >= ?");
    args.push(opts.fromDate);
  }
  if (opts?.toDate) {
    conditions.push("date <= ?");
    args.push(opts.toDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.execute({
    sql: `SELECT * FROM daily_sales ${where} ORDER BY date ASC`,
    args,
  });

  return result.rows.map((row) => mapSalesRow(row as unknown as Record<string, unknown>));
}
