"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export function CartSidebar() {
  const { items, total, itemCount, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="sticky top-24 bg-surface-alt rounded-lg border border-gray-700/50 p-6 text-center">
        <ShoppingBag className="h-12 w-12 text-gray-600 mx-auto" />
        <p className="mt-3 text-gray-400">Your cart is empty</p>
        <p className="text-sm text-gray-500 mt-1">
          Add items from the menu to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="sticky top-24 bg-surface-alt rounded-lg border border-gray-700/50 overflow-hidden">
      <div className="p-4 border-b border-gray-700/30 bg-surface-alt">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Your Order
          <span className="text-sm text-gray-400 font-normal">
            ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
        </h2>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={`${item.menuItem.id}-${item.variationId}-${index}`}
            className="flex gap-3 py-2 border-b border-gray-700/30 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {item.menuItem.name}
              </p>
              {item.variationName !== "Regular" && (
                <p className="text-xs text-gray-400">{item.variationName}</p>
              )}
              {item.modifiers.length > 0 && (
                <p className="text-xs text-gray-500">
                  {item.modifiers.map((m) => m.name).join(", ")}
                </p>
              )}
              <p className="text-sm font-semibold text-brand-red mt-0.5">
                {formatPrice(item.lineTotal)}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateQuantity(index, item.quantity - 1)}
                className="h-6 w-6 rounded border border-gray-600 flex items-center justify-center hover:bg-white/10"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-sm w-6 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(index, item.quantity + 1)}
                className="h-6 w-6 rounded border border-gray-600 flex items-center justify-center hover:bg-white/10"
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={() => removeItem(index)}
                className="h-6 w-6 rounded flex items-center justify-center text-gray-500 hover:text-red-500 ml-1"
                aria-label="Remove item"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700/30 space-y-3">
        <div className="flex justify-between font-semibold">
          <span>Subtotal</span>
          <span className="text-brand-red">{formatPrice(total)}</span>
        </div>
        <p className="text-xs text-gray-500">
          Tax calculated at checkout.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/order/checkout">Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  );
}
