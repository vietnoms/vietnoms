"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Clock } from "lucide-react";

export interface SpecialCard {
  id: number;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  endsAt: string | null;
}

function formatEndDate(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const date = new Date(endsAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SpecialsSection({ specials }: { specials: SpecialCard[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  if (specials.length === 0) return null;

  return (
    <section ref={sectionRef} className="relative py-20 lg:py-28 bg-[#0f0f0f] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-red/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between gap-4"
        >
          <div>
            <p className="font-display text-brand-red tracking-[0.3em] text-sm">
              LIMITED TIME
            </p>
            <h2 className="mt-2 font-display text-4xl md:text-5xl font-bold text-white">
              Right Now at <span className="text-brand-yellow">Vietnoms</span>
            </h2>
          </div>
          <Link
            href="/specials"
            className="hidden sm:inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand-yellow transition-colors flex-shrink-0"
          >
            All specials <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specials.slice(0, 3).map((special, index) => {
            const ends = formatEndDate(special.endsAt);
            return (
              <motion.div
                key={special.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
                className="group relative rounded-2xl border border-white/10 bg-[#141414] overflow-hidden hover:border-brand-red/40 transition-colors"
              >
                {special.imageUrl && (
                  <div className="aspect-[16/9] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={special.imageUrl}
                      alt={special.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-6">
                  {ends && (
                    <p className="inline-flex items-center gap-1.5 text-xs text-brand-yellow mb-2">
                      <Clock className="h-3.5 w-3.5" /> Through {ends}
                    </p>
                  )}
                  <h3 className="font-display text-2xl font-bold text-white">
                    {special.title}
                  </h3>
                  {special.body && (
                    <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                      {special.body}
                    </p>
                  )}
                  <Link
                    href={special.ctaHref || "/order"}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-red hover:text-brand-yellow transition-colors"
                  >
                    {special.ctaLabel || "Order Now"}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
