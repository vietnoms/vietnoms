"use client";

import { useState } from "react";

const CATEGORIES = ["All", "Food", "Interior", "Events", "Team"] as const;

const GALLERY_ITEMS = [
  { src: "/images/gallery/bun-bowl-1.jpg", alt: "Vermicelli bun bowl with grilled lemongrass chicken", category: "Food" },
  { src: "/images/gallery/banh-mi-1.jpg", alt: "Crispy banh mi sandwich with grilled pork", category: "Food" },
  { src: "/images/gallery/wings-1.jpg", alt: "Nuoc mam chicken wings with fresh herbs", category: "Food" },
  { src: "/images/gallery/interior-1.jpg", alt: "Vietnoms restaurant dining area", category: "Interior" },
  { src: "/images/gallery/interior-2.jpg", alt: "Vietnoms restaurant bar area", category: "Interior" },
  { src: "/images/gallery/big-classic-1.jpg", alt: "The Big Classic double-meat bun bowl", category: "Food" },
  { src: "/images/gallery/catering-1.jpg", alt: "Vietnoms catering setup for corporate event", category: "Events" },
  { src: "/images/gallery/team-1.jpg", alt: "Vietnoms kitchen team preparing dishes", category: "Team" },
  { src: "/images/gallery/rice-bowl-1.jpg", alt: "Rice bowl with grilled lemongrass pork", category: "Food" },
  { src: "/images/gallery/catering-2.jpg", alt: "Bun bowl bar catering station at wedding", category: "Events" },
  { src: "/images/gallery/team-2.jpg", alt: "Vietnoms front of house team", category: "Team" },
  { src: "/images/gallery/coffee-1.jpg", alt: "Vietnamese iced coffee with condensed milk", category: "Food" },
];

export function GalleryGrid() {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filtered =
    activeCategory === "All"
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <div>
      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "bg-brand-red text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {filtered.map((item) => (
          <div
            key={item.src}
            className="break-inside-avoid rounded-lg overflow-hidden bg-gray-200 aspect-[4/3] relative group"
          >
            {/* Placeholder — replace with next/image when photos are added */}
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs p-2 text-center">
              {item.alt}
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}
