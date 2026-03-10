import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/admin";
import { listMedia, insertMedia } from "@/lib/db/media";
import { getTurso } from "@/lib/turso";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
    }

    const altText = (formData.get("altText") as string) || "";
    const category = (formData.get("category") as string) || "uncategorized";
    const tags = (formData.get("tags") as string) || "";

    const blob = await put(`media/${Date.now()}-${file.name}`, file, { access: "public" });

    const { id } = await insertMedia({
      blobUrl: blob.url,
      filename: file.name,
      altText,
      category,
      tags: tags || undefined,
      source: "upload",
      sizeBytes: file.size,
    });

    return NextResponse.json({
      id,
      blobUrl: blob.url,
      filename: file.name,
      altText,
      category,
      tags,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    console.error("Upload media error:", error);
    return NextResponse.json({ error: "Failed to upload media" }, { status: 500 });
  }
}
