import { getTurso } from "@/lib/turso";

export type SocialPostStatus =
  | "draft"
  | "scheduled"
  | "ready"
  | "published"
  | "failed"
  | "cancelled";

export interface SocialPost {
  id: number;
  title: string | null;
  body: string;
  mediaId: number | null;
  mediaUrl: string | null;
  menuItemId: string | null;
  menuItemName: string | null;
  platforms: string[];
  scheduledAt: string;
  status: SocialPostStatus;
  publishedAt: string | null;
  externalIds: Record<string, string> | null;
  errorMessage: string | null;
  createdAt: string;
}

function rowToPost(row: Record<string, unknown>): SocialPost {
  let platforms: string[] = [];
  try {
    platforms = JSON.parse((row.platforms as string) || "[]");
  } catch {
    platforms = [];
  }
  let externalIds: Record<string, string> | null = null;
  try {
    externalIds = row.external_ids ? JSON.parse(row.external_ids as string) : null;
  } catch {
    externalIds = null;
  }

  return {
    id: Number(row.id),
    title: (row.title as string) ?? null,
    body: row.body as string,
    mediaId: row.media_id != null ? Number(row.media_id) : null,
    mediaUrl: (row.media_url as string) ?? null,
    menuItemId: (row.menu_item_id as string) ?? null,
    menuItemName: (row.menu_item_name as string) ?? null,
    platforms,
    scheduledAt: row.scheduled_at as string,
    status: row.status as SocialPostStatus,
    publishedAt: (row.published_at as string) ?? null,
    externalIds,
    errorMessage: (row.error_message as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function createSocialPost(data: {
  title?: string;
  body: string;
  mediaId?: number;
  mediaUrl?: string;
  menuItemId?: string;
  menuItemName?: string;
  platforms: string[];
  scheduledAt: string;
  status: "draft" | "scheduled";
}): Promise<{ id: number }> {
  const db = getTurso();
  const result = await db.execute({
    sql: `INSERT INTO social_posts
            (title, body, media_id, media_url, menu_item_id, menu_item_name, platforms, scheduled_at, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.title ?? null,
      data.body,
      data.mediaId ?? null,
      data.mediaUrl ?? null,
      data.menuItemId ?? null,
      data.menuItemName ?? null,
      JSON.stringify(data.platforms),
      data.scheduledAt,
      data.status,
    ],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function updateSocialPost(
  id: number,
  data: Partial<{
    title: string | null;
    body: string;
    mediaId: number | null;
    mediaUrl: string | null;
    menuItemId: string | null;
    menuItemName: string | null;
    platforms: string[];
    scheduledAt: string;
    status: SocialPostStatus;
  }>
): Promise<boolean> {
  const db = getTurso();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  const mapping: Record<string, unknown> = {
    title: data.title,
    body: data.body,
    media_id: data.mediaId,
    media_url: data.mediaUrl,
    menu_item_id: data.menuItemId,
    menu_item_name: data.menuItemName,
    platforms: data.platforms ? JSON.stringify(data.platforms) : undefined,
    scheduled_at: data.scheduledAt,
    status: data.status,
  };

  for (const [column, value] of Object.entries(mapping)) {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      args.push(value as string | number | null);
    }
  }
  if (sets.length === 0) return false;

  sets.push("updated_at = datetime('now')");
  args.push(id);

  const result = await db.execute({
    sql: `UPDATE social_posts SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
  return result.rowsAffected > 0;
}

export async function deleteSocialPost(id: number): Promise<boolean> {
  const db = getTurso();
  const result = await db.execute({
    sql: "DELETE FROM social_posts WHERE id = ?",
    args: [id],
  });
  return result.rowsAffected > 0;
}

export async function getSocialPost(id: number): Promise<SocialPost | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM social_posts WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToPost(result.rows[0] as unknown as Record<string, unknown>);
}

export async function getDuePosts(nowIso: string, limit = 10): Promise<SocialPost[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT * FROM social_posts
          WHERE status = 'scheduled' AND scheduled_at <= ?
          ORDER BY scheduled_at ASC LIMIT ?`,
    args: [nowIso, limit],
  });
  return result.rows.map((row) =>
    rowToPost(row as unknown as Record<string, unknown>)
  );
}

export async function getPostsForRange(
  fromIso: string,
  toIso: string
): Promise<SocialPost[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT * FROM social_posts
          WHERE scheduled_at >= ? AND scheduled_at <= ?
          ORDER BY scheduled_at ASC`,
    args: [fromIso, toIso],
  });
  return result.rows.map((row) =>
    rowToPost(row as unknown as Record<string, unknown>)
  );
}

export async function listSocialPosts(limit = 100): Promise<SocialPost[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT * FROM social_posts ORDER BY scheduled_at DESC LIMIT ?",
    args: [limit],
  });
  return result.rows.map((row) =>
    rowToPost(row as unknown as Record<string, unknown>)
  );
}

export async function recordPublishResult(
  id: number,
  outcome:
    | { status: "published"; externalIds: Record<string, string> }
    | { status: "ready" }
    | { status: "failed"; error: string }
): Promise<void> {
  const db = getTurso();
  if (outcome.status === "published") {
    await db.execute({
      sql: `UPDATE social_posts
            SET status = 'published', published_at = datetime('now'),
                external_ids = ?, error_message = NULL, updated_at = datetime('now')
            WHERE id = ?`,
      args: [JSON.stringify(outcome.externalIds), id],
    });
  } else if (outcome.status === "ready") {
    await db.execute({
      sql: `UPDATE social_posts SET status = 'ready', updated_at = datetime('now') WHERE id = ?`,
      args: [id],
    });
  } else {
    await db.execute({
      sql: `UPDATE social_posts
            SET status = 'failed', error_message = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [outcome.error.slice(0, 500), id],
    });
  }
}
