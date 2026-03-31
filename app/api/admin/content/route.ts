import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAllContent, setMultipleContent } from "@/lib/db/site-content";
import { revalidateTag } from "next/cache";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const content = await getAllContent();
  return NextResponse.json({ content });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { content } = await request.json();
  await setMultipleContent(content);
  revalidateTag("site-content");
  return NextResponse.json({ success: true });
}
