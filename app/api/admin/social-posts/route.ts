import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  listSocialPosts,
  getPostsForRange,
  createSocialPost,
} from "@/lib/db/social-posts";
import { isMetaConfigured, isInstagramConfigured } from "@/lib/social/meta";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const posts =
    from && to ? await getPostsForRange(from, to) : await listSocialPosts();

  return NextResponse.json({
    posts,
    meta: {
      facebookConfigured: isMetaConfigured(),
      instagramConfigured: isInstagramConfigured(),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Caption is required" }, { status: 400 });
  }
  if (!body.scheduledAt) {
    return NextResponse.json(
      { error: "A scheduled time is required" },
      { status: 400 }
    );
  }
  const platforms: string[] = Array.isArray(body.platforms)
    ? body.platforms.filter((p: string) => ["facebook", "instagram"].includes(p))
    : [];
  if (platforms.length === 0) {
    return NextResponse.json(
      { error: "Select at least one platform" },
      { status: 400 }
    );
  }
  if (platforms.includes("instagram") && !body.mediaUrl) {
    return NextResponse.json(
      { error: "Instagram posts require an image" },
      { status: 400 }
    );
  }

  const { id } = await createSocialPost({
    title: body.title?.trim() || undefined,
    body: body.body.trim().slice(0, 2200),
    mediaId: body.mediaId || undefined,
    mediaUrl: body.mediaUrl || undefined,
    menuItemId: body.menuItemId || undefined,
    menuItemName: body.menuItemName || undefined,
    platforms,
    scheduledAt: body.scheduledAt,
    status: body.status === "draft" ? "draft" : "scheduled",
  });

  return NextResponse.json({ success: true, id });
}
