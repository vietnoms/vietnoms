import { getTurso } from "@/lib/turso";

export interface ReviewRow {
  id: number;
  squareItemId: string;
  squareCustomerId: string;
  rating: number;
  reviewText: string | null;
  status: string;
  createdAt: string;
  givenName: string | null;
  familyName: string | null;
}

export async function getItemReviews(
  itemId: string,
  limit = 10,
  offset = 0
): Promise<ReviewRow[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT r.id, r.square_item_id, r.square_customer_id, r.rating,
                 r.review_text, r.status, r.created_at,
                 c.given_name, c.family_name
          FROM item_reviews r
          LEFT JOIN customers c ON r.square_customer_id = c.id
          WHERE r.square_item_id = ? AND r.status = 'approved'
          ORDER BY r.created_at DESC
          LIMIT ? OFFSET ?`,
    args: [itemId, limit, offset],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    squareItemId: row.square_item_id as string,
    squareCustomerId: row.square_customer_id as string,
    rating: Number(row.rating),
    reviewText: row.review_text as string | null,
    status: row.status as string,
    createdAt: row.created_at as string,
    givenName: row.given_name as string | null,
    familyName: row.family_name as string | null,
  }));
}

export async function getItemStats(itemId: string) {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT
            COALESCE(AVG(r.rating), 0) as avg_rating,
            COUNT(r.id) as review_count,
            (SELECT COUNT(*) FROM item_likes WHERE square_item_id = ?) as like_count
          FROM item_reviews r
          WHERE r.square_item_id = ? AND r.status = 'approved'`,
    args: [itemId, itemId],
  });

  const row = result.rows[0];
  return {
    averageRating: Number(row.avg_rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    likeCount: Number(row.like_count) || 0,
  };
}

export async function getBulkItemStats(
  itemIds: string[]
): Promise<Map<string, { averageRating: number; reviewCount: number; likeCount: number }>> {
  const stats = new Map<string, { averageRating: number; reviewCount: number; likeCount: number }>();

  if (itemIds.length === 0) return stats;

  const db = getTurso();
  const placeholders = itemIds.map(() => "?").join(",");

  // Get review stats
  const reviewResult = await db.execute({
    sql: `SELECT square_item_id,
                 COALESCE(AVG(rating), 0) as avg_rating,
                 COUNT(*) as review_count
          FROM item_reviews
          WHERE square_item_id IN (${placeholders}) AND status = 'approved'
          GROUP BY square_item_id`,
    args: itemIds,
  });

  // Get like counts
  const likeResult = await db.execute({
    sql: `SELECT square_item_id, COUNT(*) as like_count
          FROM item_likes
          WHERE square_item_id IN (${placeholders})
          GROUP BY square_item_id`,
    args: itemIds,
  });

  // Initialize all items with zeros
  for (const id of itemIds) {
    stats.set(id, { averageRating: 0, reviewCount: 0, likeCount: 0 });
  }

  // Fill in review stats
  for (const row of reviewResult.rows) {
    const id = row.square_item_id as string;
    const existing = stats.get(id)!;
    existing.averageRating = Math.round(Number(row.avg_rating) * 10) / 10;
    existing.reviewCount = Number(row.review_count);
  }

  // Fill in like counts
  for (const row of likeResult.rows) {
    const id = row.square_item_id as string;
    const existing = stats.get(id)!;
    existing.likeCount = Number(row.like_count);
  }

  return stats;
}

export async function createReview(data: {
  squareItemId: string;
  squareCustomerId: string;
  rating: number;
  reviewText?: string;
}) {
  const db = getTurso();
  const result = await db.execute({
    sql: `INSERT INTO item_reviews (square_item_id, square_customer_id, rating, review_text)
          VALUES (?, ?, ?, ?)`,
    args: [data.squareItemId, data.squareCustomerId, data.rating, data.reviewText ?? null],
  });
  return { id: Number(result.lastInsertRowid) };
}

export async function hasReviewed(squareItemId: string, squareCustomerId: string): Promise<boolean> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT 1 FROM item_reviews
          WHERE square_item_id = ? AND square_customer_id = ?
          LIMIT 1`,
    args: [squareItemId, squareCustomerId],
  });
  return result.rows.length > 0;
}
