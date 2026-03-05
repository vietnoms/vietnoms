"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { GoogleReview } from "@/lib/google-reviews";

interface ReviewsSectionProps {
  reviews: GoogleReview[];
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const [current, setCurrent] = useState(0);

  if (reviews.length === 0) return null;

  const prev = () => setCurrent((c) => (c === 0 ? reviews.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === reviews.length - 1 ? 0 : c + 1));

  return (
    <section className="py-16 md:py-24 bg-surface-alt/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-yellow text-glow-yellow">
            What Our Guests Say
          </h2>
          <div className="mt-2 mx-auto h-1 w-16 bg-brand-red rounded-full shadow-sm shadow-red-500/50" />
        </div>

        <div className="mt-12 relative max-w-2xl mx-auto">
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0 text-center">
              <div className="flex justify-center gap-1 mb-4">
                {Array.from({ length: reviews[current].rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-brand-yellow text-brand-yellow"
                  />
                ))}
              </div>
              <blockquote className="text-lg md:text-xl text-gray-300 italic leading-relaxed">
                &ldquo;{reviews[current].text}&rdquo;
              </blockquote>
              <p className="mt-4 font-semibold text-white">
                {reviews[current].authorName}
              </p>
              {reviews[current].relativeTimeDescription && (
                <p className="mt-1 text-sm text-gray-500">
                  {reviews[current].relativeTimeDescription}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="p-2 rounded-full border border-gray-600 hover:bg-white/10 transition-colors"
              aria-label="Previous review"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === current
                      ? "w-6 bg-brand-red"
                      : "w-2 bg-gray-600 hover:bg-gray-500"
                  }`}
                  aria-label={`Go to review ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="p-2 rounded-full border border-gray-600 hover:bg-white/10 transition-colors"
              aria-label="Next review"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Google attribution */}
          <div className="mt-8 flex items-center justify-center gap-2 text-gray-500 text-sm">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Reviews from Google</span>
          </div>
        </div>
      </div>
    </section>
  );
}
