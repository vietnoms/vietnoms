import { NextResponse } from "next/server";
import { listMedia, type MediaRow } from "@/lib/db/media";

export const revalidate = 300;

const MOBILE_MEDIA = "(max-width: 768px)";

interface VideoSource {
  src: string;
  type: string;
  media?: string;
}

function buildVideoSources(row: MediaRow): VideoSource[] {
  const sources: VideoSource[] = [];

  if (row.blobUrlMobile) {
    sources.push({ src: row.blobUrlMobile, type: "video/mp4", media: MOBILE_MEDIA });
  }

  if (row.blobUrlAv1) {
    sources.push({ src: row.blobUrlAv1, type: 'video/webm; codecs="av01.0.05M.08"' });
  }
  if (row.blobUrlWebm) {
    sources.push({ src: row.blobUrlWebm, type: 'video/webm; codecs="vp09.00.50.08"' });
  }
  sources.push({ src: row.blobUrl, type: "video/mp4" });

  return sources;
}

export async function GET() {
  try {
    const slides = await listMedia({ category: "catering-hero", galleryOnly: true });
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
          url: s.blobUrl,
          poster: s.posterUrl || null,
          sources: isVideo ? buildVideoSources(s) : [],
        };
      }),
    });
  } catch (error) {
    console.error("Failed to fetch catering hero slides:", error);
    return NextResponse.json({ slides: [] });
  }
}
