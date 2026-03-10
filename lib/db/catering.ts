import { getTurso } from "@/lib/turso";

let tablesEnsured = false;
export async function ensureCateringTables() {
  if (tablesEnsured) return;
  const db = getTurso();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS catering_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'draft',
      event_date TEXT NOT NULL,
      guest_count INTEGER NOT NULL,
      package_type TEXT NOT NULL,
      customizations TEXT,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      delivery_type TEXT NOT NULL DEFAULT 'pickup',
      delivery_address TEXT,
      delivery_distance REAL,
      delivery_fee INTEGER DEFAULT 0,
      total_amount INTEGER,
      square_order_id TEXT,
      square_payment_id TEXT,
      notes TEXT,
      fulfillment_type TEXT NOT NULL DEFAULT 'email',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS catering_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catering_request_id INTEGER NOT NULL REFERENCES catering_requests(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER,
      notes TEXT
    )
  `);
  tablesEnsured = true;
}

export interface CateringRequestRow {
  id: number;
  status: string;
  eventDate: string;
  guestCount: number;
  packageType: string;
  customizations: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  deliveryType: string;
  deliveryAddress: string | null;
  deliveryDistance: number | null;
  deliveryFee: number;
  totalAmount: number | null;
  squareOrderId: string | null;
  squarePaymentId: string | null;
  notes: string | null;
  fulfillmentType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CateringItemRow {
  id: number;
  cateringRequestId: number;
  itemName: string;
  quantity: number;
  unitPrice: number | null;
  notes: string | null;
}

export interface CreateCateringRequestInput {
  status?: string;
  eventDate: string;
  guestCount: number;
  packageType: string;
  customizations?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  deliveryType?: string;
  deliveryAddress?: string;
  deliveryDistance?: number;
  deliveryFee?: number;
  totalAmount?: number;
  notes?: string;
  fulfillmentType?: string;
}

export interface CreateCateringItemInput {
  cateringRequestId: number;
  itemName: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}

function mapRow(row: Record<string, unknown>): CateringRequestRow {
  return {
    id: Number(row.id),
    status: row.status as string,
    eventDate: row.event_date as string,
    guestCount: Number(row.guest_count),
    packageType: row.package_type as string,
    customizations: row.customizations as string | null,
    contactName: row.contact_name as string,
    contactEmail: row.contact_email as string,
    contactPhone: row.contact_phone as string,
    deliveryType: row.delivery_type as string,
    deliveryAddress: row.delivery_address as string | null,
    deliveryDistance: row.delivery_distance != null ? Number(row.delivery_distance) : null,
    deliveryFee: Number(row.delivery_fee) || 0,
    totalAmount: row.total_amount != null ? Number(row.total_amount) : null,
    squareOrderId: row.square_order_id as string | null,
    squarePaymentId: row.square_payment_id as string | null,
    notes: row.notes as string | null,
    fulfillmentType: row.fulfillment_type as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapItemRow(row: Record<string, unknown>): CateringItemRow {
  return {
    id: Number(row.id),
    cateringRequestId: Number(row.catering_request_id),
    itemName: row.item_name as string,
    quantity: Number(row.quantity),
    unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
    notes: row.notes as string | null,
  };
}

export async function createCateringRequest(
  input: CreateCateringRequestInput
): Promise<{ id: number }> {
  const db = getTurso();
  const result = await db.execute({
    sql: `INSERT INTO catering_requests
          (status, event_date, guest_count, package_type, customizations,
           contact_name, contact_email, contact_phone,
           delivery_type, delivery_address, delivery_distance, delivery_fee,
           total_amount, notes, fulfillment_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.status ?? "draft",
      input.eventDate,
      input.guestCount,
      input.packageType,
      input.customizations ?? null,
      input.contactName,
      input.contactEmail,
      input.contactPhone,
      input.deliveryType ?? "pickup",
      input.deliveryAddress ?? null,
      input.deliveryDistance ?? null,
      input.deliveryFee ?? 0,
      input.totalAmount ?? null,
      input.notes ?? null,
      input.fulfillmentType ?? "email",
    ],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function createCateringItems(items: CreateCateringItemInput[]) {
  const db = getTurso();
  for (const item of items) {
    await db.execute({
      sql: `INSERT INTO catering_items (catering_request_id, item_name, quantity, unit_price, notes)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        item.cateringRequestId,
        item.itemName,
        item.quantity,
        item.unitPrice ?? null,
        item.notes ?? null,
      ],
    });
  }
}

export async function getCateringRequest(
  id: number
): Promise<CateringRequestRow | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT * FROM catering_requests WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0] as unknown as Record<string, unknown>);
}

export async function getCateringItems(
  requestId: number
): Promise<CateringItemRow[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT * FROM catering_items WHERE catering_request_id = ? ORDER BY id`,
    args: [requestId],
  });
  return result.rows.map((row) =>
    mapItemRow(row as unknown as Record<string, unknown>)
  );
}

export async function listCateringRequests(
  status?: string
): Promise<CateringRequestRow[]> {
  const db = getTurso();
  const sql = status
    ? `SELECT * FROM catering_requests WHERE status = ? ORDER BY created_at DESC`
    : `SELECT * FROM catering_requests ORDER BY created_at DESC`;
  const args = status ? [status] : [];
  const result = await db.execute({ sql, args });
  return result.rows.map((row) =>
    mapRow(row as unknown as Record<string, unknown>)
  );
}

export async function updateCateringRequestStatus(
  id: number,
  status: string
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `UPDATE catering_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [status, id],
  });
}

export async function updateCateringRequestPayment(
  id: number,
  squareOrderId: string,
  squarePaymentId: string,
  totalAmount: number
): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: `UPDATE catering_requests
          SET status = 'paid', square_order_id = ?, square_payment_id = ?,
              total_amount = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [squareOrderId, squarePaymentId, totalAmount, id],
  });
}
