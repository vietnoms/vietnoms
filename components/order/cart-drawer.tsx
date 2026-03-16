"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingBag, X } from "lucide-react";

export function CartDrawer() {
  const {
    items,
    total,
    itemCount,
    updateQuantity,
    removeItem,
    isCartOpen,
    closeCart,
  } = useCart();

  // Close on Escape key
  useEffect(() => {
    if (!isCartOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isCartOpen, closeCart]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          isCartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-surface-high z-50 shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-surface-alt">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Your Order
            {itemCount > 0 && (
              <span className="text-sm text-gray-500 font-normal">
                ({itemCount} {itemCount === 1 ? "item" : "items"})
              </span>
            )}
          </h2>
          <button
            onClick={closeCart}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart content */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-500">Your cart is empty</p>
            <p className="text-sm text-gray-400 mt-1">
              Add items from the menu to get started.
            </p>
            <Button variant="outline" className="mt-4" onClick={closeCart}>
              Browse Menu
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                      <p className="text-xs text-gray-500">
                        {item.variationName}
                      </p>
                    )}
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-gray-400">
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
                    <span className="text-sm w-6 text-center">
                      {item.quantity}
                    </span>
                    {(() => {
                      const stock = item.menuItem.variations.find(v => v.id === item.variationId)?.stockQuantity;
                      const atMax = stock != null && item.quantity >= stock;
                      return (
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          disabled={atMax}
                          className="h-6 w-6 rounded border border-gray-600 flex items-center justify-center hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => removeItem(index)}
                      className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-red-500 ml-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700/50 space-y-3">
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span className="text-brand-red">{formatPrice(total)}</span>
              </div>
              <p className="text-xs text-gray-400">
                Tax calculated at checkout.
              </p>
              <Button
                asChild
                size="lg"
                className="w-full"
                onClick={closeCart}
              >
                <Link href="/order/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
