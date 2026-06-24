import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  listRequests,
  getRequestStats,
  listPrivateFeedback,
  markFeedbackRead,
} from "@/lib/db/review-requests";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [requests, stats, feedback] = await Promise.all([
    listRequests(),
    getRequestStats(),
    listPrivateFeedback(),
  ]);

  return NextResponse.json({ requests, stats, feedback });
}

// Mark a private feedback entry as read
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { feedbackId } = await request.json();
  if (!feedbackId) {
    return NextResponse.json({ error: "feedbackId is required" }, { status: 400 });
  }

  await markFeedbackRead(Number(feedbackId));
  return NextResponse.json({ success: true });
}
