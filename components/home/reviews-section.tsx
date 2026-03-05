"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const REVIEWS = [
  {
    name: "Sarah M.",
    rating: 5,
    text: "The bun bowls here are incredible — fresh herbs, perfectly grilled chicken, and that house sauce is addictive. We come here every week.",
  },
  {
    name: "David L.",
    rating: 5,
    text: "Their banh mi is absolutely perfect — crispy bread, tender pork, and the pickled veggies are on point. Highly recommend!",
  },
  {
    name: "Jessica T.",
    rating: 5,
    text: "The nuoc mam wings are the best wings in San Jose, hands down. And the Big Classic bun bowl is massive. This place is a gem.",
  },
  {
    name: "Mike R.",
    rating: 5,
    text: "We used Vietnoms for our office catering and everyone loved it. The bun bowl bar was a huge hit. Will definitely order again!",
  },
];

export function ReviewsSection() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? REVIEWS.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === REVIEWS.length - 1 ? 0 : c + 1));

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
                {Array.from({ length: REVIEWS[current].rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-brand-yellow text-brand-yellow"
                  />
                ))}
              </div>
              <blockquote className="text-lg md:text-xl text-gray-300 italic leading-relaxed">
                &ldquo;{REVIEWS[current].text}&rdquo;
              </blockquote>
              <p className="mt-4 font-semibold text-white">
                {REVIEWS[current].name}
              </p>
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
              {REVIEWS.map((_, i) => (
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
        </div>
      </div>
    </section>
  );
}
