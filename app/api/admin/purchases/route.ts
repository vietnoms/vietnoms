import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listPurchases } from "@/lib/db/purchases";
import { getTurso } from "@/lib/turso";

async function ensureTable() {
  const db = getTurso();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      amount INTEGER NOT NULL,
      square_payment_id TEXT,
      square_order_id TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      gift_card_id TEXT,
      gift_card_gan TEXT,
      metadata TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

let migrated = false;

export async function GET(request: Request) {
  try {
    await requireAdmin();

    if (!migrated) {
      await ensureTable();
      migrated = true;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined;

    const purchases = await listPurchases({ type, status, limit, offset });
    return NextResponse.json({ purchases });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    console.error("List purchases error:", error);
    return NextResponse.json({ error: "Failed to list purchases" }, { status: 500 });
  }
}
