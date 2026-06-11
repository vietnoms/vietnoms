import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  listAnnouncements,
  createAnnouncement,
} from "@/lib/db/announcements";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const announcements = await listAnnouncements();
  return NextResponse.json({ announcements });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.title || !["announcement", "special"].includes(body.type)) {
    return NextResponse.json(
      { error: "title and a valid type are required" },
      { status: 400 }
    );
  }

  const { id } = await createAnnouncement(body);
  revalidateTag("announcements");
  return NextResponse.json({ success: true, id });
}
