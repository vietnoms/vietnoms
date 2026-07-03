import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, setSession, clearSession } from "@/lib/auth";
import { getTurso } from "@/lib/turso";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT id FROM tenants ORDER BY id ASC LIMIT 1`,
    args: [],
  });

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: "No tenant configured" },
      { status: 500 }
    );
  }

  const tenantId = Number(result.rows[0].id);
  await setSession(tenantId);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
