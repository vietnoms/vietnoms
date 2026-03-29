import { NextResponse } from "next/server";
import { listMedia } from "@/lib/db/media";

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const slides = await listMedia({ category: "hero", galleryOnly: true });
    // Sort by gallery_order ascending
    slides.sort((a, b) => a.galleryOrder - b.galleryOrder);
    return NextResponse.json({
      slides: slides.map((s) => ({
        id: s.id,
        url: s.blobUrl,
        filename: s.filename,
        type: /\.(mp4|webm|mov)$/i.test(s.filename) ? "video" : "image",
        alt: s.altText || "",
        order: s.galleryOrder,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch hero slides:", error);
    return NextResponse.json({ slides: [] });
  }
}
