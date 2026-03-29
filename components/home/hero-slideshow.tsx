"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Slide {
  id: number;
  url: string;
  type: "video" | "image";
  alt: string;
}

const TRANSITION_INTERVAL = 6000; // 6 seconds for images
const FADE_DURATION = 1000; // 1 second crossfade

export function HeroSlideshow() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch hero slides
  useEffect(() => {
    fetch("/api/hero")
      .then((r) => r.json())
      .then((data) => {
        if (data.slides?.length > 0) setSlides(data.slides);
      })
      .catch(() => {});
  }, []);

  const advanceSlide = useCallback(() => {
    if (slides.length <= 1) return;
    const next = (currentIndex + 1) % slides.length;
    setNextIndex(next);
    setFading(true);
    setTimeout(() => {
      setCurrentIndex(next);
      setNextIndex(null);
      setFading(false);
    }, FADE_DURATION);
  }, [currentIndex, slides.length]);

  // Auto-advance timer
  useEffect(() => {
    if (slides.length <= 1) return;
    const current = slides[currentIndex];
    if (!current) return;

    // For videos, wait until the video ends
    if (current.type === "video" && videoRef.current) {
      const vid = videoRef.current;
      const onEnded = () => advanceSlide();
      vid.addEventListener("ended", onEnded);
      return () => vid.removeEventListener("ended", onEnded);
    }

    // For images, advance after interval
    timerRef.current = setTimeout(advanceSlide, TRANSITION_INTERVAL);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIndex, slides, advanceSlide]);

  // Fallback: static hero image
  if (slides.length === 0) {
    return (
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero.jpg')" }}
      />
    );
  }

  const current = slides[currentIndex];
  const next = nextIndex !== null ? slides[nextIndex] : null;

  return (
    <div className="absolute inset-0">
      {/* Current slide */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          opacity: fading ? 0 : 1,
          transitionDuration: `${FADE_DURATION}ms`,
        }}
      >
        {current.type === "video" ? (
          <video
            ref={videoRef}
            key={current.id}
            src={current.url}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={current.url}
            alt={current.alt}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Next slide (fades in on top) */}
      {next && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{
            opacity: fading ? 1 : 0,
            transitionDuration: `${FADE_DURATION}ms`,
          }}
        >
          {next.type === "video" ? (
            <video
              key={next.id}
              src={next.url}
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={next.url}
              alt={next.alt}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i !== currentIndex && !fading) {
                  setNextIndex(i);
                  setFading(true);
                  setTimeout(() => {
                    setCurrentIndex(i);
                    setNextIndex(null);
                    setFading(false);
                  }, FADE_DURATION);
                }
              }}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex
                  ? "w-6 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
