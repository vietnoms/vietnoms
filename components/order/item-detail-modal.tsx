"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";
import {
  Minus,
  Plus,
  ShoppingCart,
  Check,
  Star,
  Heart,
  Loader2,
} from "lucide-react";

interface ItemStats {
  averageRating: number;
  reviewCount: number;
  likeCount: number;
}

interface ReviewData {
  id: number;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  givenName: string | null;
  familyName: string | null;
}

interface ItemDetailModalProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats?: ItemStats;
  liked?: boolean;
  onToggleLike?: (itemId: string) => void;
}

export function ItemDetailModal({
  item,
  open,
  onOpenChange,
  stats,
  liked = false,
  onToggleLike,
}: ItemDetailModalProps) {
  const { addItem, openCart } = useCart();
  const { user, setShowLogin } = useAuth();

  const [selectedVariationId, setSelectedVariationId] = useState("");
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, Set<string>>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [modifierErrors, setModifierErrors] = useState<Record<string, string>>({});

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Reset state when item changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (item) {
      setSelectedVariationId(item.variations[0]?.id || "");
      setSelectedModifiers({});
      setQuantity(1);
      setAdded(false);
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewText("");
    }
  }, [item]);

  // Fetch reviews when modal opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open && item) {
      setLoadingReviews(true);
      fetch(`/api/reviews?itemId=${item.id}`)
        .then((r) => r.json())
        .then((data) => setReviews(data.reviews || []))
        .catch(() => setReviews([]))
        .finally(() => setLoadingReviews(false));
    }
  }, [open, item]);

  const selectedVariation = useMemo(
    () => item?.variations.find((v) => v.id === selectedVariationId),
    [item, selectedVariationId]
  );

  const modifierTotal = useMemo(() => {
    if (!item) return 0;
    let total = 0;
    for (const list of item.modifierLists) {
      const selected = selectedModifiers[list.id];
      if (!selected) continue;
      for (const mod of list.modifiers) {
        if (selected.has(mod.id)) total += mod.price;
      }
    }
    return total;
  }, [item, selectedModifiers]);

  const lineTotal = item
    ? ((selectedVariation?.price ?? item.price) + modifierTotal) * quantity
    : 0;

  function toggleModifier(
    listId: string,
    modId: string,
    selectionType: "SINGLE" | "MULTIPLE",
    maxSelected?: number
  ) {
    setSelectedModifiers((prev) => {
      const next = { ...prev };
      if (selectionType === "SINGLE") {
        next[listId] = new Set([modId]);
      } else {
        const current = new Set(prev[listId] || []);
        if (current.has(modId)) {
          current.delete(modId);
        } else {
          if (maxSelected && current.size >= maxSelected) return prev;
          current.add(modId);
        }
        next[listId] = current;
      }
      return next;
    });
    setModifierErrors((prev) => {
      const next = { ...prev };
      delete next[listId];
      return next;
    });
  }

  const validateModifiers = useCallback((): boolean => {
    if (!item) return true;
    const errors: Record<string, string> = {};
    for (const list of item.modifierLists) {
      const selected = selectedModifiers[list.id]?.size || 0;
      if (list.minSelected && selected < list.minSelected) {
        errors[list.id] = `Please select at least ${list.minSelected}`;
      }
    }
    setModifierErrors(errors);
    return Object.keys(errors).length === 0;
  }, [item, selectedModifiers]);

  const canAddToCart = useMemo(() => {
    if (!item) return false;
    for (const list of item.modifierLists) {
      const selected = selectedModifiers[list.id]?.size || 0;
      if (list.minSelected && selected < list.minSelected) return false;
    }
    return true;
  }, [item, selectedModifiers]);

  function handleAddToCart() {
    if (!item) return;
    if (!validateModifiers()) return;

    const modifiers: { id: string; name: string; price: number }[] = [];
    for (const list of item.modifierLists) {
      const selected = selectedModifiers[list.id];
      if (!selected) continue;
      for (const mod of list.modifiers) {
        if (selected.has(mod.id)) {
          modifiers.push({ id: mod.id, name: mod.name, price: mod.price });
        }
      }
    }

    for (let i = 0; i < quantity; i++) {
      addItem({
        menuItem: item,
        variationId: selectedVariationId,
        variationName: selectedVariation?.name || "Regular",
        modifiers,
      });
    }

    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onOpenChange(false);
      openCart();
    }, 1200);
  }

  function handleLike() {
    if (!item) return;
    if (!user) {
      setShowLogin(true);
      return;
    }
    onToggleLike?.(item.id);
  }

  async function handleSubmitReview() {
    if (!item || !user) return;
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          rating: reviewRating,
          reviewText: reviewText || undefined,
        }),
      });
      if (res.ok) {
        setShowReviewForm(false);
        setReviewText("");
      }
    } catch {
      // ignore
    } finally {
      setSubmittingReview(false);
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto
          fixed bottom-0 left-0 right-0 top-auto rounded-t-2xl translate-x-0 translate-y-0
          sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]
          sm:rounded-lg sm:max-w-lg"
      >
        <DialogTitle className="sr-only">{item.name}</DialogTitle>

        {/* Image */}
        {item.imageUrl && (
          <div className="w-full aspect-[16/10] bg-gray-200 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Name, price, badges */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-brand-black">
                {item.name}
              </h2>
              <span className="text-lg font-bold text-brand-red whitespace-nowrap">
                {item.formattedPrice}
              </span>
            </div>

            {item.dietaryLabels.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {item.dietaryLabels.map((label) => (
                  <Badge key={label} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Stats row: rating + likes */}
            <div className="flex items-center gap-4 mt-2">
              {stats && stats.reviewCount > 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{stats.averageRating.toFixed(1)}</span>
                  <span className="text-gray-400">({stats.reviewCount})</span>
                </div>
              )}
              <button
                onClick={handleLike}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-500 transition-colors"
              >
                <Heart
                  className={`h-4 w-4 ${
                    liked ? "fill-red-500 text-red-500" : ""
                  }`}
                />
                <span>{stats?.likeCount || 0}</span>
              </button>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-gray-600">{item.description}</p>
          )}

          {/* Variation selector */}
          {item.variations.length > 1 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Size</h3>
              <div className="flex flex-wrap gap-2">
                {item.variations.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariationId(v.id)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                      selectedVariationId === v.id
                        ? "border-brand-red bg-brand-red/5 text-brand-red"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {v.name} &mdash; {v.formattedPrice}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modifier lists */}
          {item.modifierLists.map((list) => {
            const selectedCount = selectedModifiers[list.id]?.size || 0;
            const atMax = !!(list.maxSelected && selectedCount >= list.maxSelected);

            let hint = "";
            if (list.minSelected && list.maxSelected && list.minSelected === list.maxSelected) {
              hint = `(pick exactly ${list.minSelected})`;
            } else if (list.minSelected && list.minSelected > 0) {
              hint = list.selectionType === "SINGLE"
                ? "(required)"
                : `(pick at least ${list.minSelected})`;
            } else if (list.maxSelected) {
              hint = `(pick up to ${list.maxSelected})`;
            } else if (list.selectionType === "SINGLE") {
              hint = "(pick one)";
            }

            return (
              <div key={list.id}>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">
                  {list.name}
                  {hint && (
                    <span className="text-gray-400 font-normal ml-1">
                      {hint}
                    </span>
                  )}
                </h3>
                {modifierErrors[list.id] && (
                  <p className="text-xs text-red-500 mb-1.5">
                    {modifierErrors[list.id]}
                  </p>
                )}
                <div className="space-y-1.5">
                  {list.modifiers.map((mod) => {
                    const isSelected =
                      selectedModifiers[list.id]?.has(mod.id) || false;
                    const disabled = !isSelected && atMax && list.selectionType === "MULTIPLE";
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                          disabled
                            ? "border-gray-100 bg-gray-50 cursor-not-allowed opacity-50"
                            : isSelected
                              ? "border-brand-red bg-brand-red/5 cursor-pointer"
                              : "border-gray-200 hover:border-gray-300 cursor-pointer"
                        }`}
                      >
                        <input
                          type={
                            list.selectionType === "SINGLE" ? "radio" : "checkbox"
                          }
                          name={`modal-modifier-${list.id}`}
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() =>
                            toggleModifier(list.id, mod.id, list.selectionType, list.maxSelected)
                          }
                          className="accent-brand-red"
                        />
                        <span className="flex-1 text-sm">{mod.name}</span>
                        {mod.price > 0 && (
                          <span className="text-sm text-gray-500">
                            +{mod.formattedPrice}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Reviews section */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">
              Reviews
            </h3>
            {loadingReviews ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading reviews...
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-gray-400">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-gray-500">
                        {review.givenName || "Customer"}
                      </span>
                    </div>
                    {review.reviewText && (
                      <p className="text-gray-600 mt-1">{review.reviewText}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Write a review */}
            {user && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="text-sm text-brand-red hover:underline mt-2"
              >
                Write a Review
              </button>
            )}

            {showReviewForm && (
              <div className="mt-3 space-y-3 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setReviewRating(i + 1)}
                      aria-label={`Rate ${i + 1} star${i > 0 ? "s" : ""}`}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          i < reviewRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="What did you think? (optional)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                  >
                    {submittingReview ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    Submit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReviewForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky add to cart bar */}
        {!item.soldOut && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex items-center gap-3">
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2 hover:bg-gray-50 rounded-l-lg"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-3 py-2 text-sm font-medium min-w-[2rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="p-2 hover:bg-gray-50 rounded-r-lg"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button
              className="flex-1"
              onClick={handleAddToCart}
              disabled={added || item.soldOut || !canAddToCart}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Added!
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart &mdash; {formatPrice(lineTotal)}
                </>
              )}
            </Button>
          </div>
        )}

        {item.soldOut && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
            <Button disabled className="w-full opacity-50">
              Sold Out
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
