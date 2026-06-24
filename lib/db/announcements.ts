import { unstable_cache } from "next/cache";
import { getTurso } from "@/lib/turso";
import { isWindowActive } from "@/lib/marketing/scheduling";

export type AnnouncementType = "announcement" | "special";

export interface Announcement {
  id: number;
  type: AnnouncementType;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  priority: number;
  createdAt: string;
}

function rowToAnnouncement(row: Record<string, unknown>): Announcement {
  return {
    id: Number(row.id),
    type: row.type as AnnouncementType,
    title: row.title as string,
    body: (row.body as string) ?? null,
    imageUrl: (row.image_url as string) ?? null,
    ctaLabel: (row.cta_label as string) ?? null,
    ctaHref: (row.cta_href as string) ?? null,
    startsAt: (row.starts_at as string) ?? null,
    endsAt: (row.ends_at as string) ?? null,
    active: Number(row.active) === 1,
    priority: Number(row.priority) || 0,
    createdAt: row.created_at as string,
  };
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const db = getTurso();
  const result = await db.execute(
    "SELECT * FROM announcements ORDER BY priority DESC, created_at DESC"
  );
  return result.rows.map((row) =>
    rowToAnnouncement(row as unknown as Record<string, unknown>)
  );
}

export async function createAnnouncement(data: {
  type: AnnouncementType;
  title: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  startsAt?: string;
  endsAt?: string;
  active?: boolean;
  priority?: number;
}): Promise<{ id: number }> {
  const db = getTurso();
  const result = await db.execute({
    sql: `INSERT INTO announcements
            (type, title, body, image_url, cta_label, cta_href, starts_at, ends_at, active, priority)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.type,
      data.title,
      data.body ?? null,
      data.imageUrl ?? null,
      data.ctaLabel ?? null,
      data.ctaHref ?? null,
      data.startsAt ?? null,
      data.endsAt ?? null,
      data.active === false ? 0 : 1,
      data.priority ?? 0,
    ],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function updateAnnouncement(
  id: number,
  data: Partial<{
    type: AnnouncementType;
    title: string;
    body: string | null;
    imageUrl: string | null;
    ctaLabel: string | null;
    ctaHref: string | null;
    startsAt: string | null;
    endsAt: string | null;
    active: boolean;
    priority: number;
  }>
): Promise<boolean> {
  const db = getTurso();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  const mapping: Record<string, unknown> = {
    type: data.type,
    title: data.title,
    body: data.body,
    image_url: data.imageUrl,
    cta_label: data.ctaLabel,
    cta_href: data.ctaHref,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    active: data.active === undefined ? undefined : data.active ? 1 : 0,
    priority: data.priority,
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
    sql: `UPDATE announcements SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
  return result.rowsAffected > 0;
}

export async function deleteAnnouncement(id: number): Promise<boolean> {
  const db = getTurso();
  const result = await db.execute({
    sql: "DELETE FROM announcements WHERE id = ?",
    args: [id],
  });
  return result.rowsAffected > 0;
}

/**
 * Cached public reads. Visibility is computed from the schedule window at
 * request time — "automated posting" to the site needs no cron.
 */
const getCachedAnnouncements = unstable_cache(
  async (): Promise<Announcement[]> => {
    try {
      return await listAnnouncements();
    } catch (error) {
      console.error("Failed to load announcements:", error);
      return [];
    }
  },
  ["announcements"],
  { tags: ["announcements"], revalidate: 300 }
);

export async function getActiveAnnouncements(
  type: AnnouncementType,
  now: Date = new Date()
): Promise<Announcement[]> {
  const all = await getCachedAnnouncements();
  return all.filter(
    (entry) =>
      entry.type === type &&
      isWindowActive(
        { startsAt: entry.startsAt, endsAt: entry.endsAt, active: entry.active },
        now
      )
  );
}

/** Active specials plus future-scheduled ones, for the /specials page. */
export async function getActiveAndUpcomingSpecials(
  now: Date = new Date()
): Promise<{ active: Announcement[]; upcoming: Announcement[] }> {
  const all = await getCachedAnnouncements();
  const specials = all.filter((entry) => entry.type === "special" && entry.active);

  const active = specials.filter((entry) =>
    isWindowActive(
      { startsAt: entry.startsAt, endsAt: entry.endsAt, active: true },
      now
    )
  );
  const upcoming = specials.filter(
    (entry) =>
      entry.startsAt &&
      !Number.isNaN(Date.parse(entry.startsAt)) &&
      Date.parse(entry.startsAt) > now.getTime()
  );

  return { active, upcoming };
}
