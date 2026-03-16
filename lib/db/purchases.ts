import { getTurso } from "@/lib/turso";

export interface PurchaseRow {
  id: number;
  type: string;
  status: string;
  amount: number;
  squarePaymentId: string | null;
  squareOrderId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  giftCardId: string | null;
  giftCardGan: string | null;
  metadata: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): PurchaseRow {
  return {
    id: Number(row.id),
    type: row.type as string,
    status: row.status as string,
    amount: Number(row.amount),
    squarePaymentId: (row.square_payment_id as string) || null,
    squareOrderId: (row.square_order_id as string) || null,
    customerName: (row.customer_name as string) || null,
    customerEmail: (row.customer_email as string) || null,
    customerPhone: (row.customer_phone as string) || null,
    giftCardId: (row.gift_card_id as string) || null,
    giftCardGan: (row.gift_card_gan as string) || null,
    metadata: (row.metadata as string) || null,
    errorMessage: (row.error_message as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createPurchase(input: {
  type: string;
  status?: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  giftCardId?: string;
  giftCardGan?: string;
  metadata?: string;
}): Promise<{ id: number }> {
  const db = getTurso();
  const result = await db.execute({
    sql: `INSERT INTO purchases
          (type, status, amount, customer_name, customer_email, customer_phone,
           gift_card_id, gift_card_gan, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.type,
      input.status ?? "pending",
      input.amount,
      input.customerName ?? null,
      input.customerEmail ?? null,
      input.customerPhone ?? null,
      input.giftCardId ?? null,
      input.giftCardGan ?? null,
      input.metadata ?? null,
    ],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function updatePurchasePayment(
  id: number,
  squarePaymentId: string,
  squareOrderId?: string,
  amount?: number
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `UPDATE purchases
          SET status = 'completed', square_payment_id = ?, square_order_id = ?,
              amount = COALESCE(?, amount), updated_at = datetime('now')
          WHERE id = ?`,
    args: [squarePaymentId, squareOrderId ?? null, amount ?? null, id],
  });
}

export async function updatePurchaseStatus(
  id: number,
  status: string,
  errorMessage?: string
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `UPDATE purchases
          SET status = ?, error_message = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [status, errorMessage ?? null, id],
  });
}

export async function updatePurchaseGiftCard(
  id: number,
  giftCardId: string,
  giftCardGan: string
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `UPDATE purchases
          SET gift_card_id = ?, gift_card_gan = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [giftCardId, giftCardGan, id],
  });
}

export async function listPurchases(opts?: {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<PurchaseRow[]> {
  const db = getTurso();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (opts?.type) {
    conditions.push("type = ?");
    args.push(opts.type);
  }
  if (opts?.status) {
    conditions.push("status = ?");
    args.push(opts.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ?? 100;
  const offset = opts?.offset ?? 0;
  args.push(limit, offset);

  const result = await db.execute({
    sql: `SELECT * FROM purchases ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args,
  });

  return result.rows.map((row) => mapRow(row as unknown as Record<string, unknown>));
}
