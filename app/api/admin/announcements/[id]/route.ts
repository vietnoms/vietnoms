import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/db/announcements";

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
  const changed = await updateAnnouncement(Number(params.id), body);
  revalidateTag("announcements");
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

  const changed = await deleteAnnouncement(Number(params.id));
  revalidateTag("announcements");
  return NextResponse.json({ success: changed });
}
