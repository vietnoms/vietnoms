import { NextRequest, NextResponse } from "next/server";
import { runTick } from "@/lib/cron/tick-tasks";

/**
 * Consolidated daily cron (vercel.json): menu revalidation, due review
 * requests, due social posts, and housekeeping in one idempotent pass.
 * Can also be hit by an external pinger for more frequent runs — see
 * OWNER-GUIDE.md.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runTick({ revalidateMenu: true });
  return NextResponse.json({
    ...result,
    timestamp: new Date().toISOString(),
  });
}
