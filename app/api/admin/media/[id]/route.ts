import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { requireAdmin } from "@/lib/admin";
import { updateMedia, deleteMediaById } from "@/lib/db/media";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const mediaId = Number(id);
    if (isNaN(mediaId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    await updateMedia(mediaId, {
      altText: body.altText,
      category: body.category,
      tags: body.tags,
      galleryVisible: body.galleryVisible,
      galleryOrder: body.galleryOrder,
      caption: body.caption,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    console.error("Update media error:", error);
    return NextResponse.json({ error: "Failed to update media" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const mediaId = Number(id);
    if (isNaN(mediaId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await deleteMediaById(mediaId);
    if (!deleted) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    await del(deleted.blobUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    console.error("Delete media error:", error);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
