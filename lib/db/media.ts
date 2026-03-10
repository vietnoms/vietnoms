import { getTurso } from "@/lib/turso";

export interface MediaRow {
  id: number;
  blobUrl: string;
  filename: string;
  altText: string;
  category: string;
  tags: string | null;
  source: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  galleryVisible: number;
  galleryOrder: number;
  caption: string | null;
  createdAt: string;
}

function mapRow(row: Record<string, unknown>): MediaRow {
  return {
    id: Number(row.id),
    blobUrl: row.blob_url as string,
    filename: row.filename as string,
    altText: row.alt_text as string,
    category: row.category as string,
    tags: (row.tags as string) || null,
    source: row.source as string,
    width: row.width != null ? Number(row.width) : null,
    height: row.height != null ? Number(row.height) : null,
    sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
    galleryVisible: row.gallery_visible != null ? Number(row.gallery_visible) : 1,
    galleryOrder: row.gallery_order != null ? Number(row.gallery_order) : 0,
    caption: (row.caption as string) || null,
    createdAt: row.created_at as string,
  };
}

export async function listMedia(opts?: {
  category?: string;
  source?: string;
  galleryOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<MediaRow[]> {
  const db = getTurso();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (opts?.category) {
    conditions.push("category = ?");
    args.push(opts.category);
  }
  if (opts?.source) {
    conditions.push("source = ?");
    args.push(opts.source);
  }
  if (opts?.galleryOnly) {
    conditions.push("gallery_visible = 1");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = opts?.galleryOnly
    ? "ORDER BY gallery_order ASC, created_at DESC"
    : "ORDER BY created_at DESC";
  const limit = opts?.limit ?? 100;
  const offset = opts?.offset ?? 0;
  args.push(limit, offset);

  const result = await db.execute({
    sql: `SELECT * FROM media ${where} ${orderBy} LIMIT ? OFFSET ?`,
    args,
  });

  return result.rows.map((row) => mapRow(row as Record<string, unknown>));
}

export async function getMediaById(id: number): Promise<MediaRow | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM media WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0] as Record<string, unknown>);
}

export async function insertMedia(data: {
  blobUrl: string;
  filename: string;
  altText: string;
  category: string;
  tags?: string;
  source?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}): Promise<{ id: number }> {
  const db = getTurso();
  const result = await db.execute({
    sql: `INSERT INTO media (blob_url, filename, alt_text, category, tags, source, width, height, size_bytes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.blobUrl,
      data.filename,
      data.altText,
      data.category,
      data.tags ?? null,
      data.source ?? "upload",
      data.width ?? null,
      data.height ?? null,
      data.sizeBytes ?? null,
    ],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function updateMedia(
  id: number,
  data: {
    altText?: string;
    category?: string;
    tags?: string;
    galleryVisible?: number;
    galleryOrder?: number;
    caption?: string;
  }
): Promise<void> {
  const db = getTurso();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (data.altText !== undefined) {
    sets.push("alt_text = ?");
    args.push(data.altText);
  }
  if (data.category !== undefined) {
    sets.push("category = ?");
    args.push(data.category);
  }
  if (data.tags !== undefined) {
    sets.push("tags = ?");
    args.push(data.tags);
  }
  if (data.galleryVisible !== undefined) {
    sets.push("gallery_visible = ?");
    args.push(data.galleryVisible);
  }
  if (data.galleryOrder !== undefined) {
    sets.push("gallery_order = ?");
    args.push(data.galleryOrder);
  }
  if (data.caption !== undefined) {
    sets.push("caption = ?");
    args.push(data.caption || null);
  }

  if (sets.length === 0) return;
  args.push(id);

  await db.execute({
    sql: `UPDATE media SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteMediaById(id: number): Promise<MediaRow | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM media WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;

  const row = mapRow(result.rows[0] as Record<string, unknown>);
  await db.execute({ sql: "DELETE FROM media WHERE id = ?", args: [id] });
  return row;
}
