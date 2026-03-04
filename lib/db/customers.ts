import { getTurso } from "@/lib/turso";

export async function upsertCustomer(customer: {
  id: string;
  phone: string;
  givenName?: string;
  familyName?: string;
  email?: string;
}) {
  const db = getTurso();
  await db.execute({
    sql: `INSERT INTO customers (id, phone, given_name, family_name, email, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            phone = excluded.phone,
            given_name = excluded.given_name,
            family_name = excluded.family_name,
            email = excluded.email,
            updated_at = datetime('now')`,
    args: [
      customer.id,
      customer.phone,
      customer.givenName ?? null,
      customer.familyName ?? null,
      customer.email ?? null,
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
