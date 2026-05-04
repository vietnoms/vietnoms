"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { RESTAURANT } from "@/lib/constants";
import { formatPhoneForTel } from "@/lib/utils";
import { MapPin, Phone, Clock, ExternalLink } from "lucide-react";
import { AnimatedDivider } from "@/components/animations/scroll-animations";

export function LocationSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const infoItems = [
    {
      icon: MapPin,
      title: "Address",
      content: (
        <>
          {RESTAURANT.address.street}
          <br />
          {RESTAURANT.address.city}, {RESTAURANT.address.state} {RESTAURANT.address.zip}
        </>
      ),
      link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(RESTAURANT.address.full)}`,
      linkText: "Get Directions",
    },
    {
      icon: Phone,
      title: "Phone",
      content: RESTAURANT.phone,
      link: formatPhoneForTel(RESTAURANT.phone),
      linkText: "Call Now",
    },
  ];

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0f0f0f]" />

      {/* Decorative elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-brand-yellow/20 to-transparent" />
      <div className="absolute top-20 right-0 w-72 h-72 bg-brand-yellow/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-64 h-64 bg-brand-red/5 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-brand-yellow/80 text-sm font-medium tracking-widest uppercase"
          >
            Find Us
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          >
            Visit
            <span className="text-brand-yellow text-glow-yellow ml-3">Us</span>
          </motion.h2>

          <div className="flex justify-center mt-6">
            <AnimatedDivider color="bg-gradient-to-r from-transparent via-brand-red to-transparent" />
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative"
          >
            {/* Frame decoration */}
            <div className="absolute -inset-3 border border-brand-yellow/20 rounded-2xl" />
            <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-2 border-l-2 border-brand-yellow rounded-tl-lg" />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-2 border-r-2 border-brand-yellow rounded-br-lg" />

            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-surface-alt shadow-2xl shadow-black/50">
              <iframe
                src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3172!2d${RESTAURANT.geo.lng}!3d${RESTAURANT.geo.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s${encodeURIComponent(RESTAURANT.address.full)}!5e0!3m2!1sen!2sus`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Vietnoms Location"
                className="grayscale hover:grayscale-0 transition-all duration-500"
              />
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="flex flex-col justify-center"
          >
            <div className="space-y-8">
              {/* Address & Phone */}
              {infoItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                  className="group flex gap-5"
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-brand-yellow/10 flex items-center justify-center group-hover:bg-brand-yellow/20 transition-colors">
                    <item.icon className="h-6 w-6 text-brand-yellow" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">{item.title}</h3>
                    <p className="text-gray-400 mt-1 leading-relaxed">{item.content}</p>
                    <a
                      href={item.link}
                      target={item.title === "Address" ? "_blank" : undefined}
                      rel={item.title === "Address" ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center gap-1 mt-2 text-sm text-brand-yellow hover:text-brand-yellow/80 transition-colors"
                    >
                      {item.linkText}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </motion.div>
              ))}

              {/* Hours */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="group flex gap-5"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-brand-yellow/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-brand-yellow" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-white">Hours</h3>
                  <div className="mt-2 space-y-2">
                    {RESTAURANT.hours.map((h, i) => (
                      <motion.div
                        key={h.days}
                        initial={{ opacity: 0, x: 20 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
                        className="flex justify-between items-center py-1 border-b border-gray-800/50 last:border-0"
                      >
                        <span className="text-white font-medium">{h.days}</span>
                        <span className="text-gray-400">
                          {h.open} – {h.close}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Social links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 1 }}
              className="mt-10 pt-8 border-t border-gray-800"
            >
              <p className="text-sm text-gray-500 mb-4">Follow us on social media</p>
              <div className="flex gap-4">
                {Object.entries(RESTAURANT.social).map(([name, url]) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-full bg-surface-alt border border-gray-800 text-gray-300 hover:text-brand-yellow hover:border-brand-yellow/30 transition-all duration-300 text-sm capitalize"
                  >
                    {name}
                  </a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
