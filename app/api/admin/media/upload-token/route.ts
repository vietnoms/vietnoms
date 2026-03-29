import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg", "image/png", "image/webp", "image/gif",
          "video/mp4", "video/webm", "video/quicktime",
        ],
        maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Upload token error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
