import { getTurso } from "@/lib/turso";

export async function toggleLike(
  squareItemId: string,
  squareCustomerId: string
): Promise<{ liked: boolean; likeCount: number }> {
  const db = getTurso();

  // Check if like exists
  const existing = await db.execute({
    sql: "SELECT id FROM item_likes WHERE square_item_id = ? AND square_customer_id = ?",
    args: [squareItemId, squareCustomerId],
  });

  if (existing.rows.length > 0) {
    // Unlike
    await db.execute({
      sql: "DELETE FROM item_likes WHERE square_item_id = ? AND square_customer_id = ?",
      args: [squareItemId, squareCustomerId],
    });
  } else {
    // Like
    await db.execute({
      sql: "INSERT INTO item_likes (square_item_id, square_customer_id) VALUES (?, ?)",
      args: [squareItemId, squareCustomerId],
    });
  }

  // Get updated count
  const countResult = await db.execute({
    sql: "SELECT COUNT(*) as count FROM item_likes WHERE square_item_id = ?",
    args: [squareItemId],
  });

  return {
    liked: existing.rows.length === 0, // was not liked before, now it is
    likeCount: Number(countResult.rows[0].count),
  };
}

export async function hasLiked(
  squareItemId: string,
  squareCustomerId: string
): Promise<boolean> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT 1 FROM item_likes WHERE square_item_id = ? AND square_customer_id = ? LIMIT 1",
    args: [squareItemId, squareCustomerId],
  });
  return result.rows.length > 0;
}

export async function getLikeCount(squareItemId: string): Promise<number> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT COUNT(*) as count FROM item_likes WHERE square_item_id = ?",
    args: [squareItemId],
  });
  return Number(result.rows[0].count);
}

export async function getCustomerLikes(squareCustomerId: string): Promise<string[]> {
  const db = getTurso();
  const result = await db.execute({
    sql: "SELECT square_item_id FROM item_likes WHERE square_customer_id = ?",
    args: [squareCustomerId],
  });
  return result.rows.map((row) => row.square_item_id as string);
}
