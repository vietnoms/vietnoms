import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getReviewsByStatus, updateReviewStatus } from "@/lib/db/reviews";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status") || "pending";
  const reviews = await getReviewsByStatus(status);
  return NextResponse.json({ reviews });
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status } = await request.json();
  if (!id || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json(
      { error: "id and a valid status are required" },
      { status: 400 }
    );
  }

  const changed = await updateReviewStatus(Number(id), status);
  return NextResponse.json({ success: changed });
}
