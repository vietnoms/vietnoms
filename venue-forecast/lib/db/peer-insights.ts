import { getTurso } from "@/lib/turso";

export interface PeerSalesPoint {
  tenantId: number;
  date: string;
  dayOfWeek: number;
  revenue: number;
  eventVenueId: number | null;
}

/**
 * Fetch sales history from all peer tenants that subscribe to a given venue,
 * tagged with whether each day had an event at that venue.
 *
 * Excludes the current tenant so callers can compute uplift relative to their
 * own baseline independently.
 */
export async function getPeerSalesForVenue(
  venueId: number,
  currentTenantId: number,
  lookbackDays = 180
): Promise<PeerSalesPoint[]> {
  const db = getTurso();
  const fromDate = new Date(Date.now() - lookbackDays * 86400000)
    .toISOString()
    .split("T")[0];

  const result = await db.execute({
    sql: `SELECT ds.tenant_id,
                 ds.date,
                 ds.revenue,
                 MAX(CASE WHEN ce.id IS NOT NULL THEN ce.venue_id END) AS event_venue_id
          FROM daily_sales ds
          INNER JOIN tenant_venues tv
            ON tv.tenant_id = ds.tenant_id AND tv.venue_id = ?
          LEFT JOIN convention_events ce
            ON ce.venue_id = ?
           AND ds.date BETWEEN ce.start_date AND ce.end_date
          WHERE ds.tenant_id != ?
            AND ds.date >= ?
          GROUP BY ds.tenant_id, ds.date, ds.revenue
          ORDER BY ds.tenant_id ASC, ds.date ASC`,
    args: [venueId, venueId, currentTenantId, fromDate],
  });

  return result.rows.map((row) => {
    const date = row.date as string;
    return {
      tenantId: Number(row.tenant_id),
      date,
      dayOfWeek: new Date(date + "T00:00:00").getDay(),
      revenue: Number(row.revenue),
      eventVenueId: row.event_venue_id ? Number(row.event_venue_id) : null,
    };
  });
}
