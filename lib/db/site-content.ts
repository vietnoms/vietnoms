import { getTurso } from "@/lib/turso";

let tableEnsured = false;

async function ensureTable() {
  if (tableEnsured) return;
  const db = getTurso();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  tableEnsured = true;
}

export async function getContent(key: string): Promise<string | null> {
  await ensureTable();
  const db = getTurso();
  const result = await db.execute({ sql: "SELECT value FROM site_content WHERE key = ?", args: [key] });
  return result.rows.length > 0 ? (result.rows[0].value as string) : null;
}

export async function getAllContent(): Promise<Record<string, string>> {
  await ensureTable();
  const db = getTurso();
  const result = await db.execute("SELECT key, value FROM site_content");
  const content: Record<string, string> = {};
  for (const row of result.rows) {
    content[row.key as string] = row.value as string;
  }
  return content;
}

export async function setContent(key: string, value: string): Promise<void> {
  await ensureTable();
  const db = getTurso();
  await db.execute({
    sql: `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [key, value],
  });
}

export async function setMultipleContent(entries: Record<string, string>): Promise<void> {
  await ensureTable();
  const db = getTurso();
  for (const [key, value] of Object.entries(entries)) {
    await db.execute({
      sql: `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      args: [key, value],
    });
  }
}
