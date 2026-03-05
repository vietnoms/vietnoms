"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { MenuItem } from "@/lib/types";
import { ItemAddToCart } from "./item-add-to-cart";

interface ItemPageClientProps {
  item: MenuItem;
  children?: React.ReactNode;
}

export function ItemPageClient({ item, children }: ItemPageClientProps) {
  const [selectedVariationId, setSelectedVariationId] = useState(
    item.variations[0]?.id || ""
  );

  const displayImageUrl = useMemo(() => {
    const variation = item.variations.find((v) => v.id === selectedVariationId);
    return variation?.imageUrl || item.imageUrl;
  }, [item, selectedVariationId]);

  return (
    <>
      {/* Image */}
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
        {displayImageUrl ? (
          <Image
            src={displayImageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            {item.name}
          </div>
        )}
        {item.soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-white text-brand-black font-semibold px-4 py-2 rounded-full">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div>
        {children}

        <div className="mt-8">
          <ItemAddToCart
            item={item}
            onVariationChange={setSelectedVariationId}
          />
        </div>
      </div>
    </>
  );
}
