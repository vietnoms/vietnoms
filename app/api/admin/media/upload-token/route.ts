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
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Upload token error:", msg);
    const hasToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    return NextResponse.json(
      {
        error: `Upload token generation failed: ${msg}${hasToken ? "" : " (BLOB_READ_WRITE_TOKEN env var is missing)"}`,
      },
      { status: 500 }
    );
  }
}
