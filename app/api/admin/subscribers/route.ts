import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  listSubscribers,
  getSubscriberStats,
  unsubscribeByToken,
} from "@/lib/db/subscribers";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const [list, stats] = await Promise.all([
    listSubscribers({
      status: params.get("status") || undefined,
      source: params.get("source") || undefined,
      search: params.get("search") || undefined,
      limit: Number(params.get("limit")) || 50,
      offset: Number(params.get("offset")) || 0,
    }),
    getSubscriberStats(),
  ]);

  return NextResponse.json({ ...list, stats });
}

// Admin-initiated unsubscribe (e.g. verbal request from a customer)
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const changed = await unsubscribeByToken(token);
  return NextResponse.json({ success: changed });
}
