"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { RESTAURANT } from "@/lib/constants";
import { formatPhoneForTel } from "@/lib/utils";
import { MapPin, Phone, Mail, ArrowUpRight } from "lucide-react";

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, margin: "-50px" });

  const quickLinks = [
    { href: "/menu", label: "Menu" },
    { href: "/order", label: "Order Online" },
    { href: "/catering", label: "Catering" },
    { href: "/gift-cards", label: "Gift Cards" },
    { href: "/about", label: "About Us" },
    { href: "/gallery", label: "Gallery" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <footer ref={footerRef} className="relative bg-[#0a0a0a] text-white overflow-hidden">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-yellow/30 to-transparent" />

      {/* Decorative glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-yellow/5 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="lg:col-span-1"
          >
            <Link href="/" className="inline-block">
              <h3 className="font-display text-3xl font-bold">
                <span className="text-brand-red">Viet</span>
                <span className="text-brand-yellow">noms</span>
              </h3>
            </Link>
            <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-xs">
              Authentic Vietnamese cuisine made with fresh ingredients and
              traditional recipes. Serving San Jose since day one.
            </p>
            <div className="mt-6 flex gap-3">
              {Object.entries(RESTAURANT.social).map(([name, url]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-brand-yellow hover:border-brand-yellow/30 transition-all duration-300 text-xs capitalize"
                  aria-label={name}
                >
                  {name.charAt(0).toUpperCase()}
                </a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h4 className="font-display text-lg text-brand-yellow tracking-wider mb-5">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Hours */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h4 className="font-display text-lg text-brand-yellow tracking-wider mb-5">
              Hours
            </h4>
            <ul className="space-y-3">
              {RESTAURANT.hours.map((h) => (
                <li key={h.days} className="text-sm">
                  <span className="text-white font-medium block">{h.days}</span>
                  <span className="text-gray-500">
                    {h.open} – {h.close}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h4 className="font-display text-lg text-brand-yellow tracking-wider mb-5">
              Contact
            </h4>
            <address className="not-italic space-y-4">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(RESTAURANT.address.full)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-sm text-gray-400 hover:text-white transition-colors group"
              >
                <MapPin className="h-5 w-5 text-brand-yellow flex-shrink-0 mt-0.5" />
                <span>{RESTAURANT.address.full}</span>
              </a>
              <a
                href={formatPhoneForTel(RESTAURANT.phone)}
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Phone className="h-5 w-5 text-brand-yellow flex-shrink-0" />
                <span>{RESTAURANT.phone}</span>
              </a>
              <a
                href={`mailto:${RESTAURANT.email}`}
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="h-5 w-5 text-brand-yellow flex-shrink-0" />
                <span>{RESTAURANT.email}</span>
              </a>
            </address>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 pt-8 border-t border-white/10"
        >
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Vietnoms. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
