import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listSubscribers, buildSubscriberCsv } from "@/lib/db/subscribers";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const { subscribers } = await listSubscribers({
    status: params.get("status") || "subscribed",
    source: params.get("source") || undefined,
    limit: 200,
    offset: 0,
  });

  // Page through everything beyond the first batch
  let offset = subscribers.length;
  let batch = subscribers;
  const all = [...subscribers];
  while (batch.length === 200) {
    const next = await listSubscribers({
      status: params.get("status") || "subscribed",
      source: params.get("source") || undefined,
      limit: 200,
      offset,
    });
    batch = next.subscribers;
    all.push(...batch);
    offset += batch.length;
  }

  const csv = buildSubscriberCsv(all);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vietnoms-subscribers-${date}.csv"`,
    },
  });
}
