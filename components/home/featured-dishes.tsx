"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedDivider } from "@/components/animations/scroll-animations";
import type { MenuItem } from "@/lib/types";
import { ArrowRight } from "lucide-react";

/** Target dish names to feature — matched case-insensitively against Square catalog. */
export const FEATURED_NAMES = [
  "Bun Bowl",
  "Nuoc Mam Wings",
  "The Big Classic",
  "Banh Mi",
];

interface FeaturedDishesProps {
  items: MenuItem[];
  heading?: string;
  subtext?: string;
}

export function FeaturedDishes({ items, heading, subtext }: FeaturedDishesProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  if (items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f] via-[#111111] to-[#0f0f0f]" />
      
      {/* Decorative glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-yellow/3 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center max-w-2xl mx-auto"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-brand-yellow/80 text-sm font-medium tracking-widest uppercase"
          >
            Our Specialties
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          >
            {heading || "Signature"}
            <span className="text-brand-yellow text-glow-yellow block sm:inline sm:ml-3">Dishes</span>
          </motion.h2>

          <div className="flex justify-center mt-6">
            <AnimatedDivider color="bg-gradient-to-r from-transparent via-brand-yellow to-transparent" />
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-6 text-gray-400 text-lg"
          >
            {subtext ||
              "Explore our most-loved dishes, made fresh daily with authentic Vietnamese flavors."}
          </motion.p>
        </motion.div>

        {/* Cards grid */}
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {items.map((item, index) => (
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, y: 60 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.7,
                delay: 0.3 + index * 0.1,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
            >
              <Link href={`/menu/${item.slug}`} className="block h-full">
                <Card className="group overflow-hidden h-full bg-[#1a1a1a]/80 border-gray-800/50 hover:border-brand-yellow/30 transition-all duration-500">
                  <div className="aspect-square bg-surface relative overflow-hidden">
                    {item.imageUrl ? (
                      <motion.div
                        className="absolute inset-0"
                        whileHover={{ scale: 1.08 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      >
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                        {/* Image overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </motion.div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm bg-gradient-to-br from-surface to-surface-alt">
                        {item.name}
                      </div>
                    )}

                    {/* Price badge */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                      viewport={{ once: true }}
                      className="absolute top-3 right-3 bg-brand-yellow text-brand-black px-3 py-1 rounded-full text-sm font-bold shadow-lg shadow-brand-yellow/20"
                    >
                      {item.formattedPrice}
                    </motion.div>
                  </div>

                  <CardContent className="p-5">
                    <h3 className="font-display text-xl font-semibold text-white group-hover:text-brand-yellow transition-colors duration-300">
                      {item.name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {/* View link */}
                    <div className="mt-4 flex items-center gap-2 text-brand-yellow text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span>View Details</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View menu link */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-14 text-center"
        >
          <Link
            href="/menu"
            className="inline-flex items-center gap-3 text-white font-medium text-lg group"
          >
            <span className="border-b border-transparent group-hover:border-brand-yellow transition-colors">
              View Full Menu
            </span>
            <motion.span
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-yellow/10 text-brand-yellow group-hover:bg-brand-yellow group-hover:text-brand-black transition-all duration-300"
              whileHover={{ x: 4 }}
            >
              <ArrowRight className="h-5 w-5" />
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
