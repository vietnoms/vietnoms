"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedImage, AnimatedDivider } from "@/components/animations/scroll-animations";

interface AboutSnippetProps {
  heading?: string;
  text1?: string;
  text2?: string;
  imageUrl?: string;
}

export function AboutSnippet({ heading, text1, text2, imageUrl }: AboutSnippetProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f] via-[#141414] to-[#0f0f0f]" />
      
      {/* Decorative background elements */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-brand-yellow/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-brand-red/5 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            {/* Section label */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="text-brand-yellow/80 text-sm font-medium tracking-widest uppercase">
                Our Story
              </span>
              <span className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-brand-yellow/50 to-transparent" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
            >
              {heading || "Where Tradition"}
              <br />
              <span className="text-brand-yellow text-glow-yellow">Meets Flavor</span>
            </motion.h2>

            <AnimatedDivider className="mt-6" color="bg-brand-red" />

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-8 text-gray-300 text-lg leading-relaxed"
            >
              {text1 ||
                "At Vietnoms, we bring the vibrant flavors of Vietnam to San Jose. Every dish is crafted with authentic recipes passed down through generations, using the freshest ingredients we can source."}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-4 text-gray-400 leading-relaxed"
            >
              {text2 ||
                "From our signature bun bowls to our crispy banh mi, each bite tells a story of tradition, passion, and the warmth of Vietnamese hospitality."}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              <Button
                asChild
                variant="link"
                className="mt-6 px-0 text-base text-brand-yellow hover:text-brand-yellow/80 group"
              >
                <Link href="/about" className="flex items-center gap-2">
                  Read Our Full Story
                  <motion.span
                    className="inline-block"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    &rarr;
                  </motion.span>
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Image with animated entrance */}
          <motion.div
            initial={{ opacity: 0, x: 60, rotateY: -10 }}
            animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative"
          >
            {/* Decorative frame */}
            <div className="absolute -inset-4 border border-brand-yellow/20 rounded-2xl -z-10" />
            <div className="absolute -inset-8 border border-brand-yellow/10 rounded-3xl -z-20 hidden lg:block" />
            
            {/* Accent corner decorations */}
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-brand-yellow/40 rounded-tr-lg" />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-brand-yellow/40 rounded-bl-lg" />

            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface-alt shadow-2xl shadow-black/50">
              {imageUrl ? (
                <AnimatedImage
                  src={imageUrl}
                  alt="About Vietnoms"
                  className="h-full w-full"
                  parallaxIntensity={0.15}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-alt to-surface text-gray-500">
                  <span className="text-sm">Restaurant Photo</span>
                </div>
              )}

              {/* Image overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Floating accent badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-brand-yellow text-brand-black px-6 py-3 rounded-lg shadow-lg shadow-brand-yellow/20"
            >
              <span className="font-display text-lg md:text-xl font-bold">Since Day One</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
