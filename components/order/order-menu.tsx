"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ItemDetailModal } from "./item-detail-modal";
import type { MenuCategory, MenuItem } from "@/lib/types";
import { Plus, Star, Heart, ShoppingBag } from "lucide-react";
import { CartSidebar } from "./cart-sidebar";

interface ItemStats {
  averageRating: number;
  reviewCount: number;
  likeCount: number;
}

interface OrderMenuProps {
  categories: MenuCategory[];
  itemStats?: Record<string, ItemStats>;
}

export function OrderMenu({ categories, itemStats = {} }: OrderMenuProps) {
  const { addItem, openCart, itemCount } = useCart();
  const { user, setShowLogin } = useAuth();
  const [activeCategory, setActiveCategory] = useState(
    categories[0]?.slug || ""
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [localStats, setLocalStats] = useState<Record<string, ItemStats>>(itemStats);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isScrolling = useRef(false);

  // Fetch user's likes on mount
  useEffect(() => {
    if (user) {
      fetch("/api/likes/mine")
        .then((r) => r.json())
        .then((data) => {
          if (data.likedItemIds) {
            setLikedItems(new Set(data.likedItemIds));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Intersection Observer for active category highlighting
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const slug = entry.target.id.replace("order-", "");
            setActiveCategory(slug);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    for (const cat of categories) {
      const el = document.getElementById(`order-${cat.slug}`);
      if (el) {
        sectionRefs.current.set(cat.slug, el);
        observer.observe(el);
      }
    }

    return () => observer.disconnect();
  }, [categories]);

  const scrollToCategory = useCallback((slug: string) => {
    setActiveCategory(slug);
    isScrolling.current = true;
    document
      .getElementById(`order-${slug}`)
      ?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      isScrolling.current = false;
    }, 1000);
  }, []);

  const isSimpleItem = (item: MenuItem) =>
    item.variations.length <= 1 && item.modifierLists.length === 0;

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleToggleLike = async (itemId: string) => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    // Optimistic update
    setLikedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });

    setLocalStats((prev) => {
      const existing = prev[itemId] || { averageRating: 0, reviewCount: 0, likeCount: 0 };
      return {
        ...prev,
        [itemId]: {
          ...existing,
          likeCount: likedItems.has(itemId)
            ? Math.max(0, existing.likeCount - 1)
            : existing.likeCount + 1,
        },
      };
    });

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalStats((prev) => ({
          ...prev,
          [itemId]: {
            ...prev[itemId],
            likeCount: data.likeCount,
          },
        }));
      }
    } catch {
      // Revert optimistic update on error
      setLikedItems((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        return next;
      });
    }
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">
          Menu is currently being updated. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Desktop sidebar nav */}
      <nav className="hidden lg:block w-44 shrink-0">
        <div className="sticky top-24 space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => scrollToCategory(cat.slug)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat.slug
                  ? "bg-brand-red text-white"
                  : "text-gray-400 hover:bg-white/10"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        {/* Mobile horizontal scrollable tabs */}
        <div className="lg:hidden flex gap-2 mb-6 sticky top-16 bg-surface-alt/90 backdrop-blur-lg py-3 z-30 border-b border-gray-800/50 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => scrollToCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeCategory === cat.slug
                  ? "bg-brand-red text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
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
              <h2 className="font-display text-xl font-bold text-white mb-4">
                {category.name}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {category.items.map((item) => {
                  const stats = localStats[item.id];
                  const isLiked = likedItems.has(item.id);

                  return (
                    <Card
                      key={item.id}
                      className={`flex overflow-hidden transition-shadow cursor-pointer ${
                        item.soldOut
                          ? "opacity-60"
                          : "hover:shadow-md"
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      {/* Image */}
                      <div className="w-24 h-24 flex-shrink-0 bg-gray-800 relative">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                            {item.name.substring(0, 10)}
                          </div>
                        )}
                      </div>

                      <CardContent className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-sm">
                              {item.name}
                            </span>
                            <span
                              className={`text-sm font-semibold whitespace-nowrap ${
                                item.soldOut
                                  ? "text-gray-400"
                                  : "text-brand-red"
                              }`}
                            >
                              {item.soldOut ? "Sold Out" : item.formattedPrice}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {item.description}
                            </p>
                          )}

                          {/* Stats row: badges + rating + likes */}
                          <div className="flex items-center gap-2 mt-1">
                            {item.dietaryLabels.map((label) => (
                              <Badge
                                key={label}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {label}
                              </Badge>
                            ))}
                            {stats && stats.reviewCount > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {stats.averageRating.toFixed(1)}
                              </span>
                            )}
                            {stats && stats.likeCount > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <Heart
                                  className={`h-3 w-3 ${
                                    isLiked
                                      ? "fill-red-500 text-red-500"
                                      : ""
                                  }`}
                                />
                                {stats.likeCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick-add for simple items */}
                        {item.soldOut ? (
                          <span className="mt-2 self-end text-xs text-gray-400 font-medium">
                            Unavailable
                          </span>
                        ) : isSimpleItem(item) ? (
                          <Button
                            size="sm"
                            className="mt-2 self-end h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem({
                                menuItem: item,
                                variationId:
                                  item.variations[0]?.id || item.id,
                                variationName:
                                  item.variations[0]?.name || "Regular",
                                modifiers: [],
                              });
                              openCart();
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 self-end h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                          >
                            Customize
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop cart sidebar */}
      <div className="hidden lg:block w-80 shrink-0">
        <CartSidebar />
      </div>

      {/* Mobile floating cart FAB */}
      {itemCount > 0 && (
        <button
          onClick={openCart}
          className="lg:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-brand-red text-white shadow-lg flex items-center justify-center"
        >
          <ShoppingBag className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white text-brand-red text-xs font-bold flex items-center justify-center">
            {itemCount}
          </span>
        </button>
      )}

      {/* Item detail modal */}
      <ItemDetailModal
        item={selectedItem}
        open={modalOpen}
        onOpenChange={setModalOpen}
        stats={selectedItem ? localStats[selectedItem.id] : undefined}
        liked={selectedItem ? likedItems.has(selectedItem.id) : false}
        onToggleLike={handleToggleLike}
      />
    </div>
  );
}
