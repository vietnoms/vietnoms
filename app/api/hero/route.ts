import { NextResponse } from "next/server";
import { listMedia, type MediaRow } from "@/lib/db/media";

export const revalidate = 300; // Cache for 5 minutes

const MOBILE_MEDIA = "(max-width: 768px)";

interface VideoSource {
  src: string;
  type: string;
  media?: string;
}

function buildVideoSources(row: MediaRow): VideoSource[] {
  const sources: VideoSource[] = [];

  // Mobile variants first — browser matches the first <source> whose media
  // query and type are both playable. Phones hit these before desktop variants.
  if (row.blobUrlMobile) {
    sources.push({ src: row.blobUrlMobile, type: "video/mp4", media: MOBILE_MEDIA });
  }

  // Desktop, best codec first
  if (row.blobUrlAv1) {
    sources.push({ src: row.blobUrlAv1, type: 'video/webm; codecs="av01.0.05M.08"' });
  }
  if (row.blobUrlWebm) {
    sources.push({ src: row.blobUrlWebm, type: 'video/webm; codecs="vp09.00.50.08"' });
  }
  // Canonical H.264 MP4 — always last, always present (required column).
  sources.push({ src: row.blobUrl, type: "video/mp4" });

  return sources;
}

export async function GET() {
  try {
    // Only return visible hero slides for public consumption
    const slides = await listMedia({ category: "hero", galleryOnly: true });
    // Sort by gallery_order ascending
    slides.sort((a, b) => a.galleryOrder - b.galleryOrder);
    return NextResponse.json({
      slides: slides.map((s) => {
        const isVideo = /\.(mp4|webm|mov)$/i.test(s.filename);
        return {
          id: s.id,
          filename: s.filename,
          type: isVideo ? "video" : "image",
          alt: s.altText || "",
          order: s.galleryOrder,
          url: s.blobUrl, // kept for image slides + back-compat
          poster: s.posterUrl || null,
          sources: isVideo ? buildVideoSources(s) : [],
        };
      }),
    });
  } catch (error) {
    console.error("Failed to fetch hero slides:", error);
    return NextResponse.json({ slides: [] });
  }
}
