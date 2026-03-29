"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";
import { Badge, labelVariant } from "@/components/ui/badge";
import { ShoppingCart, Check, Minus, Plus } from "lucide-react";

const MODIFIER_LABELS: Record<string, string[]> = {
  "Lemongrass Chicken": ["Customer Favorite"],
  "Lemongrass Pork": ["Customer Favorite"],
  "Red Hot Beef": ["Spicy", "Gluten-Free"],
  "Stir-fried Tofu": ["Vegan", "Vegetarian"],
  "Stir-Fried Tofu": ["Vegan", "Vegetarian"],
  "Vegan Egg Roll": ["Vegan", "Vegetarian"],
};

interface ItemAddToCartProps {
  item: MenuItem;
  onVariationChange?: (variationId: string) => void;
}

export function ItemAddToCart({ item, onVariationChange }: ItemAddToCartProps) {
  const { addItem, openCart } = useCart();
  const router = useRouter();

  const [selectedVariationId, setSelectedVariationId] = useState(
    (item.variations.find((v) => !v.soldOut) || item.variations[0])?.id || ""
  );
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, Set<string>>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [modifierErrors, setModifierErrors] = useState<Record<string, string>>({});

  const selectedVariation = useMemo(
    () => item.variations.find((v) => v.id === selectedVariationId),
    [item.variations, selectedVariationId]
  );

  const modifierTotal = useMemo(() => {
    let total = 0;
    for (const list of item.modifierLists) {
      const selected = selectedModifiers[list.id];
      if (!selected) continue;
      for (const mod of list.modifiers) {
        if (selected.has(mod.id)) total += mod.price;
      }
    }
    return total;
  }, [item.modifierLists, selectedModifiers]);

  const maxStock = selectedVariation?.stockQuantity ?? Infinity;

  const lineTotal =
    ((selectedVariation?.price ?? item.price) + modifierTotal) * quantity;

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
    const errors: Record<string, string> = {};
    for (const list of item.modifierLists) {
      const selected = selectedModifiers[list.id]?.size || 0;
      if (list.minSelected && selected < list.minSelected) {
        errors[list.id] = `Please select at least ${list.minSelected}`;
      }
    }
    setModifierErrors(errors);
    return Object.keys(errors).length === 0;
  }, [item.modifierLists, selectedModifiers]);

  const canAddToCart = useMemo(() => {
    for (const list of item.modifierLists) {
      const selected = selectedModifiers[list.id]?.size || 0;
      if (list.minSelected && selected < list.minSelected) return false;
    }
    return true;
  }, [item.modifierLists, selectedModifiers]);

  function handleAddToCart() {
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
      router.push("/order");
      openCart();
    }, 1000);
  }

  // Compute the displayed price based on selected variation
  const displayPrice = selectedVariation?.formattedPrice || item.formattedPrice;
  const hasMultiplePrices = useMemo(() => {
    if (item.variations.length <= 1) return false;
    const prices = new Set(item.variations.map((v) => v.price));
    return prices.size > 1;
  }, [item.variations]);

  if (item.soldOut) {
    return (
      <>
        <p className="text-2xl font-bold text-gray-500 mb-5">Sold Out</p>
        <Button size="xl" disabled className="opacity-50 cursor-not-allowed">
          Sold Out
        </Button>
      </>
    );
  }

  return (
    <div className="space-y-5">
      {/* Dynamic price */}
      <p className="text-2xl font-bold text-brand-red">
        {hasMultiplePrices && item.variations.length > 1 && selectedVariationId === item.variations[0]?.id
          ? `From ${displayPrice}`
          : displayPrice}
      </p>

      {/* Variation selector */}
      {item.variations.length > 1 && (
        <div>
          <h3 className="font-semibold text-sm text-gray-300 mb-2">Size</h3>
          <div className="flex flex-wrap gap-2">
            {item.variations.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  if (!v.soldOut) {
                    setSelectedVariationId(v.id);
                    onVariationChange?.(v.id);
                  }
                }}
                disabled={v.soldOut}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  v.soldOut
                    ? "border-gray-700 text-gray-600 line-through cursor-not-allowed"
                    : selectedVariationId === v.id
                      ? "border-brand-red bg-brand-red/5 text-brand-red"
                      : "border-gray-600 text-gray-300 hover:border-gray-300"
                }`}
              >
                {v.name} &mdash; {v.soldOut ? "Sold Out" : v.formattedPrice}
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
            <h3 className="font-semibold text-sm text-gray-300 mb-2">
              {list.name}
              {hint && (
                <span className="text-gray-500 font-normal ml-1">{hint}</span>
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
                const disabled = mod.soldOut || (!isSelected && atMax && list.selectionType === "MULTIPLE");
                return (
                  <label
                    key={mod.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                      disabled
                        ? "border-gray-700 bg-gray-800 cursor-not-allowed opacity-50"
                        : isSelected
                          ? "border-brand-red bg-brand-red/5 cursor-pointer"
                          : "border-gray-600 hover:border-gray-300 cursor-pointer"
                    }`}
                  >
                    <input
                      type={
                        list.selectionType === "SINGLE" ? "radio" : "checkbox"
                      }
                      name={`modifier-${list.id}`}
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() =>
                        toggleModifier(list.id, mod.id, list.selectionType, list.maxSelected)
                      }
                      className="accent-brand-red"
                    />
                    <span className="flex-1 text-sm flex items-center gap-1.5">
                      {mod.name}
                      {(MODIFIER_LABELS[mod.name] || []).map((ml) => (
                        <Badge key={ml} variant={labelVariant(ml)} className="text-[9px] px-1.5 py-0">{ml}</Badge>
                      ))}
                    </span>
                    {mod.soldOut ? (
                      <span className="text-xs text-red-400">Sold Out</span>
                    ) : mod.price > 0 ? (
                      <span className="text-sm text-gray-500">
                        +{mod.formattedPrice}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quantity + total + add to cart */}
      {isFinite(maxStock) && maxStock <= 10 && (
        <p className="text-xs text-amber-500">{maxStock} left in stock</p>
      )}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex items-center border border-gray-600 rounded-lg">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="p-2 hover:bg-white/10 rounded-l-lg"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="px-4 py-2 text-sm font-medium min-w-[2.5rem] text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => Math.min(q + 1, maxStock))}
            disabled={quantity >= maxStock}
            className="p-2 hover:bg-white/10 rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <Button
          size="xl"
          className="flex-1"
          onClick={handleAddToCart}
          disabled={added || !canAddToCart}
        >
          {added ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              Added!
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart &mdash; {formatPrice(lineTotal)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
