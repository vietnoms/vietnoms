"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";

export interface GalleryItem {
  id: number;
  src: string;
  alt: string;
  category: string;
  caption?: string;
}

interface GalleryGridProps {
  items: GalleryItem[];
}

export function GalleryGrid({ items }: GalleryGridProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const categories = [
    "All",
    ...Array.from(new Set(items.map((i) => i.category))).sort(),
  ];

  const filtered =
    activeCategory === "All"
      ? items
      : items.filter((item) => item.category === activeCategory);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  return (
    <div>
      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "bg-brand-red text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Gallery coming soon</p>
          <p className="text-sm mt-1">We&apos;re adding photos — check back shortly!</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => setLightbox(item)}
              className="break-inside-avoid rounded-lg overflow-hidden relative group block w-full"
            >
              <Image
                src={item.src}
                alt={item.alt}
                width={800}
                height={600}
                className="w-full h-auto"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm">{item.caption || item.alt}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
          onKeyDown={(e) => e.key === "Escape" && closeLightbox()}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <Image
            src={lightbox.src}
            alt={lightbox.alt}
            width={1200}
            height={900}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {(lightbox.caption || lightbox.alt) && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm">
              {lightbox.caption || lightbox.alt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
