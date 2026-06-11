"use client";

import { useState, useMemo } from "react";
import { MenuItemCard } from "@/components/menu-item-card";
import type { MenuCategory } from "@/lib/types";
import { Info } from "lucide-react";

const FILTERS = [
  { label: "Vegetarian", matches: ["Vegetarian", "Vegetarian Option"] },
  { label: "Vegan", matches: ["Vegan", "Vegan Option"] },
  { label: "Gluten-Free", matches: ["Gluten-Free"] },
  { label: "Spicy", matches: ["Spicy"] },
];

interface MenuBrowserProps {
  categories: MenuCategory[];
  /** Square item ids to badge as "Popular" (from like counts) */
  popularIds: string[];
  /** Item names to badge as "Staff Pick" (from admin settings) */
  staffPicks: string[];
  allergenNote: string;
}

export function MenuBrowser({
  categories,
  popularIds,
  staffPicks,
  allergenNote,
}: MenuBrowserProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeFilter) return categories;
    const filter = FILTERS.find((entry) => entry.label === activeFilter);
    if (!filter) return categories;

    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          item.dietaryLabels.some((label) => filter.matches.includes(label))
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, activeFilter]);

  const staffPickSet = new Set(staffPicks.map((name) => name.toLowerCase()));
  const popularSet = new Set(popularIds);
  const showAllergenNote = !allergenNote.startsWith("[FILL IN");

  const badgesFor = (item: { id: string; name: string }): string[] => {
    const badges: string[] = [];
    if (staffPickSet.has(item.name.toLowerCase())) badges.push("Staff Pick");
    else if (popularSet.has(item.id)) badges.push("Popular");
    return badges;
  };

  return (
    <>
      {/* Category anchors + dietary filters */}
      <nav className="sticky top-16 z-40 bg-surface-alt/90 backdrop-blur-lg border-b border-gray-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 py-3 overflow-x-auto">
            {filtered.map((category) => (
              <a
                key={category.id}
                href={`#${category.slug}`}
                className="text-sm font-medium text-gray-400 hover:text-brand-red whitespace-nowrap transition-colors"
              >
                {category.name}
              </a>
            ))}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {FILTERS.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() =>
                    setActiveFilter(
                      activeFilter === filter.label ? null : filter.label
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                    activeFilter === filter.label
                      ? "bg-brand-red text-white"
                      : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Menu Categories */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          {showAllergenNote && (
            <p className="flex items-start gap-2 text-sm text-gray-500 -mb-6">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-brand-yellow" />
              {allergenNote}
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                No {activeFilter?.toLowerCase()} items right now.
              </p>
              <button
                onClick={() => setActiveFilter(null)}
                className="mt-4 text-sm text-brand-yellow hover:underline"
              >
                Clear filter
              </button>
            </div>
          ) : (
            filtered.map((category) => (
              <div key={category.id} id={category.slug}>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
                  {category.name}
                </h2>
                <div className="mt-1 h-1 w-12 bg-brand-red rounded-full" />
                <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {category.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      badges={badgesFor(item)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
