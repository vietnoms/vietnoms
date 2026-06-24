import { getTurso } from "@/lib/turso";
import { generateToken } from "@/lib/marketing/tokens";

export type SubscriberSource =
  | "footer"
  | "popup"
  | "checkout"
  | "catering"
  | "rewards";

export interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  source: string;
  status: "subscribed" | "unsubscribed";
  unsubscribeToken: string;
  consentAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function rowToSubscriber(row: Record<string, unknown>): Subscriber {
  return {
    id: Number(row.id),
    email: row.email as string,
    name: (row.name as string) ?? null,
    phone: (row.phone as string) ?? null,
    source: row.source as string,
    status: row.status as "subscribed" | "unsubscribed",
    unsubscribeToken: row.unsubscribe_token as string,
    consentAt: row.consent_at as string,
    unsubscribedAt: (row.unsubscribed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/**
 * Add or re-activate a subscriber. Re-subscribing refreshes consent and
 * clears the unsubscribed state; an existing active subscription keeps its
 * original source and token.
 */
export async function subscribe(input: {
  email: string;
  name?: string;
  phone?: string;
  source: SubscriberSource;
}): Promise<Subscriber> {
  const db = getTurso();
  const email = normalizeEmail(input.email);
  const token = generateToken();

  await db.execute({
    sql: `INSERT INTO subscribers (email, name, phone, source, status, unsubscribe_token, consent_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'subscribed', ?, datetime('now'), datetime('now'), datetime('now'))
          ON CONFLICT(email) DO UPDATE SET
            name = COALESCE(excluded.name, subscribers.name),
            phone = COALESCE(excluded.phone, subscribers.phone),
            status = 'subscribed',
            consent_at = datetime('now'),
            unsubscribed_at = NULL,
            updated_at = datetime('now')`,
    args: [email, input.name ?? null, input.phone ?? null, input.source, token],
  });

  const result = await db.execute({
    sql: "SELECT * FROM subscribers WHERE email = ?",
    args: [email],
  });
  return rowToSubscriber(result.rows[0] as unknown as Record<string, unknown>);
}

export async function getSubscriberByToken(
  token: string
): Promise<Subscriber | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM subscribers WHERE unsubscribe_token = ?",
    args: [token],
  });
  if (result.rows.length === 0) return null;
  return rowToSubscriber(result.rows[0] as unknown as Record<string, unknown>);
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  const db = getTurso();
  const result = await db.execute({
    sql: `UPDATE subscribers
          SET status = 'unsubscribed', unsubscribed_at = datetime('now'), updated_at = datetime('now')
          WHERE unsubscribe_token = ? AND status = 'subscribed'`,
    args: [token],
  });
  return result.rowsAffected > 0;
}

export async function setResendContactId(
  id: number,
  contactId: string
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: "UPDATE subscribers SET resend_contact_id = ?, updated_at = datetime('now') WHERE id = ?",
    args: [contactId, id],
  });
}

export async function listSubscribers(options: {
  status?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ subscribers: Subscriber[]; total: number }> {
  const db = getTurso();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (options.status) {
    conditions.push("status = ?");
    args.push(options.status);
  }
  if (options.source) {
    conditions.push("source = ?");
    args.push(options.source);
  }
  if (options.search) {
    conditions.push("(email LIKE ? OR name LIKE ?)");
    const like = `%${options.search}%`;
    args.push(like, like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(options.limit ?? 50, 200);
  const offset = options.offset ?? 0;

  const [rows, count] = await Promise.all([
    db.execute({
      sql: `SELECT * FROM subscribers ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as total FROM subscribers ${where}`,
      args,
    }),
  ]);

  return {
    subscribers: rows.rows.map((row) =>
      rowToSubscriber(row as unknown as Record<string, unknown>)
    ),
    total: Number(count.rows[0].total),
  };
}

export async function getSubscriberStats(): Promise<{
  total: number;
  unsubscribed: number;
  last30Days: number;
  bySource: Record<string, number>;
}> {
  const db = getTurso();
  const [totals, recent, sources] = await Promise.all([
    db.execute(
      `SELECT
         SUM(CASE WHEN status = 'subscribed' THEN 1 ELSE 0 END) as total,
         SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) as unsubscribed
       FROM subscribers`
    ),
    db.execute(
      `SELECT COUNT(*) as count FROM subscribers
       WHERE status = 'subscribed' AND created_at >= datetime('now', '-30 days')`
    ),
    db.execute(
      `SELECT source, COUNT(*) as count FROM subscribers
       WHERE status = 'subscribed' GROUP BY source`
    ),
  ]);

  const bySource: Record<string, number> = {};
  for (const row of sources.rows) {
    bySource[row.source as string] = Number(row.count);
  }

  return {
    total: Number(totals.rows[0].total) || 0,
    unsubscribed: Number(totals.rows[0].unsubscribed) || 0,
    last30Days: Number(recent.rows[0].count) || 0,
    bySource,
  };
}

/** Export subscribers as CSV (RFC 4180 quoting). */
export function buildSubscriberCsv(
  rows: Pick<
    Subscriber,
    "email" | "name" | "phone" | "source" | "status" | "consentAt"
  >[]
): string {
  const escape = (value: string | null): string => {
    const v = value ?? "";
    if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };

  const header = "email,name,phone,source,status,consent_at";
  const lines = rows.map((row) =>
    [row.email, row.name, row.phone, row.source, row.status, row.consentAt]
      .map(escape)
      .join(",")
  );
  return [header, ...lines].join("\r\n");
}
