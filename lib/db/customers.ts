import { getTurso } from "@/lib/turso";

export async function upsertCustomer(customer: {
  id: string;
  phone: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  smsOptIn?: boolean;
  emailOptIn?: boolean;
}) {
  const db = getTurso();

  // Ensure consent columns exist (safe to run multiple times)
  await db.execute("ALTER TABLE customers ADD COLUMN sms_opt_in INTEGER DEFAULT 0").catch(() => {});
  await db.execute("ALTER TABLE customers ADD COLUMN email_opt_in INTEGER DEFAULT 0").catch(() => {});
  await db.execute("ALTER TABLE customers ADD COLUMN sms_opt_in_at TEXT").catch(() => {});

  await db.execute({
    sql: `INSERT INTO customers (id, phone, given_name, family_name, email, sms_opt_in, email_opt_in, sms_opt_in_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            phone = excluded.phone,
            given_name = excluded.given_name,
            family_name = excluded.family_name,
            email = excluded.email,
            sms_opt_in = CASE WHEN excluded.sms_opt_in = 1 THEN 1 ELSE customers.sms_opt_in END,
            email_opt_in = CASE WHEN excluded.email_opt_in = 1 THEN 1 ELSE customers.email_opt_in END,
            sms_opt_in_at = CASE WHEN excluded.sms_opt_in = 1 AND customers.sms_opt_in = 0 THEN datetime('now') ELSE customers.sms_opt_in_at END,
            updated_at = datetime('now')`,
    args: [
      customer.id,
      customer.phone,
      customer.givenName ?? null,
      customer.familyName ?? null,
      customer.email ?? null,
      customer.smsOptIn ? 1 : 0,
      customer.emailOptIn ? 1 : 0,
      customer.smsOptIn ? new Date().toISOString() : null,
    ],
  });
}

export async function getCustomer(id: string) {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM customers WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as string,
    phone: row.phone as string,
    givenName: row.given_name as string | null,
    familyName: row.family_name as string | null,
    email: row.email as string | null,
  };
}
