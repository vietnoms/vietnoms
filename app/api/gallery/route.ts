import { NextResponse } from "next/server";
import { listMedia } from "@/lib/db/media";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;

    const media = await listMedia({ category, limit: 100 });
    const items = media.map((m) => ({
      id: m.id,
      src: m.blobUrl,
      alt: m.altText,
      category: m.category,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Gallery fetch error:", error);
    return NextResponse.json({ error: "Failed to load gallery" }, { status: 500 });
  }
}
