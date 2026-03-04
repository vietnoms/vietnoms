"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MenuCategory } from "@/lib/types";
import { Plus } from "lucide-react";

interface OrderMenuProps {
  categories: MenuCategory[];
}

export function OrderMenu({ categories }: OrderMenuProps) {
  const { addItem } = useCart();
  const [activeCategory, setActiveCategory] = useState(
    categories[0]?.slug || ""
  );

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          Menu is currently being updated. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6 sticky top-16 bg-white py-3 z-30 border-b border-gray-100">
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => {
              setActiveCategory(cat.slug);
              document
                .getElementById(`order-${cat.slug}`)
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.slug
                ? "bg-brand-red text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items by category */}
      <div className="space-y-10">
        {categories.map((category) => (
          <div key={category.id} id={`order-${category.slug}`}>
            <h2 className="font-display text-xl font-bold text-brand-black mb-4">
              {category.name}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {category.items.map((item) => (
                <Card
                  key={item.id}
                  className={`flex overflow-hidden transition-shadow ${
                    item.soldOut
                      ? "opacity-60"
                      : "hover:shadow-sm"
                  }`}
                >
                  {/* Image */}
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-200 relative">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        {item.name.substring(0, 10)}
                      </div>
                    )}
                  </div>

                  <CardContent className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <span className={`text-sm font-semibold whitespace-nowrap ${
                          item.soldOut ? "text-gray-400" : "text-brand-red"
                        }`}>
                          {item.soldOut ? "Sold Out" : item.formattedPrice}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                      {item.dietaryLabels.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.dietaryLabels.map((label) => (
                            <Badge
                              key={label}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {item.soldOut ? (
                      <span className="mt-2 self-end text-xs text-gray-400 font-medium">
                        Unavailable
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        className="mt-2 self-end h-7 text-xs"
                        onClick={() =>
                          addItem({
                            menuItem: item,
                            variationId: item.variations[0]?.id || item.id,
                            variationName:
                              item.variations[0]?.name || "Regular",
                            modifiers: [],
                          })
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
