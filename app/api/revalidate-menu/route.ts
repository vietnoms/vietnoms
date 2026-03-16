import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Daily cron endpoint to revalidate the menu cache.
 * Protects against stale data if Square webhooks are missed.
 * Called by Vercel Cron (vercel.json) daily at 6 AM UTC.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("menu");
  return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() });
}
