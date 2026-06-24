import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { updateSocialPost, deleteSocialPost } from "@/lib/db/social-posts";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const changed = await updateSocialPost(Number(params.id), body);
  return NextResponse.json({ success: changed });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const changed = await deleteSocialPost(Number(params.id));
  return NextResponse.json({ success: changed });
}
