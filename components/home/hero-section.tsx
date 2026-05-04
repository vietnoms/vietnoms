"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { HeroSlideshow } from "./hero-slideshow";
import { ChevronDown } from "lucide-react";

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
}

export function HeroSection({ title, subtitle }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const lines = (title || "Authentic\nVietnamese\nCuisine").split("\n");

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen bg-[#0f0f0f] text-white overflow-hidden flex items-center"
    >
      {/* Dynamic slideshow background with parallax */}
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 z-[1]">
        <HeroSlideshow />
      </motion.div>

      {/* Gradient overlays for better contrast */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#0f0f0f] via-transparent to-black/30" />

      {/* Decorative accent glow */}
      <div className="absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_20%_40%,_rgba(253,208,92,0.12)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_80%_80%,_rgba(255,51,51,0.08)_0%,_transparent_40%)]" />

      {/* Decorative corner flourish */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 1 }}
        className="absolute top-8 right-8 z-[3] hidden lg:block"
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          className="text-brand-yellow/20"
        >
          <path
            d="M2 2h40M2 2v40M118 118h-40M118 118v-40"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="60" cy="60" r="4" fill="currentColor" className="opacity-50" />
        </svg>
      </motion.div>

      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-[3] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 md:py-40 lg:py-48 w-full"
      >
        <div className="max-w-2xl">
          {/* Animated tagline */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="h-px w-12 bg-gradient-to-r from-brand-yellow to-transparent" />
            <span className="text-brand-yellow text-sm font-medium tracking-widest uppercase">
              San Jose&apos;s Favorite
            </span>
          </motion.div>

          {/* Main heading with staggered animation */}
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95]">
            {lines.map((line, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.4 + i * 0.15,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="block"
              >
                {i === 1 ? (
                  <span className="bg-gradient-to-r from-brand-yellow via-amber-400 to-brand-yellow bg-clip-text text-transparent text-glow-yellow">
                    {line}
                  </span>
                ) : (
                  <span className="text-white text-glow-white">{line}</span>
                )}
              </motion.span>
            ))}
          </h1>

          {/* Animated divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-8 h-1 w-24 bg-gradient-to-r from-brand-yellow to-brand-red rounded-full origin-left"
            style={{ boxShadow: "0 0 20px rgba(253, 208, 92, 0.5)" }}
          />

          {/* Subtitle with improved contrast */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-6 text-lg sm:text-xl text-gray-100 max-w-lg leading-relaxed font-light"
          >
            {subtitle ||
              "Bun bowls, crispy banh mi, nuoc mam wings, and Vietnamese coffee. Made with love in San Jose."}
          </motion.p>

          {/* CTA buttons with stagger */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mt-10 flex flex-col sm:flex-row gap-4"
          >
            <Button asChild size="xl" className="group relative overflow-hidden">
              <Link href="/order">
                <span className="relative z-10">Order Now</span>
                <span className="absolute inset-0 bg-gradient-to-r from-red-600 to-brand-red opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10 hover:border-white/50 hover:text-white backdrop-blur-sm"
            >
              <Link href="/menu">View Menu</Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[3]"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-white/60"
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
