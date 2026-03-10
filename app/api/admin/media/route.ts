import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listMedia, insertMedia } from "@/lib/db/media";
import { getTurso } from "@/lib/turso";

async function runMigrations() {
  const db = getTurso();

  // Ensure media table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blob_url TEXT NOT NULL,
      filename TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'uncategorized',
      tags TEXT,
      source TEXT NOT NULL DEFAULT 'upload',
      width INTEGER,
      height INTEGER,
      size_bytes INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_media_category ON media(category)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_media_source ON media(source)");

  // Add gallery curation columns
  const alterStatements = [
    "ALTER TABLE media ADD COLUMN gallery_visible INTEGER DEFAULT 1",
    "ALTER TABLE media ADD COLUMN gallery_order INTEGER DEFAULT 0",
    "ALTER TABLE media ADD COLUMN caption TEXT",
  ];
  for (const sql of alterStatements) {
    try {
      await db.execute(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }
}

let migrated = false;

export async function GET(request: Request) {
  try {
    await requireAdmin();

    if (!migrated) {
      await runMigrations();
      migrated = true;
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const source = searchParams.get("source") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined;

    const media = await listMedia({ category, source, limit, offset });
    return NextResponse.json({ media });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    console.error("List media error:", error);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    if (!migrated) {
      await runMigrations();
      migrated = true;
    }

    const body = await request.json();
    const { blobUrl, filename, altText, category, tags, sizeBytes } = body;

    if (!blobUrl || !filename) {
      return NextResponse.json({ error: "Missing blobUrl or filename" }, { status: 400 });
    }

    const { id } = await insertMedia({
      blobUrl,
      filename,
      altText: altText || "",
      category: category || "uncategorized",
      tags: tags || undefined,
      source: "upload",
      sizeBytes: sizeBytes ?? undefined,
    });

    return NextResponse.json({ id, blobUrl, filename });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    console.error("Insert media error:", error);
    return NextResponse.json({ error: "Failed to insert media" }, { status: 500 });
  }
}
