"use client";

import Link from "next/link";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Utensils } from "lucide-react";

interface OrderingCalloutProps {
  heading?: string;
  text?: string;
  buttonText?: string;
}

export function OrderingCallout({ heading, text, buttonText }: OrderingCalloutProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const features = [
    { icon: Clock, label: "Ready in 15-20 min" },
    { icon: MapPin, label: "Easy pickup" },
    { icon: Utensils, label: "Fresh & hot" },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Animated gradient background */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 bg-gradient-to-br from-brand-red via-red-600 to-brand-red"
      />

      {/* Decorative patterns */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* Light overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-white/20 hidden lg:block" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-white/20 hidden lg:block" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Features row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap justify-center gap-6 md:gap-10 mb-10"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                className="flex items-center gap-2 text-white/90"
              >
                <feature.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{feature.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Main heading */}
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white text-glow-white"
          >
            {heading || "Order Online for Pickup"}
          </motion.h2>

          {/* Animated divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mt-8 h-1 w-24 bg-white/40 rounded-full origin-center"
          />

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-8 text-xl text-white/90 max-w-xl mx-auto leading-relaxed"
          >
            {text ||
              "Skip the wait. Order your favorite Vietnamese dishes online and pick them up fresh and ready."}
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-10"
          >
            <Button
              asChild
              size="xl"
              className="bg-white text-brand-red hover:bg-gray-100 hover:shadow-xl hover:shadow-white/20 font-bold text-lg px-10 transition-all duration-300"
            >
              <Link href="/order">{buttonText || "Start Your Order"}</Link>
            </Button>
          </motion.div>

          {/* Trust indicator */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-8 text-white/60 text-sm"
          >
            No account required • Pay when you pick up
          </motion.p>
        </div>
      </div>
    </section>
  );
}
