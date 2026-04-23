"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Pause, Play } from "lucide-react";

interface VideoSource {
  src: string;
  type: string;
  media?: string;
}

interface Slide {
  id: number;
  url: string;
  type: "video" | "image";
  alt: string;
  poster?: string | null;
  sources?: VideoSource[];
}

const IMAGE_INTERVAL = 6000;
const FADE_DURATION = 1000;

export function HeroSlideshow() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch slides
  useEffect(() => {
    fetch("/api/hero")
      .then((r) => r.json())
      .then((data) => {
        if (data.slides?.length > 0) setSlides(data.slides);
      })
      .catch(() => {});
  }, []);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const advance = useCallback(() => {
    if (slides.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  // Handle auto-advance
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const current = slides[activeIndex];
    if (!current) return;

    if (current.type === "video") {
      const vid = videoRefs.current.get(current.id);
      if (vid) {
        // Reset and play the active video
        vid.currentTime = 0;
        vid.play().catch(() => {});
        const onEnded = () => advance();
        vid.addEventListener("ended", onEnded);
        return () => vid.removeEventListener("ended", onEnded);
      }
      // Fallback if ref not ready yet — advance after 10s
      timerRef.current = setTimeout(advance, 10000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }

    // Image: advance after interval
    timerRef.current = setTimeout(advance, IMAGE_INTERVAL);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeIndex, slides, paused, advance]);

  // Pause/play active video when paused state changes
  useEffect(() => {
    const current = slides[activeIndex];
    if (!current || current.type !== "video") return;
    const vid = videoRefs.current.get(current.id);
    if (!vid) return;
    if (paused) { vid.pause(); }
    else { vid.play().catch(() => {}); }
  }, [paused, activeIndex, slides]);

  // Try to autoplay on mobile by calling play() after mount
  useEffect(() => {
    const current = slides[activeIndex];
    if (!current || current.type !== "video" || paused) return;
    // Small delay for ref to attach
    const t = setTimeout(() => {
      const vid = videoRefs.current.get(current.id);
      if (vid) vid.play().catch(() => {});
    }, 100);
    return () => clearTimeout(t);
  }, [activeIndex, slides, paused]);

  if (slides.length === 0) {
    return (
      <div className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero.jpg')" }} />
    );
  }

  return (
    <div className="absolute inset-0 z-[1]">
      {/* Render ALL slides stacked, control visibility with opacity */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{
            opacity: i === activeIndex ? 1 : 0,
            transitionDuration: `${FADE_DURATION}ms`,
          }}
        >
          {slide.type === "video" ? (
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(slide.id, el);
              }}
              muted
              playsInline
              preload={i === 0 ? "auto" : "metadata"}
              poster={slide.poster || undefined}
              className="h-full w-full object-cover"
            >
              {(slide.sources && slide.sources.length > 0
                ? slide.sources
                : [{ src: slide.url, type: "video/mp4" }]
              ).map((s, idx) => (
                <source key={idx} src={s.src} type={s.type} media={s.media} />
              ))}
            </video>
          ) : (
            <img
              src={slide.url}
              alt={slide.alt}
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          )}
        </div>
      ))}

      {/* Bottom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-[4]">
        {/* Pause/Play toggle */}
        <button
          onClick={() => setPaused((p) => !p)}
          className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors"
          aria-label={paused ? "Play slideshow" : "Pause slideshow"}
        >
          {paused ? <Play className="h-3.5 w-3.5 ml-0.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>

        {/* Slide indicators */}
        {slides.length > 1 && (
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === activeIndex
                    ? "w-6 bg-white"
                    : "w-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
