import { getTurso } from "@/lib/turso";
import { generateToken } from "@/lib/marketing/tokens";

export interface ReviewRequest {
  id: number;
  purchaseId: number | null;
  squareOrderId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  channel: "email" | "sms";
  token: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  respondedAt: string | null;
  rating: number | null;
  routedTo: string | null;
  createdAt: string;
}

function rowToRequest(row: Record<string, unknown>): ReviewRequest {
  return {
    id: Number(row.id),
    purchaseId: row.purchase_id != null ? Number(row.purchase_id) : null,
    squareOrderId: (row.square_order_id as string) ?? null,
    customerName: (row.customer_name as string) ?? null,
    customerEmail: (row.customer_email as string) ?? null,
    customerPhone: (row.customer_phone as string) ?? null,
    channel: row.channel as "email" | "sms",
    token: row.token as string,
    status: row.status as string,
    scheduledAt: row.scheduled_at as string,
    sentAt: (row.sent_at as string) ?? null,
    respondedAt: (row.responded_at as string) ?? null,
    rating: row.rating != null ? Number(row.rating) : null,
    routedTo: (row.routed_to as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function queueReviewRequest(data: {
  purchaseId?: number;
  squareOrderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  channel: "email" | "sms";
  scheduledAt: string;
}): Promise<{ id: number; token: string }> {
  const db = getTurso();
  const token = generateToken();
  const result = await db.execute({
    sql: `INSERT INTO review_requests
            (purchase_id, square_order_id, customer_name, customer_email, customer_phone, channel, token, status, scheduled_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?)`,
    args: [
      data.purchaseId ?? null,
      data.squareOrderId ?? null,
      data.customerName ?? null,
      data.customerEmail ?? null,
      data.customerPhone ?? null,
      data.channel,
      token,
      data.scheduledAt,
    ],
  });
  return { id: Number(result.lastInsertRowid), token };
}

/** Most recent request creation time for this customer (email or phone), for suppression. */
export async function lastRequestFor(
  email?: string,
  phone?: string
): Promise<string | null> {
  if (!email && !phone) return null;
  const db = getTurso();
  const conditions: string[] = [];
  const args: string[] = [];
  if (email) {
    conditions.push("customer_email = ?");
    args.push(email);
  }
  if (phone) {
    conditions.push("customer_phone = ?");
    args.push(phone);
  }
  const result = await db.execute({
    sql: `SELECT created_at FROM review_requests
          WHERE (${conditions.join(" OR ")}) AND status != 'cancelled'
          ORDER BY created_at DESC LIMIT 1`,
    args,
  });
  return result.rows.length > 0 ? (result.rows[0].created_at as string) : null;
}

export async function getDueRequests(
  nowIso: string,
  limit = 25
): Promise<ReviewRequest[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT * FROM review_requests
          WHERE status = 'queued' AND scheduled_at <= ?
          ORDER BY scheduled_at ASC LIMIT ?`,
    args: [nowIso, limit],
  });
  return result.rows.map((row) =>
    rowToRequest(row as unknown as Record<string, unknown>)
  );
}

export async function getRequestByToken(
  token: string
): Promise<ReviewRequest | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM review_requests WHERE token = ?",
    args: [token],
  });
  if (result.rows.length === 0) return null;
  return rowToRequest(result.rows[0] as unknown as Record<string, unknown>);
}

export async function markSent(id: number): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: "UPDATE review_requests SET status = 'sent', sent_at = datetime('now') WHERE id = ?",
    args: [id],
  });
}

export async function markFailed(id: number, error: string): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: "UPDATE review_requests SET status = 'failed', error_message = ? WHERE id = ?",
    args: [error.slice(0, 500), id],
  });
}

export async function markResponded(
  id: number,
  rating: number,
  routedTo: "public" | "private"
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `UPDATE review_requests
          SET status = 'responded', responded_at = datetime('now'), rating = ?, routed_to = ?
          WHERE id = ?`,
    args: [rating, routedTo, id],
  });
}

/** Cancel stale queued requests (e.g. older than N days) so they never send late. */
export async function cancelStaleRequests(olderThanDays: number): Promise<number> {
  const db = getTurso();
  const result = await db.execute({
    sql: `UPDATE review_requests SET status = 'cancelled'
          WHERE status = 'queued' AND created_at < datetime('now', ?)`,
    args: [`-${olderThanDays} days`],
  });
  return result.rowsAffected;
}

export async function listRequests(limit = 100): Promise<ReviewRequest[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM review_requests ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });
  return result.rows.map((row) =>
    rowToRequest(row as unknown as Record<string, unknown>)
  );
}

export async function getRequestStats(): Promise<{
  sent: number;
  responded: number;
  ratings: Record<number, number>;
}> {
  const db = getTurso();
  const [counts, ratings] = await Promise.all([
    db.execute(
      `SELECT
         SUM(CASE WHEN status IN ('sent','responded') THEN 1 ELSE 0 END) as sent,
         SUM(CASE WHEN status = 'responded' THEN 1 ELSE 0 END) as responded
       FROM review_requests`
    ),
    db.execute(
      `SELECT rating, COUNT(*) as count FROM review_requests
       WHERE rating IS NOT NULL GROUP BY rating`
    ),
  ]);

  const ratingMap: Record<number, number> = {};
  for (const row of ratings.rows) {
    ratingMap[Number(row.rating)] = Number(row.count);
  }

  return {
    sent: Number(counts.rows[0].sent) || 0,
    responded: Number(counts.rows[0].responded) || 0,
    ratings: ratingMap,
  };
}

// ---------- Private feedback ----------

export interface PrivateFeedback {
  id: number;
  reviewRequestId: number | null;
  rating: number | null;
  feedbackText: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  createdAt: string;
}

export async function insertPrivateFeedback(data: {
  reviewRequestId?: number;
  rating?: number;
  feedbackText?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<{ id: number }> {
  const db = getTurso();
  const result = await db.execute({
    sql: `INSERT INTO private_feedback
            (review_request_id, rating, feedback_text, customer_name, customer_email, customer_phone)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      data.reviewRequestId ?? null,
      data.rating ?? null,
      data.feedbackText ?? null,
      data.customerName ?? null,
      data.customerEmail ?? null,
      data.customerPhone ?? null,
    ],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function listPrivateFeedback(limit = 100): Promise<PrivateFeedback[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM private_feedback ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });
  return result.rows.map((row) => ({
    id: Number(row.id),
    reviewRequestId:
      row.review_request_id != null ? Number(row.review_request_id) : null,
    rating: row.rating != null ? Number(row.rating) : null,
    feedbackText: (row.feedback_text as string) ?? null,
    customerName: (row.customer_name as string) ?? null,
    customerEmail: (row.customer_email as string) ?? null,
    customerPhone: (row.customer_phone as string) ?? null,
    status: row.status as string,
    createdAt: row.created_at as string,
  }));
}

export async function markFeedbackRead(id: number): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: "UPDATE private_feedback SET status = 'read' WHERE id = ?",
    args: [id],
  });
}
