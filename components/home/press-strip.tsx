"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";

export interface PressMention {
  outlet: string;
  quote: string;
  url?: string;
}

interface PressStripProps {
  mentions: PressMention[];
  googleRating: number | null;
  googleReviewCount: number | null;
}

/**
 * Social proof band: real press mentions when the owner has added them,
 * otherwise the live Google rating. Renders nothing if neither exists.
 */
export function PressStrip({
  mentions,
  googleRating,
  googleReviewCount,
}: PressStripProps) {
  const stripRef = useRef<HTMLElement>(null);
  const isInView = useInView(stripRef, { once: true, margin: "-50px" });

  const hasMentions = mentions.length > 0;
  const hasRating = googleRating != null && googleReviewCount != null;
  if (!hasMentions && !hasRating) return null;

  return (
    <section
      ref={stripRef}
      className="relative py-12 bg-[#0a0a0a] border-y border-white/5"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {hasMentions ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {mentions.slice(0, 3).map((mention) => (
                <figure key={mention.outlet} className="text-center md:text-left">
                  <Quote className="h-5 w-5 text-brand-yellow/60 mx-auto md:mx-0" />
                  <blockquote className="mt-3 text-gray-300 text-sm leading-relaxed">
                    &ldquo;{mention.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-3 font-display text-brand-yellow tracking-wider text-sm">
                    {mention.url ? (
                      <a
                        href={mention.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        — {mention.outlet}
                      </a>
                    ) : (
                      <>— {mention.outlet}</>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={`h-6 w-6 ${
                      value <= Math.round(googleRating!)
                        ? "fill-brand-yellow text-brand-yellow"
                        : "text-gray-700"
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-300">
                <span className="font-bold text-white text-lg">
                  {googleRating!.toFixed(1)}
                </span>{" "}
                on Google from{" "}
                <span className="font-semibold text-white">
                  {googleReviewCount}
                </span>{" "}
                reviews
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
