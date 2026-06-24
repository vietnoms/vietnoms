"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Megaphone } from "lucide-react";

interface AnnouncementBarProps {
  id: number;
  title: string;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
}

export function AnnouncementBar({
  id,
  title,
  body,
  ctaLabel,
  ctaHref,
}: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(true);
  const storageKey = `vn_announcement_dismissed_${id}`;

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
  };

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-brand-red via-brand-red to-[#cc1f1f] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-3 text-sm">
        <Megaphone className="h-4 w-4 flex-shrink-0 hidden sm:block" />
        <p className="font-medium">
          <span>{title}</span>
          {body && <span className="hidden md:inline text-white/80"> — {body}</span>}
        </p>
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="flex-shrink-0 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1 text-xs font-semibold transition-colors"
          >
            {ctaLabel}
          </Link>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
