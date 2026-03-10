import { NextResponse } from "next/server";
import crypto from "crypto";
import { put } from "@vercel/blob";
import { insertMedia } from "@/lib/db/media";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function verifyApiKey(request: Request): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const key = process.env.MEDIA_INGEST_KEY;
  if (!key) return false;

  const provided = Buffer.from(header.slice(7));
  const expected = Buffer.from(key);
  if (provided.length !== expected.length) return false;

  return crypto.timingSafeEqual(provided, expected);
}

export async function POST(request: Request) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, filename, altText, category, tags } = body as {
      imageUrl?: string;
      filename?: string;
      altText?: string;
      category?: string;
      tags?: string;
    };

    if (!imageUrl || !filename) {
      return NextResponse.json(
        { error: "imageUrl and filename are required" },
        { status: 400 }
      );
    }

    // Fetch the image from the provided URL
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${imageRes.status}` },
        { status: 400 }
      );
    }

    const contentType = imageRes.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: `URL did not return an image (got ${contentType})` },
        { status: 400 }
      );
    }

    const imageBuffer = await imageRes.arrayBuffer();
    if (imageBuffer.byteLength > MAX_SIZE) {
      return NextResponse.json(
        { error: "Image exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Store in Vercel Blob
    const blob = await put(
      `media/generated/${Date.now()}-${filename}`,
      Buffer.from(imageBuffer),
      { access: "public", contentType }
    );

    // Insert metadata into Turso
    const { id } = await insertMedia({
      blobUrl: blob.url,
      filename,
      altText: altText || "",
      category: category || "marketing",
      tags,
      source: "generated",
      sizeBytes: imageBuffer.byteLength,
    });

    return NextResponse.json({ id, blobUrl: blob.url });
  } catch (error) {
    console.error("Media ingest error:", error);
    return NextResponse.json(
      { error: "Failed to ingest media" },
      { status: 500 }
    );
  }
}
