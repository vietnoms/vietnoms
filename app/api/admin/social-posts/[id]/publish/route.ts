import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { publishNow } from "@/lib/social/publish";

// "Publish now" — the primary path when crons run infrequently
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const outcome = await publishNow(Number(params.id));
  if (outcome.status === "not_found") {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(outcome);
}
