"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedImage, AnimatedDivider } from "@/components/animations/scroll-animations";
import { Users, Calendar, Sparkles } from "lucide-react";

interface CateringBannerProps {
  heading?: string;
  text?: string;
  imageUrl?: string;
}

export function CateringBanner({ heading, text, imageUrl }: CateringBannerProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const features = [
    { icon: Users, label: "10-500+ guests" },
    { icon: Calendar, label: "Any occasion" },
    { icon: Sparkles, label: "Custom menus" },
  ];

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0f0f0f]" />
      
      {/* Decorative gradient orbs */}
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-brand-yellow/5 rounded-full blur-3xl" />
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-brand-red/5 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -60, rotateY: 10 }}
            animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
            transition={{ duration: 0.9, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative order-2 md:order-1"
          >
            {/* Decorative frame */}
            <div className="absolute -inset-4 border border-brand-yellow/20 rounded-2xl -z-10" />
            <div className="absolute -inset-8 border border-brand-yellow/10 rounded-3xl -z-20 hidden lg:block" />

            {/* Accent corner decorations */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-brand-yellow/40 rounded-tl-lg" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-brand-yellow/40 rounded-br-lg" />

            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface-alt shadow-2xl shadow-black/50">
              {imageUrl ? (
                <AnimatedImage
                  src={imageUrl}
                  alt="Catering"
                  className="h-full w-full"
                  parallaxIntensity={0.15}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-alt to-surface text-gray-500">
                  <span className="text-sm">Catering Photo</span>
                </div>
              )}

              {/* Image overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Floating accent badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute bottom-6 right-6 bg-brand-red text-white px-6 py-3 rounded-lg shadow-lg shadow-brand-red/30 z-10"
            >
              <span className="font-display text-lg md:text-xl font-bold">Book Today</span>
            </motion.div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="order-1 md:order-2"
          >
            {/* Section label */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="text-brand-yellow/80 text-sm font-medium tracking-widest uppercase">
                Events & Gatherings
              </span>
              <span className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-brand-yellow/50 to-transparent" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
            >
              {(heading || "Catering for Your Next Event").split("\n").map((line, i) => (
                <span key={i}>
                  {i === 0 ? (
                    <>
                      {line}
                      <br className="hidden sm:block" />
                    </>
                  ) : (
                    <span className="text-brand-yellow text-glow-yellow">{line}</span>
                  )}
                </span>
              ))}
            </motion.h2>

            <AnimatedDivider className="mt-6" color="bg-brand-yellow" />

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 flex flex-wrap gap-6"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-2 text-gray-300"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-yellow/10 flex items-center justify-center">
                    <feature.icon className="h-4 w-4 text-brand-yellow" />
                  </div>
                  <span className="text-sm font-medium">{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="mt-8 text-gray-300 text-lg leading-relaxed"
            >
              {text ||
                "From corporate lunches to wedding celebrations, our Vietnamese catering brings bold flavors to any occasion. Choose from our bun bowl bar, party platters, or pre-made bowl packages."}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.8 }}
              className="mt-8"
            >
              <Button
                asChild
                size="lg"
                className="bg-brand-yellow text-brand-black hover:bg-yellow-400 font-bold"
              >
                <Link href="/catering">Explore Catering</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
