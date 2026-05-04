"use client";

import { useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { AnimatedDivider } from "@/components/animations/scroll-animations";
import type { GoogleReview } from "@/lib/google-reviews";

interface ReviewsSectionProps {
  reviews: GoogleReview[];
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const prev = () => {
    setDirection(-1);
    setCurrent((c) => (c === 0 ? reviews.length - 1 : c - 1));
  };

  const next = () => {
    setDirection(1);
    setCurrent((c) => (c === reviews.length - 1 ? 0 : c + 1));
  };

  // Auto-advance reviews
  useEffect(() => {
    if (reviews.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((c) => (c === reviews.length - 1 ? 0 : c + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  if (reviews.length === 0) return null;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f] via-[#111111] to-[#0f0f0f]" />

      {/* Decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-yellow/3 rounded-full blur-3xl" />

      {/* Quote decorations */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isInView ? { opacity: 0.1, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="absolute top-20 left-10 lg:left-32 text-brand-yellow"
      >
        <Quote className="w-24 h-24 lg:w-32 lg:h-32" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isInView ? { opacity: 0.1, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="absolute bottom-20 right-10 lg:right-32 text-brand-yellow rotate-180"
      >
        <Quote className="w-24 h-24 lg:w-32 lg:h-32" />
      </motion.div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-brand-yellow/80 text-sm font-medium tracking-widest uppercase"
          >
            Testimonials
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          >
            What Our
            <span className="text-brand-yellow text-glow-yellow ml-3">Guests Say</span>
          </motion.h2>

          <div className="flex justify-center mt-6">
            <AnimatedDivider color="bg-gradient-to-r from-transparent via-brand-red to-transparent" />
          </div>
        </motion.div>

        {/* Reviews carousel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-16 relative max-w-3xl mx-auto"
        >
          <Card className="border-0 shadow-none bg-transparent overflow-hidden">
            <CardContent className="p-0 text-center min-h-[280px] flex flex-col justify-center">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  {/* Stars */}
                  <div className="flex justify-center gap-1 mb-6">
                    {Array.from({ length: reviews[current].rating }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                      >
                        <Star className="h-6 w-6 fill-brand-yellow text-brand-yellow" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-xl md:text-2xl text-gray-200 italic leading-relaxed font-light px-4">
                    &ldquo;{reviews[current].text}&rdquo;
                  </blockquote>

                  {/* Author */}
                  <div className="mt-8">
                    <p className="font-semibold text-white text-lg">
                      {reviews[current].authorName}
                    </p>
                    {reviews[current].relativeTimeDescription && (
                      <p className="mt-1 text-sm text-gray-500">
                        {reviews[current].relativeTimeDescription}
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-6 mt-10">
            <motion.button
              onClick={prev}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-full border border-gray-700 hover:border-brand-yellow/50 hover:bg-brand-yellow/10 transition-all duration-300"
              aria-label="Previous review"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </motion.button>

            <div className="flex items-center gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > current ? 1 : -1);
                    setCurrent(i);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-8 bg-brand-yellow"
                      : "w-2 bg-gray-600 hover:bg-gray-500"
                  }`}
                  aria-label={`Go to review ${i + 1}`}
                />
              ))}
            </div>

            <motion.button
              onClick={next}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-full border border-gray-700 hover:border-brand-yellow/50 hover:bg-brand-yellow/10 transition-all duration-300"
              aria-label="Next review"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </motion.button>
          </div>

          {/* Google attribution */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-10 flex items-center justify-center gap-2 text-gray-500 text-sm"
          >
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
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
